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
 refill(s){const c=chars[s];const h=Math.min(c.horrorLimit,c.poolLimit);save(s,{horror:h,regular:c.poolLimit-h},'Refilled dice pool');},
 damage(s,n){const c=chars[s];if(c.poolLimit<=0)return;c.poolLimit-=n;clampPool(c);save(s,{poolLimit:c.poolLimit,regular:c.regular,horror:c.horror},'Took '+n+' damage'+(c.poolLimit===0?' — wounded':''));},
 heal(s,n){const c=chars[s];if(c.poolLimit>=c.poolMax)return;if(c.injuries.some(j=>j.name==='Comatose'||j.name==='Dire'))return toast('Comatose or Dire: heal that injury first.');
  if(c.injuries.some(j=>j.name==='Nasty Cut'))return toast('Nasty Cut: the pool limit can’t rise until that injury is healed.');
  const v=Math.min(c.poolMax,c.poolLimit+n);save(s,{poolLimit:v},'Healed '+(v-c.poolLimit)+' damage');},
 rest(s){const c=chars[s];if(c.poolLimit>=c.poolMax)return;if(c.injuries.some(j=>['Comatose','Dire','Nasty Cut'].includes(j.name)))return toast('An injury is stopping the pool limit from rising.');save(s,{poolLimit:c.poolMax},'Rested: pool limit restored');},
 strain(s){const c=chars[s];if(c.poolLimit>=c.poolMax)return toast('You can only strain when your pool limit is below its maximum.');
  if(c.injuries.some(j=>['Nasty Cut','Comatose','Dire'].includes(j.name)))return toast('An injury is stopping the pool limit from rising.');
  save(s,{poolLimit:c.poolMax},'Strained: pool limit restored, injury due at end of turn');toast('Pool limit restored. Roll an injury at the end of your turn.');},
 horror(s,n){const c=chars[s];const v=Math.max(0,Math.min(c.poolMax,c.horrorLimit+n));save(s,{horrorLimit:v},(n>0?'Suffered ':'Removed ')+Math.abs(v-c.horrorLimit)+' horror');if(n>0&&v>c.horror)toast('Horror dice limit is now '+v+'. Tap Refill pool to swap in horror dice.');},
 habitual(s){const c=chars[s];if(c.habitual.used)return toast('Already used a habitual item this session.');if(c.horrorLimit<=0)return toast('No horror to remove.');
  if(c.habitual.uses<=0)return toast('None left. Buy another for $1.00.');
  save(s,{horrorLimit:c.horrorLimit-1,habitual:{...c.habitual,used:true,uses:c.habitual.uses-1}},'Used '+(c.habitual.name||'habitual item')+': removed 1 horror ('+(c.habitual.uses-1)+' left)');},
 buyHabit(s){const c=chars[s];const m=Math.round(((Number(c.money)||0)-1)*100)/100;if(m<0)return toast('Not enough money. Each one costs $1.00.');
  save(s,{money:m,habitual:{...c.habitual,uses:c.habitual.uses+1}},'Bought another '+(c.habitual.name||'habitual item')+' for $1.00');},
 insight(s,n){const c=chars[s];const v=Math.max(0,Math.min(c.insightLimit,c.insight+n));save(s,{insight:v},n<0?'Spent 1 insight':null);},
 addInjury(s,nm){const c=chars[s];if(!INJURIES.some(x=>x&&x[0]===nm))return;
  const p={injuries:[...c.injuries,{id:uid(),name:nm,note:''}]};
  if(nm==='Comatose'||nm==='Dire'){c.poolLimit=0;clampPool(c);Object.assign(p,{poolLimit:0,regular:c.regular,horror:c.horror});}
  save(s,p,'Injury: '+nm);},
 addTrauma(s,nm){const c=chars[s];if(!(nm in TRAUMA_AT))return;
  const p={traumas:[{id:uid(),name:nm,note:''},...c.traumas].slice(0,10)};
  if(nm==='Mind Undone')p.traumaMod=c.traumaMod+1;
  if(nm==='Shocked'){if(c.regular+c.horror>0){if(c.regular>0)p.regular=c.regular-1;else p.horror=c.horror-1;}else p.traumaMod=c.traumaMod+1;}
  if(nm==='Stunned'){if(c.regular+c.horror>0){p.regular=0;p.horror=0;}else p.traumaMod=c.traumaMod+1;}
  save(s,p,'Trauma: '+nm);},
 lucky(s){const c=chars[s];if(c.lucky.used)return toast('Already used a lucky item this session.');if(c.insight>=c.insightLimit)return toast('Insight is already full.');
  save(s,{insight:c.insight+1,lucky:{name:c.lucky.name,used:true}},'Used '+(c.lucky.name||'lucky item')+': recovered 1 insight');},
 newSession(s,quiet){const c=chars[s];save(s,{insight:c.insightLimit,habitual:{...c.habitual,used:false},lucky:{name:c.lucky.name,used:false},traumaMod:0},quiet?null:'New session: insight refilled');},
 improve(s,k){const c=chars[s];const sk=c.skills[k];const cost=SKILL_COST[sk.r];if(!cost)return;
  const floor=sk.max?Number(sk.max):4;if(sk.r-1<floor)return toast(sk.max?'This skill is already at its max.':'Set this skill’s max (from your archetype) to go past 4+.');
  if(c.xpUnused<cost)return toast('Needs '+cost+' XP.');const sks=JSON.parse(JSON.stringify(c.skills));sks[k].r=sk.r-1;
  save(s,{skills:sks,xpUnused:c.xpUnused-cost},SKILLS.find(x=>x[0]===k)[1]+' improved to '+(sk.r-1)+'+ ('+cost+' XP)');},
 buyInsight(s){const c=chars[s];if(c.xpUnused<1)return toast('Needs 1 XP.');if(c.insightLimit>=10)return toast('Insight limit can’t go above 10.');
  save(s,{insightLimit:c.insightLimit+1,xpUnused:c.xpUnused-1,insightChance:false},'Insight limit raised to '+(c.insightLimit+1)+' (1 XP)');},
 addXp(s,n){const c=chars[s];save(s,{xpTotal:c.xpTotal+n,xpUnused:c.xpUnused+n},'Earned '+n+' XP');},
 buyKnack(s,tier){const c=chars[s];const have=c.knacks.filter(k=>Number(k.tier)===tier).length;
  if(have>=KNACK_CAP[tier])return toast('Limit reached: '+KNACK_CAP[tier]+' tier '+tier+' knack'+(KNACK_CAP[tier]>1?'s':'')+'.');
  for(let t=1;t<tier;t++)if(!c.knacks.some(k=>Number(k.tier)===t))return toast('You need a tier '+t+' knack first.');
  if(c.xpUnused<KNACK_COST[tier])return toast('Needs '+KNACK_COST[tier]+' XP.');
  save(s,{knacks:[...c.knacks,{id:uid(),tier,name:'',text:''}],xpUnused:c.xpUnused-KNACK_COST[tier]},'Bought a tier '+tier+' knack ('+KNACK_COST[tier]+' XP)');},
 ammo(s,id,i){const c=chars[s];const ws=c.weapons.map(w=>({...w}));const w=ws.find(x=>x.id===id);w.ammo=(i<w.ammo)?i:i+1;save(s,{weapons:ws});},
 reload(s,id){const c=chars[s];const ws=c.weapons.map(w=>({...w}));const w=ws.find(x=>x.id===id);if(!w)return;
  if(w.ammo>=w.ammoMax)return toast('Already fully loaded.');
  let src=null;
  if(!w.fr){if(w.reloads>0)src=w;else src=sameGuns(ws,w).find(x=>x.reloads>0)||(sharedAmmo()?ws.find(x=>x.reloads>0):null);
   if(!src)return toast(sharedAmmo()?'No extra reloads left on any gun.':'No extra reloads left for '+(w.name||'this gun')+'.');src.reloads-=1;}
  w.ammo=w.ammoMax;save(s,{weapons:ws},'Reloaded '+(w.name||'weapon')+(src&&src!==w?(gunKey(src)===gunKey(w)?' from the shared '+(w.name||'gun')+' reloads':' using a reload from '+(src.name||'another gun')):''));},
 wrel(s,id,n){const c=chars[s];const ws=c.weapons.map(w=>({...w}));const w=ws.find(x=>x.id===id);if(!w)return;
  if(n<0){const t=w.reloads>0?w:sameGuns(ws,w).find(x=>x.reloads>0);if(!t)return;t.reloads-=1;}else w.reloads=(w.reloads||0)+n;save(s,{weapons:ws});},
 money(s,d){const c=chars[s];const v=Math.round(((Number(c.money)||0)+d)*100)/100;if(v<0)return toast('Not enough money.');save(s,{money:v},(d<0?'Spent ':'Gained ')+money(Math.abs(d)));},
};
