/* Arkham Horror RPG Ledger — Clicks, edits and passcodes on the ledger pages.
   Part of the ledger; these files load in order and share their variables. */
// ---------- events ----------
document.getElementById('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;go(b.dataset.tab);});
function go(t){active=t;try{if(!IS_DEMO)localStorage.setItem(TAB_KEY,t);}catch(e){}render();window.scrollTo(0,0);}
const app=document.getElementById('app');
app.addEventListener('focusout',()=>{setTimeout(()=>{if(pending&&!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#app input,#app textarea,#app select')))render();},0);});
app.addEventListener('click',e=>{
 const gb=e.target.closest('[data-gact]');if(gb){if(!gb.disabled)gmClick(gb);return;}
 const card=e.target.closest('.pcard');if(card){go(card.dataset.tab);return;}
 if(active==='create'){const cb=e.target.closest('[data-cact]');if(cb&&!cb.disabled)creatorClick(cb);return;}
 const b=e.target.closest('[data-act]');if(!b||b.matches(':disabled'))return;const s=active,a=b.dataset.act,n=Number(b.dataset.n),c=chars[s];
 switch(a){
  case 'addslot':addSlot().then(id=>{if(id){toast(t('Added a new investigator.'));go(id);}});break;
  case 'rmslot':edit.rm=s;render();break;
  case 'rmno':edit.rm=null;render();break;
  case 'rmyes':if(edit.rm===s)removeSlot(s);break;
  case 'sessionAll':if(!isGMView())return;SLOTS.filter(gmCan).forEach(x=>R.newSession(x,true));if(isGM()){saveTable({session:(table.session||1)+1,scene:'',fight:false,phase:'',round:0});gmLog(logm('Session {n} started',{n:table.session}),false);}toast(t('New session started for everyone.'));break;
  case 'refillAll':if(!isGMView())return;SLOTS.filter(gmCan).forEach(x=>R.refill(x));toast(t('All pools refilled.'));break;
  case 'spend':R.spend(s,b.dataset.k);break;
  case 'refill':R.refill(s);break;
  case 'dmg':R.damage(s,n);break;
  case 'heal':R.heal(s,n);break;
  case 'rest':R.rest(s);break;
  case 'strain':R.strain(s);break;
  case 'hor':R.horror(s,n);break;
  case 'habit':R.habitual(s);break;
  case 'buyhabit':R.buyHabit(s);break;
  case 'habitdrop':R.dropHabit(s);break;
  case 'lucky':R.lucky(s);break;
  case 'ins':R.insight(s,n);break;
  case 'healinj':{const x=c.injuries.find(j=>j.id===b.dataset.id);save(s,{injuries:c.injuries.filter(j=>j.id!==b.dataset.id)},x?logm('Healed injury: {injury}',{injury:x.name}):logm('Healed injury'));break;}
  case 'traclear':if(!c.traumaMod)return;save(s,{traumaMod:0},logm('Cleared the trauma roll bonus'));break;
  case 'deltra':{const x=c.traumas.find(j=>j.id===b.dataset.id);const p={traumas:c.traumas.filter(j=>j.id!==b.dataset.id)};if(x&&x.mod&&c.traumaMod>0)p.traumaMod=c.traumaMod-1;save(s,p,x?logm('Cleared trauma: {trauma}',{trauma:x.name}):logm('Cleared trauma'));break;}
  case 'imp':R.improve(s,b.dataset.k);break;
  case 'xpamt':{const el=document.getElementById('xpamt-'+s);const v=Math.round(Number(el&&el.value)||xpAmt[s]||1);xpAmt[s]=Math.max(1,Math.min(30,v+n));render();break;}
  case 'xpaward':{const el=document.getElementById('xpamt-'+s);const v=Math.max(1,Math.min(30,Math.round(Number(el&&el.value)||1)));xpAmt[s]=1;R.addXp(s,v);break;}
  case 'xpfix':edit.xp=!edit.xp;render();break;
  case 'claim':{if(!CAMP||!db)break;if(!canAddSheet())return toast(t('You already have your investigator.'));const b=db.batch();b.update(db.doc('characters/'+s),{ownerUid:authUid,player:((camp&&camp.names)||{})[authUid]||c.player});if(!keys.master)b.set(db.doc('players/'+authUid),{slot:s});b.commit().then(()=>toast(t('This investigator is yours now.')),e=>{(window.quotaHit&&quotaHit(e),console.warn(e));toast(t('Couldn’t claim it ({code}). Someone may have just taken it.',{code:(e&&e.code)||'error'}));});break;}
  case 'release':{if(!CAMP||!db)break;const b=db.batch();b.update(db.doc('characters/'+s),{ownerUid:null});if(!keys.master)b.delete(db.doc('players/'+authUid));b.commit().then(()=>toast(t('You gave up this investigator. Anyone in the campaign without one can claim it.')),e=>{(window.quotaHit&&quotaHit(e),console.warn(e));toast(t('Couldn’t give it up ({code}).',{code:(e&&e.code)||'error'}));});break;}
  case 'printc':downloadSheet(c);break;
  case 'traitxp':if(edit.trait&&c.xpUnused>=2)setTrait(s,edit.trait.t,2);break;
  case 'traitfree':if(edit.trait)setTrait(s,edit.trait.t,0);break;
  case 'traitcancel':edit.trait=null;render();break;
  case 'picdel':save(s,{portrait:'',portraitFull:''},logm('Removed portrait'));break;
  case 'house':{const on=!house.on;if(!db){house.on=on;render();break;}db.doc('settings/house').set({on},{merge:true}).then(()=>toast(on?t('House rules on for the party.'):t('House rules off for the party.'))).catch(()=>toast(CAMP?t('Only the campaign owner can change house rules.'):t('Only the master key can change house rules.')));break;}
  case 'gotogm':e.preventDefault();go('gm');break;
  case 'dellog':if(!fullEdit())return;save(s,{log:(c.log||[]).filter(l=>String(l.t)!==b.dataset.n)});break;
  case 'clearlog':if(!fullEdit())return;save(s,{log:[]});toast(t('Recent history cleared.'));break;
  case 'unlock':case 'lockset':case 'lockoff':case 'forget':case 'munlock':case 'mforget':case 'gmset':case 'gmunlock':case 'gmforget':case 'gmreset':case 'gmclear':edit.gmclear=false;lockAction(a,s);break;
  case 'gmclearask':edit.gmclear=true;render();break;
  case 'gmclearno':edit.gmclear=false;render();break;
  case 'multiclass':{const sel=document.getElementById('mcpick-'+s);R.multiclass(s,sel&&sel.value);break;}
  case 'unmulticlass':if(!fullEdit())return;R.unMulticlass(s);break;
  case 'kbuy':case 'kgrant':{const sel=document.getElementById('kpick-'+s);if(!sel||!sel.value)return toast(t('Choose a knack first.'));const [ka,kn]=sel.value.includes('|')?sel.value.split('|'):[c.archetype,sel.value];const k=A.knacksFor(ka).find(x=>x.name===kn);if(!k)return;
   if(a==='kgrant'){save(s,{knacks:[...c.knacks,{id:uid(),tier:k.tier,name:k.name,text:A.knackText(k.name),arch:ka}]},logm('Added knack {knack}',{knack:k.name}));break;}
   const have=c.knacks.filter(x=>Number(x.tier)===k.tier&&knackArch(c,x)===ka).length,cap=knackCap(c,k.tier,ka);if(have>=cap)return toast(tn('Limit reached: {n} tier {tier} knack.','Limit reached: {n} tier {tier} knacks.',cap,{tier:k.tier}));
   for(let lo=1;lo<k.tier;lo++)if(!c.knacks.some(x=>Number(x.tier)===lo))return toast(t('You need a tier {tier} knack first.',{tier:lo}));
   if(c.xpUnused<KNACK_COST[k.tier])return toast(t('Needs {n} XP.',{n:KNACK_COST[k.tier]}));
   save(s,{knacks:[...c.knacks,{id:uid(),tier:k.tier,name:k.name,text:A.knackText(k.name),arch:ka}],xpUnused:c.xpUnused-KNACK_COST[k.tier]},logm('Bought {knack} ({n} XP)',{knack:k.name,n:KNACK_COST[k.tier]}));break;}
  case 'vbuy':case 'vfree':{const sel=document.getElementById('vpick-'+s);if(!sel||!sel.value)return toast(t('Choose a vehicle first.'));pickSel['v'+s]='';addGear(s,sel.value,a==='vbuy');break;}
  case 'gbuy':case 'gfree':{const sel=document.getElementById('gpick-'+s);if(!sel||!sel.value)return toast(t('Choose something to add first.'));pickSel['g'+s]='';addGear(s,sel.value,a==='gbuy');break;}
  case 'wbuy':case 'wfree':{const sel=document.getElementById('wpick-'+s);if(!sel||!sel.value)return toast(t('Choose a weapon first.'));pickSel['w'+s]='';addGear(s,sel.value,a==='wbuy');break;}
  case 'buyrel':{const w=c.weapons.find(x=>x.id===b.dataset.id);if(!w||!w.rc)return;const m=Math.round(((Number(c.money)||0)-w.rc)*100)/100;if(m<0)return toast(t('Not enough money.'));save(s,{money:m,weapons:c.weapons.map(x=>x.id===w.id?{...x,reloads:(x.reloads||0)+1}:x)},logm('Bought an extra reload for {weapon} ({price})',{weapon:w.name||tk('a gun'),price:money(w.rc)}));break;}
  case 'buyins':R.buyInsight(s);break;
  case 'skipins':save(s,{insightChance:false});break;
  case 'addfree':save(s,{knacks:[...c.knacks,{id:uid(),tier:1,name:'',text:''}]});break;
  case 'del':{const l=b.dataset.list;const x=c[l].find(y=>y.id===b.dataset.id);if(!x)break;save(s,{[l]:c[l].filter(y=>y.id!==x.id)},x.name?(l==='weapons'?logm('Removed weapon: {weapon}',{weapon:x.name}):l==='knacks'?logm('Removed knack: {knack}',{knack:x.name}):logm('Removed item: {item}',{item:x.name})):(l==='weapons'?logm('Removed weapon'):l==='knacks'?logm('Removed knack'):logm('Removed item')));break;}
  case 'addw':save(s,{weapons:[...c.weapons,{id:uid(),name:'',skill:'',range:'',dmg:'',inj:'',ammoMax:0,ammo:0,reloads:0,special:''}]});break;
  case 'addi':save(s,{items:[...c.items,{id:uid(),name:'',note:''}]});break;
  case 'ammo':R.ammo(s,b.dataset.id,n);break;
  case 'kitmark':R.kitMark(s,b.dataset.id,n);break;
  case 'kitfill':R.kitFill(s,b.dataset.id,true);break;
  case 'kitfree':R.kitFill(s,b.dataset.id,false);break;
  case 'kitbuy':case 'kitadd':{const sel=document.getElementById('kitpick-'+s);if(!sel||!sel.value)return toast(t('Choose one first.'));pickSel['k'+s]='';addGear(s,sel.value,a==='kitbuy');break;}
  case 'addkit':save(s,{kits:[...c.kits,{id:uid(),name:'',note:'',uses:3,left:3,rp:1,c:0,once:false}]});break;
  case 'reload':R.reload(s,b.dataset.id);break;
  case 'wrel':R.wrel(s,b.dataset.id,n);break;
  case 'cash':R.money(s,n);break;
  case 'cashset':{const el=document.getElementById('cash-'+s);if(el.value==='')return toast(t('Enter an amount first.'));const v=Math.round(Math.max(0,Number(el.value)||0)*100)/100;const old=Number(c.money)||0;if(v===old)return toast(t('Money is already {amount}.',{amount:money(v)}));save(s,{money:v},logm('Set money: {from} → {to}',{from:money(old),to:money(v)}));break;}
  case 'cashin':case 'cashout':{const el=document.getElementById('cash-'+s);const v=Math.abs(Number(el.value)||0);if(!v)return toast(t('Enter an amount first.'));R.money(s,a==='cashin'?v:-v);break;}
  case 'session':R.newSession(s);toast(t('New session: insight refilled, habitual and lucky items ready.'));break;
 }
});
app.addEventListener('change',e=>{
 const el=e.target,s=active;
 if(gmChange(el))return;
 if(el.dataset.assign){const sl=el.dataset.assign,u=el.value||null,old=chars[sl]&&chars[sl].ownerUid;if(CAMP&&db&&keys.master){const b=db.batch();b.update(db.doc('characters/'+sl),{ownerUid:u,...(u?{player:((camp&&camp.names)||{})[u]||''}:{})});if(old&&old!==u&&old!==camp.ownerUid)b.delete(db.doc('players/'+old));if(u&&u!==camp.ownerUid)b.set(db.doc('players/'+u),{slot:sl});b.commit().then(()=>toast(u?t('Assigned to {name}.',{name:(camp.names||{})[u]||t('them')}):t('Now unclaimed.')),()=>toast(t('Couldn’t change that.')));}return;}
 if(el.dataset.pic){const f=el.files&&el.files[0];if(!f)return;if(!/^image\//.test(f.type))return toast(t('Choose an image file.'));
  openCrop(f,s);el.value='';return;}
 if(el.dataset.xpamt){xpAmt[s]=Math.max(1,Math.min(30,Math.round(Number(el.value)||1)));return;}
 if(el.dataset.pick){pickSel[el.dataset.pick+s]=el.value;if(el.dataset.pick!=='w')render();return;}
 if(el.dataset.kpick){kpickSel[el.dataset.kpick==='cr'?'cr':s]=el.value;return;}
 if(s==='create'){
  if(el.dataset.cf){const p=el.dataset.cf;if(p.startsWith('bg.'))cr.bg={...cr.bg,[p.slice(3)]:el.value};else{cr[p]=el.value;if(p==='archetype'){cr.freeKnack='';cr.bought=[];cr.ups={};}if(p==='slot')cr.confirm=false;}}
  else if(el.dataset.cbonus){cr.bonus=el.dataset.cbonus;if(cr.bonus!=='xp'){cr.ups={};cr.bought=[];}if(cr.bonus!=='money'&&crMoneySpent()>crMoneyBudget())toast(t('Your gear now costs more than $50. Remove something.'));}
  else if(el.dataset.cconfirm){cr.confirm=el.checked;}
  else return;
  crSave();render();return;
 }
 if(el.dataset.addinj||el.dataset.addtra){const v=el.value;if(!v||!chars[s])return;if(el.dataset.addinj)R.addInjury(s,v);else R.addTrauma(s,v);el.value='';return;}
 const c=chars[s];if(!c)return;
 if(el.dataset.trait){const t=el.value;if(c.personality&&A.TRAITS[c.personality]&&t&&t!==c.personality){edit.trait={s,t};render();}else setTrait(s,t,0);return;}
 if(el.dataset.f){const p=el.dataset.f;let v=el.value;
  if(p==='xpTotal'||p==='xpUnused'){v=Math.max(0,parseInt(v)||0);const old=Number(c[p])||0;if(v===old)return;save(s,{[p]:v},p==='xpTotal'?logm('Fixed total XP: {from} → {to}',{from:old,to:v}):logm('Fixed unused XP: {from} → {to}',{from:old,to:v}));return;}
  if(p==='archetype'&&v){const sks=JSON.parse(JSON.stringify(c.skills));SKILLS.forEach(([k])=>{sks[k].max=archMax(c,k,v);});save(s,{archetype:v,skills:sks});return;}
  if(/^(habitual|lucky)\.name$/.test(p))v=I18N.back(v);
  if(p.includes('.')){const [a,k]=p.split('.');const o={...c[a],[k]:v};save(s,{[a]:o});}else save(s,{[p]:v});return;}
 if(el.dataset.skmax){const sks=JSON.parse(JSON.stringify(c.skills));sks[el.dataset.skmax].max=el.value;save(s,{skills:sks});return;}
 if(el.dataset.skr){const sks=JSON.parse(JSON.stringify(c.skills));sks[el.dataset.skr].r=Number(el.value);save(s,{skills:sks});return;}
 if(el.dataset.list){const l=el.dataset.list;const arr=c[l].map(x=>({...x}));const it=arr.find(x=>x.id===el.dataset.id);if(!it)return;let v=el.value;
  if(l==='kits'&&el.dataset.key==='uses'){v=Math.max(0,Math.min(12,parseInt(v)||0));it.left=it.uses?Math.min(it.left,v):v;}
  if(l==='kits'&&(el.dataset.key==='rp'||el.dataset.key==='c'))v=Math.max(0,Math.round((parseFloat(v)||0)*100)/100);
  if(el.dataset.key==='ammoMax'){v=Math.max(0,Math.min(12,parseInt(v)||0));it.ammo=Math.min(it.ammo,v);if(it.ammoMax===0)it.ammo=v;}
  // a name or note shown translated and then edited goes back to the book's English if it still matches one
  if(/^(name|text|note|skill|range|special)$/.test(el.dataset.key))v=I18N.back(v);
  it[el.dataset.key]=v;if(l==='knacks'&&el.dataset.key==='name'&&!it.text)it.text=A.knackText(v);save(s,{[l]:arr});}
});

// ---------- passcodes ----------
async function grant(slot,code){await db.doc('grants/'+authUid+'/keys/'+slot).set({slot,code});}
async function lockAction(a,s){
 if(!db||!authUid)return toast(t('Still connecting. Try again in a moment.'));
 const val=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
 try{
  if(a==='unlock'){const code=val('unlock-'+s);if(!code)return toast(t('Enter the passcode.'));await grant(s,code);toast(t('Unlocked on this device.'));}
  else if(a==='munlock'){const code=val('mkey');if(!code)return toast(t('Enter the master key.'));await grant('master',code);toast(t('Master key active on this device.'));}
  else if(a==='lockset'){const code=val('lockset-'+s);if(code.length<4)return toast(t('Use at least 4 characters.'));
   await db.doc('locks/'+s).set({code});await grant(s,code);if(!chars[s].locked)await db.doc('characters/'+s).update({locked:true});toast(chars[s].locked?t('Passcode set.'):t('Passcode changed.'));}
  else if(a==='lockoff'){await db.doc('characters/'+s).update({locked:false});await db.doc('locks/'+s).delete();await db.doc('grants/'+authUid+'/keys/'+s).delete().catch(()=>{});toast(t('Passcode removed. Anyone can edit this sheet.'));}
  else if(a==='forget'){await db.doc('grants/'+authUid+'/keys/'+s).delete();toast(t('This device needs the passcode again to edit.'));}
  else if(a==='gmset'){const code=val('gmpin');if(code.length<4)return toast(t('Use at least 4 characters.'));
   await db.doc('locks/gm').set({code});await grant('gm',code);await db.doc('settings/gm').set({set:true});gmLog(gmClaimed?logm('GM PIN changed'):logm('GM PIN set'),false);toast(gmClaimed?t('GM PIN changed.'):t('GM PIN set. The GM tools are unlocked on this device.'));}
  else if(a==='gmunlock'){const code=val('gmpin');if(!code)return toast(t('Enter the GM PIN.'));await grant('gm',code);toast(t('GM tools unlocked on this device.'));}
  else if(a==='gmforget'){await db.doc('grants/'+authUid+'/keys/gm').delete();toast(t('GM PIN removed from this device.'));}
  else if(a==='gmclear'){gmLog(logm('GM PIN removed'),false);await db.doc('settings/gm').set({set:false});await db.doc('locks/gm').delete();await db.doc('grants/'+authUid+'/keys/gm').delete().catch(()=>{});toast(t('GM PIN removed. The next GM can set their own.'));}
  else if(a==='gmreset'){await db.doc('settings/gm').set({set:false});await db.doc('locks/gm').delete();toast(t('GM PIN cleared. The GM can choose a new one.'));}
  else if(a==='mforget'){await db.doc('grants/'+authUid+'/keys/master').delete();toast(t('Master key removed from this device.'));}
 }catch(e){const code=(e&&e.code)||'unknown';console.warn('lock action failed',a,e);toast(code==='permission-denied'?(a==='munlock'?t('That master key isn’t right.'):a==='unlock'?t('Wrong passcode.'):a==='gmunlock'?t('That GM PIN isn’t right.'):a==='gmset'&&gmClaimed&&!isGM()?t('A GM PIN is already set.'):t('Firebase refused that change (permission-denied). Check that the rules are up to date.')):t('Couldn’t do that ({code}). Try again.',{code}));}
}
function watchKeys(){
 db.collection('grants/'+authUid+'/keys').onSnapshot(qs=>{Object.keys(keys).forEach(k=>delete keys[k]);qs.forEach(d=>{keys[d.id]=true;});keysReady=true;saveCache();gmMasterState=null;gmSubscribe();render();},
  ()=>{keysReady=true;[...SLOTS,'master','gm'].forEach(k=>{db.doc('grants/'+authUid+'/keys/'+k).onSnapshot(snap=>{keys[k]=snap.exists;render();},()=>{keys[k]=false;});});});
}
