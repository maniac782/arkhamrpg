/* Arkham Ledger — Clicks, edits and passcodes on the ledger pages.
   Part of the ledger; these files load in order and share their variables. */
// ---------- events ----------
document.getElementById('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;go(b.dataset.tab);});
function go(t){active=t;try{localStorage.setItem(TAB_KEY,t);}catch(e){}render();window.scrollTo(0,0);}
const app=document.getElementById('app');
app.addEventListener('focusout',()=>{setTimeout(()=>{if(pending&&!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#app input,#app textarea,#app select')))render();},0);});
app.addEventListener('click',e=>{
 const gb=e.target.closest('[data-gact]');if(gb){if(!gb.disabled)gmClick(gb);return;}
 const card=e.target.closest('.pcard');if(card){go(card.dataset.tab);return;}
 if(active==='create'){const cb=e.target.closest('[data-cact]');if(cb&&!cb.disabled)creatorClick(cb);return;}
 const b=e.target.closest('[data-act]');if(!b||b.matches(':disabled'))return;const s=active,a=b.dataset.act,n=Number(b.dataset.n),c=chars[s];
 switch(a){
  case 'addslot':addSlot().then(id=>{if(id){toast('Added a new investigator.');go(id);}});break;
  case 'rmslot':edit.rm=s;render();break;
  case 'rmno':edit.rm=null;render();break;
  case 'rmyes':if(edit.rm===s)removeSlot(s);break;
  case 'sessionAll':if(!isGMView())return;SLOTS.filter(gmCan).forEach(x=>R.newSession(x,true));if(isGM()){saveTable({session:(table.session||1)+1,scene:'',fight:false,phase:'',round:0});gmLog('Session '+table.session+' started',false);}toast('New session started for everyone.');break;
  case 'refillAll':if(!isGMView())return;SLOTS.filter(gmCan).forEach(x=>R.refill(x));toast('All pools refilled.');break;
  case 'spend':R.spend(s,b.dataset.k);break;
  case 'refill':R.refill(s);break;
  case 'dmg':R.damage(s,n);break;
  case 'heal':R.heal(s,n);break;
  case 'rest':R.rest(s);break;
  case 'strain':R.strain(s);break;
  case 'hor':R.horror(s,n);break;
  case 'habit':R.habitual(s);break;
  case 'buyhabit':R.buyHabit(s);break;
  case 'lucky':R.lucky(s);break;
  case 'ins':R.insight(s,n);break;
  case 'healinj':{const x=c.injuries.find(j=>j.id===b.dataset.id);save(s,{injuries:c.injuries.filter(j=>j.id!==b.dataset.id)},'Healed injury'+(x?': '+x.name:''));break;}
  case 'deltra':{const x=c.traumas.find(j=>j.id===b.dataset.id);save(s,{traumas:c.traumas.filter(j=>j.id!==b.dataset.id)},'Cleared trauma'+(x?': '+x.name:''));break;}
  case 'imp':R.improve(s,b.dataset.k);break;
  case 'xpamt':{const el=document.getElementById('xpamt-'+s);const v=Math.round(Number(el&&el.value)||xpAmt[s]||1);xpAmt[s]=Math.max(1,Math.min(30,v+n));render();break;}
  case 'xpaward':{const el=document.getElementById('xpamt-'+s);const v=Math.max(1,Math.min(30,Math.round(Number(el&&el.value)||1)));xpAmt[s]=1;R.addXp(s,v);break;}
  case 'xpfix':edit.xp=!edit.xp;render();break;
  case 'claim':{if(!CAMP||!db)break;if(!canAddSheet())return toast('You already have your investigator.');const b=db.batch();b.update(db.doc('characters/'+s),{ownerUid:authUid,player:((camp&&camp.names)||{})[authUid]||c.player});if(!keys.master)b.set(db.doc('players/'+authUid),{slot:s});b.commit().then(()=>toast('This investigator is yours now.'),e=>{(window.quotaHit&&quotaHit(e),console.warn(e));toast('Couldn\u2019t claim it ('+((e&&e.code)||'error')+'). Someone may have just taken it.');});break;}
  case 'release':{if(!CAMP||!db)break;const b=db.batch();b.update(db.doc('characters/'+s),{ownerUid:null});if(!keys.master)b.delete(db.doc('players/'+authUid));b.commit().then(()=>toast('You gave up this investigator. Anyone in the campaign without one can claim it.'),e=>{(window.quotaHit&&quotaHit(e),console.warn(e));toast('Couldn\u2019t give it up ('+((e&&e.code)||'error')+').');});break;}
  case 'printc':downloadSheet(c);break;
  case 'traitxp':if(edit.trait&&c.xpUnused>=2)setTrait(s,edit.trait.t,2);break;
  case 'traitfree':if(edit.trait)setTrait(s,edit.trait.t,0);break;
  case 'traitcancel':edit.trait=null;render();break;
  case 'picdel':save(s,{portrait:''},'Removed portrait');break;
  case 'house':{const on=!house.on;if(!db){house.on=on;render();break;}db.doc('settings/house').set({on},{merge:true}).then(()=>toast('House rules '+(on?'on':'off')+' for the party.')).catch(()=>toast('Only the '+(CAMP?'campaign owner':'master key')+' can change house rules.'));break;}
  case 'dellog':if(!keys.master||!ownerEditsOn())return;save(s,{log:(c.log||[]).filter(l=>String(l.t)!==b.dataset.n)});break;
  case 'clearlog':if(!keys.master||!ownerEditsOn())return;save(s,{log:[]});toast('Recent history cleared.');break;
  case 'unlock':case 'lockset':case 'lockoff':case 'forget':case 'munlock':case 'mforget':case 'gmset':case 'gmunlock':case 'gmforget':case 'gmreset':case 'gmclear':edit.gmclear=false;lockAction(a,s);break;
  case 'gmclearask':edit.gmclear=true;render();break;
  case 'gmclearno':edit.gmclear=false;render();break;
  case 'kbuy':case 'kgrant':{const sel=document.getElementById('kpick-'+s);if(!sel||!sel.value)return toast('Choose a knack first.');const k=A.knacksFor(c.archetype).find(x=>x.name===sel.value);if(!k)return;
   if(a==='kgrant'){save(s,{knacks:[...c.knacks,{id:uid(),tier:k.tier,name:k.name,text:A.knackText(k.name)}]},'Added knack '+k.name);break;}
   const have=c.knacks.filter(x=>Number(x.tier)===k.tier).length;if(have>=KNACK_CAP[k.tier])return toast('Limit reached: '+KNACK_CAP[k.tier]+' tier '+k.tier+' knack'+(KNACK_CAP[k.tier]>1?'s':'')+'.');
   for(let t=1;t<k.tier;t++)if(!c.knacks.some(x=>Number(x.tier)===t))return toast('You need a tier '+t+' knack first.');
   if(c.xpUnused<KNACK_COST[k.tier])return toast('Needs '+KNACK_COST[k.tier]+' XP.');
   save(s,{knacks:[...c.knacks,{id:uid(),tier:k.tier,name:k.name,text:A.knackText(k.name)}],xpUnused:c.xpUnused-KNACK_COST[k.tier]},'Bought '+k.name+' ('+KNACK_COST[k.tier]+' XP)');break;}
  case 'vbuy':case 'vfree':{const sel=document.getElementById('vpick-'+s);if(!sel||!sel.value)return toast('Choose a vehicle first.');pickSel['v'+s]='';addGear(s,sel.value,a==='vbuy');break;}
  case 'gbuy':case 'gfree':{const sel=document.getElementById('gpick-'+s);if(!sel||!sel.value)return toast('Choose something to add first.');pickSel['g'+s]='';addGear(s,sel.value,a==='gbuy');break;}
  case 'wbuy':case 'wfree':{const sel=document.getElementById('wpick-'+s);if(!sel||!sel.value)return toast('Choose a weapon first.');pickSel['w'+s]='';addGear(s,sel.value,a==='wbuy');break;}
  case 'buyrel':{const w=c.weapons.find(x=>x.id===b.dataset.id);if(!w||!w.rc)return;const m=Math.round(((Number(c.money)||0)-w.rc)*100)/100;if(m<0)return toast('Not enough money.');save(s,{money:m,weapons:c.weapons.map(x=>x.id===w.id?{...x,reloads:(x.reloads||0)+1}:x)},'Bought an extra reload for '+(w.name||'a gun')+' ('+money(w.rc)+')');break;}
  case 'buyins':R.buyInsight(s);break;
  case 'skipins':save(s,{insightChance:false});break;
  case 'addfree':save(s,{knacks:[...c.knacks,{id:uid(),tier:1,name:'',text:''}]});break;
  case 'del':{const l=b.dataset.list;const x=c[l].find(y=>y.id===b.dataset.id);if(!x)break;const kind={weapons:'weapon',knacks:'knack',items:'item'}[l]||'entry';save(s,{[l]:c[l].filter(y=>y.id!==x.id)},'Removed '+kind+(x.name?': '+x.name:''));break;}
  case 'addw':save(s,{weapons:[...c.weapons,{id:uid(),name:'',skill:'',range:'',dmg:'',inj:'',ammoMax:0,ammo:0,reloads:0,special:''}]});break;
  case 'addi':save(s,{items:[...c.items,{id:uid(),name:'',note:''}]});break;
  case 'ammo':R.ammo(s,b.dataset.id,n);break;
  case 'reload':R.reload(s,b.dataset.id);break;
  case 'wrel':R.wrel(s,b.dataset.id,n);break;
  case 'cash':R.money(s,n);break;
  case 'cashset':{const el=document.getElementById('cash-'+s);if(el.value==='')return toast('Enter an amount first.');const v=Math.round(Math.max(0,Number(el.value)||0)*100)/100;const old=Number(c.money)||0;if(v===old)return toast('Money is already '+money(v)+'.');save(s,{money:v},'Set money: '+money(old)+' \u2192 '+money(v));break;}
  case 'cashin':case 'cashout':{const el=document.getElementById('cash-'+s);const v=Math.abs(Number(el.value)||0);if(!v)return toast('Enter an amount first.');R.money(s,a==='cashin'?v:-v);break;}
  case 'session':R.newSession(s);toast('New session: insight refilled, habitual and lucky items ready.');break;
 }
});
app.addEventListener('change',e=>{
 const el=e.target,s=active;
 if(gmChange(el))return;
 if(el.dataset.assign){const t=el.dataset.assign,u=el.value||null,old=chars[t]&&chars[t].ownerUid;if(CAMP&&db&&keys.master){const b=db.batch();b.update(db.doc('characters/'+t),{ownerUid:u,...(u?{player:((camp&&camp.names)||{})[u]||''}:{})});if(old&&old!==u&&old!==camp.ownerUid)b.delete(db.doc('players/'+old));if(u&&u!==camp.ownerUid)b.set(db.doc('players/'+u),{slot:t});b.commit().then(()=>toast(u?'Assigned to '+((camp.names||{})[u]||'them')+'.':'Now unclaimed.'),()=>toast('Couldn\u2019t change that.'));}return;}
 if(el.dataset.pic){const f=el.files&&el.files[0];if(!f)return;if(!/^image\//.test(f.type))return toast('Choose an image file.');
  openCrop(f,s);el.value='';return;}
 if(el.dataset.xpamt){xpAmt[s]=Math.max(1,Math.min(30,Math.round(Number(el.value)||1)));return;}
 if(el.dataset.pick){pickSel[el.dataset.pick+s]=el.value;return;}
 if(el.dataset.kpick){kpickSel[el.dataset.kpick==='cr'?'cr':s]=el.value;return;}
 if(s==='create'){
  if(el.dataset.cf){const p=el.dataset.cf;if(p.startsWith('bg.'))cr.bg={...cr.bg,[p.slice(3)]:el.value};else{cr[p]=el.value;if(p==='archetype'){cr.freeKnack='';cr.bought=[];cr.ups={};}if(p==='slot')cr.confirm=false;}}
  else if(el.dataset.cbonus){cr.bonus=el.dataset.cbonus;if(cr.bonus!=='xp'){cr.ups={};cr.bought=[];}if(cr.bonus!=='money'&&crMoneySpent()>crMoneyBudget())toast('Your gear now costs more than $50. Remove something.');}
  else if(el.dataset.cconfirm){cr.confirm=el.checked;}
  else return;
  crSave();render();return;
 }
 if(el.dataset.addinj||el.dataset.addtra){const v=el.value;if(!v||!chars[s])return;if(el.dataset.addinj)R.addInjury(s,v);else R.addTrauma(s,v);el.value='';return;}
 const c=chars[s];if(!c)return;
 if(el.dataset.trait){const t=el.value;if(c.personality&&A.TRAITS[c.personality]&&t&&t!==c.personality){edit.trait={s,t};render();}else setTrait(s,t,0);return;}
 if(el.dataset.f){const p=el.dataset.f;let v=el.value;
  if(p==='xpTotal'||p==='xpUnused'){v=Math.max(0,parseInt(v)||0);const old=Number(c[p])||0;if(v===old)return;save(s,{[p]:v},'Fixed '+(p==='xpTotal'?'total':'unused')+' XP: '+old+' \u2192 '+v);return;}
  if(p==='archetype'&&v){const sks=JSON.parse(JSON.stringify(c.skills));SKILLS.forEach(([k])=>{const f=A.maxFor(v,k);sks[k].max=f<4?String(f):'';});save(s,{archetype:v,skills:sks});return;}
  if(p.includes('.')){const [a,k]=p.split('.');const o={...c[a],[k]:v};save(s,{[a]:o});}else save(s,{[p]:v});return;}
 if(el.dataset.skmax){const sks=JSON.parse(JSON.stringify(c.skills));sks[el.dataset.skmax].max=el.value;save(s,{skills:sks});return;}
 if(el.dataset.skr){const sks=JSON.parse(JSON.stringify(c.skills));sks[el.dataset.skr].r=Number(el.value);save(s,{skills:sks});return;}
 if(el.dataset.list){const l=el.dataset.list;const arr=c[l].map(x=>({...x}));const it=arr.find(x=>x.id===el.dataset.id);if(!it)return;let v=el.value;
  if(el.dataset.key==='ammoMax'){v=Math.max(0,Math.min(12,parseInt(v)||0));it.ammo=Math.min(it.ammo,v);if(it.ammoMax===0)it.ammo=v;}
  it[el.dataset.key]=v;if(l==='knacks'&&el.dataset.key==='name'&&!it.text)it.text=A.knackText(v);save(s,{[l]:arr});}
});

// ---------- passcodes ----------
async function grant(slot,code){await db.doc('grants/'+authUid+'/keys/'+slot).set({slot,code});}
async function lockAction(a,s){
 if(!db||!authUid)return toast('Still connecting. Try again in a moment.');
 const val=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
 try{
  if(a==='unlock'){const code=val('unlock-'+s);if(!code)return toast('Enter the passcode.');await grant(s,code);toast('Unlocked on this device.');}
  else if(a==='munlock'){const code=val('mkey');if(!code)return toast('Enter the master key.');await grant('master',code);toast('Master key active on this device.');}
  else if(a==='lockset'){const code=val('lockset-'+s);if(code.length<4)return toast('Use at least 4 characters.');
   await db.doc('locks/'+s).set({code});await grant(s,code);if(!chars[s].locked)await db.doc('characters/'+s).update({locked:true});toast(chars[s].locked?'Passcode set.':'Passcode changed.');}
  else if(a==='lockoff'){await db.doc('characters/'+s).update({locked:false});await db.doc('locks/'+s).delete();await db.doc('grants/'+authUid+'/keys/'+s).delete().catch(()=>{});toast('Passcode removed. Anyone can edit this sheet.');}
  else if(a==='forget'){await db.doc('grants/'+authUid+'/keys/'+s).delete();toast('This device needs the passcode again to edit.');}
  else if(a==='gmset'){const code=val('gmpin');if(code.length<4)return toast('Use at least 4 characters.');
   await db.doc('locks/gm').set({code});await grant('gm',code);await db.doc('settings/gm').set({set:true});gmLog(gmClaimed?'GM PIN changed':'GM PIN set',false);toast(gmClaimed?'GM PIN changed.':'GM PIN set. The GM tools are unlocked on this device.');}
  else if(a==='gmunlock'){const code=val('gmpin');if(!code)return toast('Enter the GM PIN.');await grant('gm',code);toast('GM tools unlocked on this device.');}
  else if(a==='gmforget'){await db.doc('grants/'+authUid+'/keys/gm').delete();toast('GM PIN removed from this device.');}
  else if(a==='gmclear'){gmLog('GM PIN removed',false);await db.doc('settings/gm').set({set:false});await db.doc('locks/gm').delete();await db.doc('grants/'+authUid+'/keys/gm').delete().catch(()=>{});toast('GM PIN removed. The next GM can set their own.');}
  else if(a==='gmreset'){await db.doc('settings/gm').set({set:false});await db.doc('locks/gm').delete();toast('GM PIN cleared. The GM can choose a new one.');}
  else if(a==='mforget'){await db.doc('grants/'+authUid+'/keys/master').delete();toast('Master key removed from this device.');}
 }catch(e){const code=(e&&e.code)||'unknown';console.warn('lock action failed',a,e);toast(code==='permission-denied'?(a==='munlock'?'That master key isn\u2019t right.':a==='unlock'?'Wrong passcode.':a==='gmunlock'?'That GM PIN isn\u2019t right.':a==='gmset'&&gmClaimed&&!isGM()?'A GM PIN is already set.':'Firebase refused that change (permission-denied). Check the site says v104 and the rules are up to date.'):'Couldn\u2019t do that ('+code+'). Try again.');}
}
function watchKeys(){
 db.collection('grants/'+authUid+'/keys').onSnapshot(qs=>{Object.keys(keys).forEach(k=>delete keys[k]);qs.forEach(d=>{keys[d.id]=true;});keysReady=true;saveCache();gmMasterState=null;gmSubscribe();render();},
  ()=>{keysReady=true;[...SLOTS,'master','gm'].forEach(k=>{db.doc('grants/'+authUid+'/keys/'+k).onSnapshot(snap=>{keys[k]=snap.exists;render();},()=>{keys[k]=false;});});});
}
