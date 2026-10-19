/* Arkham Horror RPG Ledger — Game rules applied to a sheet: pools, damage, healing, injuries, traumas, insight, XP, gear.
   Part of the ledger; these files load in order and share their variables. */
// ---------- rules ----------
function clampPool(c){
 c.poolLimit=Math.max(0,Math.min(c.poolLimit,c.poolMax));
 let total=c.regular+c.horror;
 while(total>c.poolLimit){ if(c.regular>0)c.regular--; else c.horror--; total--; }
}
const R={
 spend(s,kind){const c=chars[s];if(kind==='hor'&&c.horror>0)return save(s,{horror:c.horror-1});if(kind==='reg'&&c.regular>0)return save(s,{regular:c.regular-1});},
 refill(s){const c=chars[s];const h=Math.min(c.horrorLimit,c.poolLimit);save(s,{horror:h,regular:c.poolLimit-h},logm('Refilled dice pool'));},
 damage(s,n){const c=chars[s];if(c.poolLimit<=0)return;c.poolLimit-=n;clampPool(c);save(s,{poolLimit:c.poolLimit,regular:c.regular,horror:c.horror},c.poolLimit===0?logn('Took {n} damage — wounded','Took {n} damage — wounded',n):logn('Took {n} damage','Took {n} damage',n));},
 heal(s,n){const c=chars[s];if(c.poolLimit>=c.poolMax)return;if(c.injuries.some(j=>j.name==='Comatose'||j.name==='Dire'))return toast(t('Comatose or Dire: heal that injury first.'));
  if(c.injuries.some(j=>j.name==='Nasty Cut'))return toast(t('Nasty Cut: the pool limit can’t rise until that injury is healed.'));
  const v=Math.min(c.poolMax,c.poolLimit+n);save(s,{poolLimit:v},logn('Healed {n} damage','Healed {n} damage',v-c.poolLimit));},
 rest(s){const c=chars[s];if(c.poolLimit>=c.poolMax)return;if(c.injuries.some(j=>['Comatose','Dire','Nasty Cut'].includes(j.name)))return toast(t('An injury is stopping the pool limit from rising.'));save(s,{poolLimit:c.poolMax},logm('Rested: pool limit restored'));},
 strain(s){const c=chars[s];if(c.poolLimit>=c.poolMax)return toast(t('You can only strain when your pool limit is below its maximum.'));
  if(c.injuries.some(j=>['Nasty Cut','Comatose','Dire'].includes(j.name)))return toast(t('An injury is stopping the pool limit from rising.'));
  save(s,{poolLimit:c.poolMax},logm('Strained: pool limit restored, injury due at end of turn'));toast(t('Pool limit restored. Roll an injury at the end of your turn.'));},
 horror(s,n){const c=chars[s];const v=Math.max(0,Math.min(c.poolMax,c.horrorLimit+n));save(s,{horrorLimit:v},n>0?logn('Suffered {n} horror','Suffered {n} horror',Math.abs(v-c.horrorLimit)):logn('Removed {n} horror','Removed {n} horror',Math.abs(v-c.horrorLimit)));if(n>0&&v>c.horror)toast(t('Horror dice limit is now {n}. Tap Refill pool to swap in horror dice.',{n:v}));},
 habitual(s){const c=chars[s];if(c.habitual.used)return toast(t('Already used a habitual item this session.'));if(c.horrorLimit<=0)return toast(t('No horror to remove.'));
  if(c.habitual.uses<=0)return toast(t('None left. Buy another for $1.00.'));
  save(s,{horrorLimit:c.horrorLimit-1,habitual:{...c.habitual,used:true,uses:c.habitual.uses-1}},logm('Used {item}: removed 1 horror ({n} left)',{item:c.habitual.name||tk('habitual item'),n:c.habitual.uses-1}));},
 buyHabit(s){const c=chars[s];const m=Math.round(((Number(c.money)||0)-1)*100)/100;if(m<0)return toast(t('Not enough money. Each one costs $1.00.'));
  save(s,{money:m,habitual:{...c.habitual,uses:c.habitual.uses+1}},logm('Bought another {item} for $1.00',{item:c.habitual.name||tk('habitual item')}));},
 insight(s,n){const c=chars[s];const v=Math.max(0,Math.min(c.insightLimit,c.insight+n));save(s,{insight:v},n<0?logm('Spent 1 insight'):null);},
 addInjury(s,nm){const c=chars[s];if(!injuryInfo(nm))return;
  const p={injuries:[...c.injuries,{id:uid(),name:nm,note:''}]};
  // A third instance of the same unique injury (Burned, Choking, Sickened) kills.
  if(isUniqueInjury(nm)&&c.injuries.filter(j=>j.name===nm).length>=2&&!c.injuries.some(j=>j.name==='Dead')){p.injuries.push({id:uid(),name:'Dead',note:''});toast(t('A third {injury} injury is fatal.',{injury:t(nm)}));}
  if(nm==='Comatose'||nm==='Dire'){c.poolLimit=0;clampPool(c);Object.assign(p,{poolLimit:0,regular:c.regular,horror:c.horror});}
  save(s,p,logm('Injury: {injury}',{injury:nm}));},
 addTrauma(s,nm){const c=chars[s];if(!(nm in TRAUMA_AT))return;
  const p={traumas:[{id:uid(),name:nm,note:''},...c.traumas].slice(0,10)};
  if(nm==='Mind Undone')p.traumaMod=c.traumaMod+1;
  if(nm==='Shocked'){if(c.regular+c.horror>0){if(c.regular>0)p.regular=c.regular-1;else p.horror=c.horror-1;}else p.traumaMod=c.traumaMod+1;}
  if(nm==='Stunned'){if(c.regular+c.horror>0){p.regular=0;p.horror=0;}else p.traumaMod=c.traumaMod+1;}
  save(s,p,logm('Trauma: {trauma}',{trauma:nm}));},
 lucky(s){const c=chars[s];if(c.lucky.used)return toast(t('Already used a lucky item this session.'));if(c.insight>=c.insightLimit)return toast(t('Insight is already full.'));
  save(s,{insight:c.insight+1,lucky:{name:c.lucky.name,used:true}},logm('Used {item}: recovered 1 insight',{item:c.lucky.name||tk('lucky item')}));},
 newSession(s,quiet){const c=chars[s];save(s,{insight:c.insightLimit,habitual:{...c.habitual,used:false},lucky:{name:c.lucky.name,used:false},traumaMod:0},quiet?null:logm('New session: insight refilled'));},
 improve(s,k){const c=chars[s];const sk=c.skills[k];const cost=SKILL_COST[sk.r];if(!cost)return;
  const floor=sk.max?Number(sk.max):4;if(sk.r-1<floor)return toast(sk.max?t('This skill is already at its max.'):t('Set this skill’s max (from your archetype) to go past 4+.'));
  if(c.xpUnused<cost)return toast(t('Needs {n} XP.',{n:cost}));const sks=JSON.parse(JSON.stringify(c.skills));sks[k].r=sk.r-1;
  save(s,{skills:sks,xpUnused:c.xpUnused-cost},logm('{skill} improved to {r}+ ({n} XP)',{skill:SKILLS.find(x=>x[0]===k)[1],r:sk.r-1,n:cost}));},
 buyInsight(s){const c=chars[s];if(c.xpUnused<1)return toast(t('Needs 1 XP.'));if(c.insightLimit>=10)return toast(t('Insight limit can’t go above 10.'));
  save(s,{insightLimit:c.insightLimit+1,xpUnused:c.xpUnused-1,insightChance:false},logm('Insight limit raised to {n} (1 XP)',{n:c.insightLimit+1}));},
 addXp(s,n){const c=chars[s];save(s,{xpTotal:c.xpTotal+n,xpUnused:c.xpUnused+n},logm('Earned {n} XP',{n}));},
 multiclass(s,arch){const c=chars[s];if(c.mc)return;if(!arch||!A.ARCH[arch])return toast(t('Choose an archetype first.'));
  if(xpSpent(c)<MC_AT)return toast(t('Multiclassing opens once {n} XP has been spent.',{n:MC_AT}));
  if(c.xpUnused<MC_COST)return toast(t('Needs {n} XP.',{n:MC_COST}));
  const p={mc:{arch,at:Date.now()},xpUnused:c.xpUnused-MC_COST,poolMax:c.poolMax+1,poolLimit:c.poolLimit+(c.poolLimit>=c.poolMax?1:0)};
  // The new archetype's skill limits only ever loosen a skill's max; the old maxes are kept so Undo can restore them.
  if(arch!==c.archetype){const sks=JSON.parse(JSON.stringify(c.skills)),prev={};SKILLS.forEach(([k])=>{prev[k]=sks[k].max||'';const now=sks[k].max?Number(sks[k].max):4,f=Math.min(now,A.maxFor(arch,k));sks[k].max=f<4?String(f):'';});p.skills=sks;p.mc.prev=prev;}
  save(s,p,arch===c.archetype?logm('Multiclassed within {trait} (20 XP): dice pool max {n}, more knacks',{trait:c.archetype,n:p.poolMax}):logm('Multiclassed into {trait} (20 XP): dice pool max {n}',{trait:arch,n:p.poolMax}));},
 unMulticlass(s){const c=chars[s];if(!c.mc)return;const was=c.mc.arch;
  const p={mc:null,xpUnused:c.xpUnused+MC_COST,poolMax:Math.max(1,c.poolMax-1)};p.poolLimit=Math.min(c.poolLimit,p.poolMax);
  if(was!==c.archetype&&c.mc.prev){const sks=JSON.parse(JSON.stringify(c.skills));SKILLS.forEach(([k])=>{if(k in c.mc.prev)sks[k].max=c.mc.prev[k];});p.skills=sks;}
  c.poolLimit=p.poolLimit;c.poolMax=p.poolMax;clampPool(c);p.regular=c.regular;p.horror=c.horror;
  save(s,p,logm('Undid multiclassing (20 XP back): dice pool max {n}',{n:p.poolMax}));},
 buyKnack(s,tier){const c=chars[s];const have=c.knacks.filter(k=>Number(k.tier)===tier&&knackArch(c,k)===c.archetype).length;const cap=knackCap(c,tier,c.archetype);
  if(have>=cap)return toast(tn('Limit reached: {n} tier {tier} knack.','Limit reached: {n} tier {tier} knacks.',cap,{tier}));
  for(let lo=1;lo<tier;lo++)if(!c.knacks.some(k=>Number(k.tier)===lo))return toast(t('You need a tier {tier} knack first.',{tier:lo}));
  if(c.xpUnused<KNACK_COST[tier])return toast(t('Needs {n} XP.',{n:KNACK_COST[tier]}));
  save(s,{knacks:[...c.knacks,{id:uid(),tier,name:'',text:''}],xpUnused:c.xpUnused-KNACK_COST[tier]},logm('Bought a tier {tier} knack ({n} XP)',{tier,n:KNACK_COST[tier]}));},
 dropHabit(s){const c=chars[s];if(!(c.habitual.uses>0))return;
  save(s,{habitual:{...c.habitual,uses:c.habitual.uses-1}},logm('Removed one {item} ({n} left)',{item:c.habitual.name||tk('habitual item'),n:c.habitual.uses-1}));},
 kitMark(s,id,i){const c=chars[s];const ks=c.kits.map(k=>({...k}));const k=ks.find(x=>x.id===id);if(!k)return;const was=k.left;k.left=(i<k.left)?i:i+1;
  save(s,{kits:ks},k.left<was?(k.left===0?logm('Used the last of {item}',{item:k.name||tk('a kit')}):logm('Marked a use of {item} ({n} left)',{item:k.name||tk('a kit'),n:k.left})):null);},
 kitFill(s,id,pay){const c=chars[s];const ks=c.kits.map(k=>({...k}));const k=ks.find(x=>x.id===id);if(!k)return;
  if(k.left>=k.uses)return toast(t('It’s already full.'));
  const cost=pay?(k.once?k.c:k.rp)||0:0;const m=Math.round(((Number(c.money)||0)-cost)*100)/100;if(m<0)return toast(t('Not enough money.'));
  k.left=k.uses;save(s,{kits:ks,money:m},!pay?logm('Refilled {item}',{item:k.name||tk('a kit')}):k.once?logm('Bought a new {item} for {price}',{item:k.name||tk('kit'),price:money(cost)}):logm('Replenished {item} for {price}',{item:k.name||tk('a kit'),price:money(cost)}));},
 ammo(s,id,i){const c=chars[s];const ws=c.weapons.map(w=>({...w}));const w=ws.find(x=>x.id===id);w.ammo=(i<w.ammo)?i:i+1;save(s,{weapons:ws});},
 reload(s,id){const c=chars[s];const ws=c.weapons.map(w=>({...w}));const w=ws.find(x=>x.id===id);if(!w)return;
  if(w.ammo>=w.ammoMax)return toast(t('Already fully loaded.'));
  let src=null;
  if(!w.fr){if(w.reloads>0)src=w;else src=sameGuns(ws,w).find(x=>x.reloads>0)||(sharedAmmo()?ws.find(x=>x.reloads>0):null);
   if(!src)return toast(sharedAmmo()?t('No extra reloads left on any gun.'):t('No extra reloads left for {weapon}.',{weapon:w.name?t(w.name):t('this gun')}));src.reloads-=1;}
  w.ammo=w.ammoMax;save(s,{weapons:ws},src&&src!==w?(gunKey(src)===gunKey(w)?logm('Reloaded {weapon} from the shared reloads',{weapon:w.name||tk('gun')}):logm('Reloaded {weapon} using a reload from {src}',{weapon:w.name||tk('weapon'),src:src.name||tk('another gun')})):logm('Reloaded {weapon}',{weapon:w.name||tk('weapon')}));},
 wrel(s,id,n){const c=chars[s];const ws=c.weapons.map(w=>({...w}));const w=ws.find(x=>x.id===id);if(!w)return;
  if(n<0){const g=w.reloads>0?w:sameGuns(ws,w).find(x=>x.reloads>0);if(!g)return;g.reloads-=1;}else w.reloads=(w.reloads||0)+n;save(s,{weapons:ws});},
 money(s,d){const c=chars[s];const v=Math.round(((Number(c.money)||0)+d)*100)/100;if(v<0)return toast(t('Not enough money.'));save(s,{money:v},d<0?logm('Spent {amount}',{amount:money(Math.abs(d))}):logm('Gained {amount}',{amount:money(Math.abs(d))}));},
};
