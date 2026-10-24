/* Arkham Horror RPG Ledger — Game Master tools: scene and turns, enemies, dice roller, clues, campaign tracker, wrap-up, recap, Journal and GM pages.
   Part of the ledger; these files load in order and share their variables. */
// ---------- game master: table state, enemies, clues, campaign, notes, history ----------
// The Core Rulebook's enemy profiles are only offered to a signed-in GM of a real campaign, not in the sample on the
// welcome page or the no-account campaign; players never see the profiles.
const BOOK_NPCS=!IS_LOCAL;
const NPCS=BOOK_NPCS?(window.APL_NPCS||[]):[],NPC_TRAUMAS=window.APL_NPC_TRAUMAS||[];
let table={scene:'',fight:false,phase:'',round:0,first:'investigators',session:1,auto:true};
try{const k=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(k&&k.table)table={...table,...k.table};}catch(e){}
let enemies={},clues={},campaign={date:'',locations:[],npcs:[],threads:[]},gmNotes='',histLog=[],historySession=null;
const gm={open:{},roll:null,rollN:4,rollT:4,rollH:0,rollMod:0,fightFirst:'investigators',fightSurprise:'none',addN:BOOK_NPCS?'':'__custom',addName:'',addType:'Minor',addCount:1,addScale:false,clueImg:'',clueTo:'all',recap:null,wrap:{}};
let gmUnsubs=[],gmMasterState=null;
// GM tools are off while the campaign is marked complete (it's a read-only record).
const isGM=()=>localMode||(!!keys.gm&&gmClaimed&&!campDone());
let keysReady=false,gmFlagReady=false;
const isGMView=()=>CAMP?isGM():(isGM()||!!keys.master);
const gmId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
async function gmSet(path,data,merge){if(!db)return;try{await db.doc(path).set(data,merge?{merge:true}:undefined);}catch(e){toast(e&&e.code==='permission-denied'?t('Firebase refused that. Publish the updated rules (see README) and use the master key.'):t('Couldn’t save that. Try again.'));}}
async function gmDel(path){if(!db)return;try{await db.doc(path).delete();}catch(e){toast(t('Couldn’t delete that. Try again.'));}}
function saveTable(p){Object.assign(table,p);render();gmSet('table/state',{...table});}
let gmLogList=[];
// GM activity: private log (gmlog), plus public story beats that go into the session recap
function gmLog(m,pub){if(typeof m==='string')m={m};const e={id:gmId(),...m,t:Date.now(),session:table.session||1};gmLogList=[e,...gmLogList].slice(0,40);
 const {id,...doc}=e;gmSet('gmlog/'+id,doc);
 if(pub)gmStory(m);render();}
function gmStory(m){if(typeof m==='string')m={m};const e={t:Date.now(),session:table.session||1};{const h={slot:'gm',name:'The story',...m,t:e.t,session:e.session};if(historySession===h.session){histLog=[...histLog,h];render();}if(db)db.collection('history').add(h).catch(()=>{});}}
const recapGroups=(list=histLog)=>{const story=t('The story'),by={};list.forEach(x=>{const n=x.slot==='gm'?story:(x.name||x.slot);(by[n]=by[n]||[]).push(x);});return Object.entries(by).sort((a,b)=>(b[0]===story)-(a[0]===story));};
function logHistory(slot,m){if(typeof m==='string')m={m};const c=chars[slot];const h={slot,name:(c&&c.name)||'',...m,t:m.t||Date.now(),session:table.session||1};
 if(historySession===h.session)histLog=[...histLog,h];
 if(typeof fullHist!=='undefined'&&fullHist[slot]&&fullHist[slot].list)fullHist[slot].list=[h,...fullHist[slot].list];
 if(typeof histCache!=='undefined'&&histCache[slot]&&histCache[slot].list)histCache[slot].list.push(h);
 if(db)db.collection('history').add(h).catch(()=>{});}

// subscriptions that depend on whether this device holds the master key
function gmSubscribe(){
 if(!db)return;const m=isGMView();if(m===gmMasterState)return;gmMasterState=m;
 gmUnsubs.forEach(u=>{try{u();}catch(e){}});gmUnsubs=[];
 const eq=m?db.collection('enemies'):db.collection('enemies').where('shown','==',true);
 gmUnsubs.push(eq.onSnapshot(qs=>{enemies={};qs.forEach(d=>{enemies[d.id]={...d.data(),id:d.id};});render();},()=>{}));
 if(m){gmUnsubs.push(db.collection('clues').onSnapshot(qs=>{clues={};qs.forEach(d=>{clues[d.id]={...d.data(),id:d.id};});render();},()=>{}));
  gmUnsubs.push(db.collection('gmlog').orderBy('t','desc').limit(40).onSnapshot(qs=>{gmLogList=[];qs.forEach(d=>gmLogList.push({...d.data(),id:d.id}));render();},()=>{}));
  gmUnsubs.push(db.doc('gm/notes').onSnapshot(s=>{gmNotes=(s.exists&&s.data().text)||'';render();},()=>{}));}
 else{const got={};const put=()=>{clues={};Object.values(got).forEach(o=>Object.assign(clues,o));render();};
  const q=(k,ref)=>gmUnsubs.push(ref.onSnapshot(qs=>{got[k]={};qs.forEach(d=>{got[k][d.id]={...d.data(),id:d.id};});put();},()=>{}));
  q('all',db.collection('clues').where('shown','==',true).where('to','==','all'));
  SLOTS.filter(s=>canEdit(s)).forEach(s=>q(s,db.collection('clues').where('shown','==',true).where('to','==',s)));}
}
function gmBoot(){
 if(!db)return;
 db.doc('table/state').onSnapshot(s=>{if(s.exists)table={...table,...s.data()};render();saveCache();},()=>{});
 db.doc('campaign/main').onSnapshot(s=>{if(s.exists)campaign={date:'',locations:[],npcs:[],threads:[],...s.data()};render();},()=>{});
 gmSubscribe();
 galBoot();
}
// The Journal's own copy of a finished session's recap (separate from the GM tab's picker).
let jSession=null,jLog=[];
async function loadJournalRecap(n){jSession=n;jLog=[];render();
 if(!db)return;try{const qs=await db.collection('history').where('session','==',n).get();const a=[];qs.forEach(d=>{const x=d.data();if(histAlive(x))a.push(x);});if(jSession===n){jLog=a.sort((x,y)=>x.t-y.t);render();}}catch(e){}}
const summaryOf=n=>String(((campaign.summaries||{})[n])||'').trim();
async function loadRecap(n){historySession=n;histLog=[];render();
 if(!db)return;try{const qs=await db.collection('history').where('session','==',n).get();const a=[];qs.forEach(d=>{const x=d.data();if(histAlive(x))a.push(x);});histLog=a.sort((x,y)=>x.t-y.t);render();}catch(e){toast(t('Couldn’t load that session. Publish the updated rules (see README).'));}}

// ---------- turn tracker ----------
function turnBar(){if(campDone())return '';
 if(!table.scene&&!table.fight)return '';
 const ph=table.phase==='surprise'?t('Surprise round'):table.phase==='investigators'?t('Investigators’ turn'):table.phase==='adversaries'?t('Adversaries’ turn'):'';
 return '<div class="turnbar'+(table.phase==='adversaries'?' adv':'')+'" role="status"><span>'+(table.scene?'<b>'+esc(table.scene)+'</b>':'')+(table.fight?' <span class="chip warn">'+(table.phase==='surprise'?t('Fight · surprise round'):t('Fight · round {n}',{n:Math.max(1,table.round)}))+'</span>':' <span class="chip">'+t('Narrative scene')+'</span>')+'</span>'+(ph?'<span class="ph">'+ph+'</span>':'')+'</div>';
}
function refillChar(s,n){const c=chars[s];if(!c||!gmCan(s))return;const cur=c.regular+c.horror;const want=n==null?c.poolLimit:Math.min(c.poolLimit,cur+n);if(want<=cur&&n!=null)return;
 let h=Math.min(c.horrorLimit,want),r=want-h;if(n!=null){h=Math.max(c.horror,Math.min(c.horrorLimit,c.horror+(want-cur)));r=want-h;}
 save(s,{horror:h,regular:r});}
function refillEnemy(e,n){const cur=e.regular+e.horror;const want=n==null?e.limit:Math.min(e.limit,cur+n);let h=Math.min(e.horrorLimit||0,want);if(n!=null)h=Math.max(e.horror,Math.min(e.horrorLimit||0,e.horror+Math.max(0,want-cur)));
 updEnemy(e.id,{horror:h,regular:Math.max(0,want-h)});}
function refillSide(side,n){if(side==='investigators')SLOTS.forEach(s=>refillChar(s,n));else Object.values(enemies).filter(e=>!e.out).forEach(e=>refillEnemy(e,n));}
function startFight(){const first=gm.fightFirst,sur=gm.fightSurprise;
 if(sur!=='none'){const other=sur==='investigators'?'adversaries':'investigators';if(table.auto)refillSide(other,1);saveTable({fight:true,phase:'surprise',round:0,first});gmLog(sur==='investigators'?logm('Fight started: the investigators were surprised'):logm('Fight started: the adversaries were surprised'),true);toast(other==='investigators'?t('Surprise round: investigators add 1 die. The surprised side doesn’t refill.'):t('Surprise round: adversaries add 1 die. The surprised side doesn’t refill.'));}
 else{if(table.auto)refillSide(first);saveTable({fight:true,phase:first,round:1,first});gmLog(first==='investigators'?logm('Fight started: investigators go first'):logm('Fight started: adversaries go first'),true);}}
function nextTurn(){let ph,round=table.round;
 if(table.phase==='surprise'){ph=table.first;round=1;}
 else{ph=table.phase==='investigators'?'adversaries':'investigators';if(ph===table.first)round++;}
 if(table.auto)refillSide(ph);if(round!==table.round)gmLog(logm('Round {n}',{n:round}),false);saveTable({phase:ph,round});}

// ---------- enemies ----------
function npcProfile(n){return NPCS.find(x=>x.n===n);}
const ENEMY_TYPES=['Minor','Major','Monstrous','Named'];
// A picture for an enemy or a person met: a small square on the card, tap to see it whole.
function picHtml(pic,full,name){return imgOk(pic)?'<img class="sqpic" src="'+pic+'" alt="'+esc(name||'')+'" data-zoom'+(imgOk(full)?' data-full="'+full+'"':'')+' title="'+t('See the full picture')+'">':'';}
function picPicker(kind,id,has){return '<label class="btn sm" for="pk-'+kind+'-'+id+'" style="display:inline-flex;align-items:center;cursor:pointer">'+(has?t('Change picture'):t('Add a picture'))+'</label><input type="file" id="pk-'+kind+'-'+id+'" accept="image/*" data-gpic="'+kind+'" data-id="'+id+'" hidden>'+(has?'<button class="btn sm" data-gact="picdel" data-kind="'+kind+'" data-id="'+id+'">'+t('Remove picture')+'</button>':'');}
// Crop a picture, upload it to the campaign, and hand back {pic, picFull}.
function gmPicture(f,done){openCropper(f,{title:t('Position the picture'),shape:'square',outW:320,outH:320,maxLen:120000,full:{side:1600,maxLen:900000},onError:toast,onSave:(d,full)=>{toast(t('Saving picture…'));const at='campaigns/'+CAMP+'/'+authUid;
 Promise.all([storeImage(d,at),full?storeImage(full,at):null]).then(([u,fu])=>{if(!isStoredImage(u)&&!IS_LOCAL)return toast(t('Couldn’t upload the picture. Check your connection and try again.'));done({pic:u,picFull:isStoredImage(fu)?fu:''});});}});}
function addEnemies(){const p=npcProfile(gm.addN);const count=Math.max(1,Math.min(12,Number(gm.addCount)||1));
 const base=p?p.pool:4;const pool=gm.addScale?Math.min(8,base+SLOTS.length):base;
 // Number them only when there's more than one of the same name: the first Swamp devil is just "Swamp devil".
 const nm0=p?p.n:(String(gm.addName||'').trim().slice(0,60)||tk('Enemy'));
 const same=new RegExp('^'+nm0.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'( \\d+)?$');
 const existing=Object.values(enemies).filter(e=>same.test(e.n)).length;
 for(let i=0;i<count;i++){const id=gmId()+i;const hl=(p&&p.horror)||0;
  const cn=String(gm.addName||'').trim().slice(0,60);
  const e={id,base:p?p.n:t('Custom enemy'),n:(p?p.n:(cn||tk('Enemy')))+(count>1||existing?' '+(existing+i+1):''),type:p?p.type:(gm.addType||'Minor'),max:pool,limit:pool,regular:pool-Math.min(hl,pool),horror:Math.min(hl,pool),horrorLimit:hl,injuries:[],traumas:[],strained:false,out:false,shown:false,t:Date.now()+i,note:''};
  enemies[id]=e;gmSet('enemies/'+id,e);}
 const cn=String(gm.addName||'').trim();gmLog(logm('Added {n} × {enemy}',{n:count,enemy:p?p.n:(cn||tk('custom enemy'))}),false);gm.addCount=1;gm.addName='';render();toast(t('Added {n} × {enemy}.',{n:count,enemy:p?t(p.n):(cn||t('enemy'))}));}
function updEnemy(id,p){const e=enemies[id];if(!e)return;Object.assign(e,p);render();gmSet('enemies/'+id,p,true);}
function enemyClamp(e){e.limit=Math.max(0,Math.min(e.max,e.limit));let over=e.regular+e.horror-e.limit;while(over>0&&e.regular>0){e.regular--;over--;}while(over>0&&e.horror>0){e.horror--;over--;}}
function enemyDamage(e,n){if(e.out)return;e.limit-=n;enemyClamp(e);const p={limit:e.limit,regular:e.regular,horror:e.horror};
 if(e.limit===0){if(e.type==='Minor'){p.out=true;toast(t('{enemy} is out: killed or knocked unconscious (your call).',{enemy:nameT(e.n)}));}
  else if(e.type==='Major'||e.type==='Monstrous'){if(e.strained){p.out=true;toast(t('{enemy} is out: killed or knocked unconscious (your call).',{enemy:nameT(e.n)}));}else toast(t('{enemy} is wounded. As a Major NPC it can strain once to get its pool back.',{enemy:nameT(e.n)}));}
  else toast(t('{enemy} is wounded.',{enemy:nameT(e.n)}));}
 gmLog(p.out?logn('{enemy} took {n} damage and is out','{enemy} took {n} damage and is out',n,{enemy:e.n}):e.limit===0?logn('{enemy} took {n} damage and is wounded','{enemy} took {n} damage and is wounded',n,{enemy:e.n}):logn('{enemy} took {n} damage','{enemy} took {n} damage',n,{enemy:e.n}),false);if(p.out&&e.shown)gmStory(logm('{enemy} was taken down',{enemy:e.n}));
 updEnemy(e.id,p);}
// An enemy's status, in the same words as investigators. Nothing shows while it is unhurt.
// An enemy card can stand for a group: qty encountered, killed defeated (older cards: 1, and all of them if marked dead).
const eQty=e=>Math.max(1,Number(e.qty)||1);
const eKilled=e=>Math.min(eQty(e),Math.max(0,e.killed!=null?Number(e.killed)||0:(e.dead?eQty(e):0)));
// "3 encountered · 2 defeated" for a group (a single enemy just gets its Dead tag).
function tallyText(qty,killed){qty=Math.max(1,qty||1);if(qty<2)return '';return [qty>1?tn('{n} encountered','{n} encountered',qty):'',killed?tn('{n} defeated','{n} defeated',killed):''].filter(Boolean).join(' · ');}
// Set how many there are and how many are dead; keeps the campaign's record (and the Journal) in step.
function setTally(id,qty,killed){const e=enemies[id];if(!e)return;qty=Math.max(1,Math.min(99,qty));killed=Math.max(0,Math.min(qty,killed));
 const was=eKilled(e),dead=killed>=qty;updEnemy(id,{qty,killed,dead,out:dead?true:(e.dead&&!dead?false:e.out)});
 let d=(campaign.defeated||[]).filter(x=>x.id!==id);if(killed>0)d=[...d,{id,n:e.n,type:e.type,pic:e.pic||'',picFull:e.picFull||'',session:table.session||1,at:((campaign.defeated||[]).find(x=>x.id===id)||{}).at||Date.now(),qty,killed}];
 campaign.defeated=d;saveCampaign();
 if(killed>was)gmStory(killed-was>1||qty>1?logm('Defeated {n} × {enemy}',{n:killed-was,enemy:e.n}):logm('Defeated {enemy}',{enemy:e.n}));}
function enemyStatus(e){
 if(e.dead)return['bad',t('Dead')];
 if(e.out)return['bad',t('Out')];
 if(e.limit===0)return['bad',t('Wounded')];
 if(e.injuries.length)return['inj',t('Injured')];
 if(e.limit<e.max)return['warn',t('Damaged')];
 return null;
}
// What everyone sees in the Journal: just the picture, the name and whether it's down. The GM tab has the rest.
function enemyBrief(e){const st=enemyStatus(e),ty=tallyText(eQty(e),eKilled(e));return '<div class="item" style="align-items:center">'+picHtml(e.pic,e.picFull,nameT(e.n))+'<div class="grow"><b>'+esc(nameT(e.n))+'</b>'+(ty?'<span class="effect">'+ty+'</span>':'')+'</div>'+(st&&(e.dead||e.out)?'<span class="chip '+st[0]+'">'+st[1]+'</span>':'')+'</div>';}
function enemyHtml(e){
 const p=npcProfile(e.base);const open=!!gm.open[e.id];const master=isGM();
 const pc={regular:e.regular,horror:e.horror,poolLimit:e.limit,poolMax:e.max,horrorLimit:e.horrorLimit||0};
 let h='<div class="enemy'+(e.out?' out':'')+'"><div class="row" style="justify-content:space-between;align-items:center"><div class="row" style="gap:8px;align-items:center">'+
  picHtml(e.pic,e.picFull,nameT(e.n))+(master?'<input class="f" id="en-'+e.id+'" data-gen="'+e.id+'" data-k="n" value="'+esc(nameT(e.n))+'" style="font-weight:700;max-width:220px">':'<b>'+esc(nameT(e.n))+'</b>')+
  (()=>{const st=enemyStatus(e);return st?'<span class="chip '+st[0]+'">'+st[1]+'</span>':'';})()+'<span class="note">'+esc(e.type==='Named'?t('Named'):t(e.type+' NPC'))+'</span>'+(master&&e.shown?'<span class="chip ok" title="'+t('Players can see this enemy')+'">'+t('Shown')+'</span>':'')+'</div>'+
  (master?'<div class="row" style="gap:6px"><button class="btn sm" data-gact="eshow" data-id="'+e.id+'">'+(e.shown?t('Hide from players'):t('Show to players'))+'</button><button class="btn sm icon" data-gact="edel" data-id="'+e.id+'" aria-label="'+t('Remove {name}',{name:esc(nameT(e.n))})+'">×</button></div>':'')+'</div>'+
  poolHtml(pc,true)+
  '<div class="note">'+t('Pool {n} / limit {limit} / max {max}',{n:e.regular+e.horror,limit:e.limit,max:e.max})+(e.horrorLimit?' · '+t('horror limit {n}',{n:e.horrorLimit}):'')+(e.injuries.length?' · '+e.injuries.map(x=>esc(t(x))).join(', '):'')+(e.traumas.length?' · <b>'+e.traumas.map(x=>esc(t(x))).join(', ')+'</b>':'')+'</div>';
 if(master){
  h+='<div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-gact="espend" data-id="'+e.id+'" '+(e.regular+e.horror?'':'disabled')+'>'+t('Spend a die')+'</button><button class="btn sm" data-gact="erefill" data-id="'+e.id+'">'+t('Refill')+'</button>'+
   '<button class="btn sm dng" data-gact="edmg" data-id="'+e.id+'" '+(e.out||!e.limit?'disabled':'')+'>'+t('Take damage')+'</button><button class="btn sm" data-gact="eheal" data-id="'+e.id+'" '+(e.limit<e.max?'':'disabled')+'>'+t('Heal')+'</button>'+
   ((e.type==='Major'||e.type==='Monstrous')&&!e.strained?'<button class="btn sm" data-gact="estrain" data-id="'+e.id+'" '+(e.limit<e.max&&!e.out?'':'disabled')+'>'+t('Strain (once)')+'</button>':'')+
   '<span class="stepper"><span class="note">'+t('Max')+'</span><button class="btn sm icon" data-gact="emax" data-n="-1" data-id="'+e.id+'" aria-label="'+t('Smaller pool')+'">−</button><b class="num">'+e.max+'</b><button class="btn sm icon" data-gact="emax" data-n="1" data-id="'+e.id+'" aria-label="'+t('Bigger pool')+'">+</button></span>'+
   '<span class="stepper"><span class="note">'+t('Horror limit')+'</span><button class="btn sm icon" data-gact="ehl" data-n="-1" data-id="'+e.id+'" aria-label="'+t('Lower horror limit')+'">−</button><b class="num">'+(e.horrorLimit||0)+'</b><button class="btn sm icon" data-gact="ehl" data-n="1" data-id="'+e.id+'" aria-label="'+t('Raise horror limit')+'">+</button></span>'+
   (e.out&&!e.dead?'<button class="btn sm" data-gact="eback" data-id="'+e.id+'">'+t('Back in the fight')+'</button>':'')+
   '<span class="stepper"><span class="note">'+t('Encountered')+'</span><button class="btn sm icon" data-gact="eqty" data-n="-1" data-id="'+e.id+'" aria-label="'+t('One fewer')+'" '+(eQty(e)>1?'':'disabled')+'>−</button><b class="num">'+eQty(e)+'</b><button class="btn sm icon" data-gact="eqty" data-n="1" data-id="'+e.id+'" aria-label="'+t('One more')+'">+</button></span>'+
   '<span class="stepper"><span class="note">'+t('Defeated')+'</span><button class="btn sm icon" data-gact="ekill" data-n="-1" data-id="'+e.id+'" aria-label="'+t('One fewer')+'" '+(eKilled(e)>0?'':'disabled')+'>−</button><b class="num">'+eKilled(e)+'</b><button class="btn sm icon" data-gact="ekill" data-n="1" data-id="'+e.id+'" aria-label="'+t('One more')+'" '+(eKilled(e)<eQty(e)?'':'disabled')+'>+</button></span>'+
   (e.dead?'<button class="btn sm" data-gact="eundead" data-id="'+e.id+'">'+t('Not dead after all')+'</button>':'<button class="btn sm dng" data-gact="edead" data-id="'+e.id+'">'+(eQty(e)>1?t('Mark all dead'):t('Mark dead'))+'</button>')+'</div>'+
   '<div class="row" style="gap:6px"><select class="maxsel" data-geinj="'+e.id+'" aria-label="'+t('Add an injury to {name}',{name:esc(nameT(e.n))})+'" style="flex:1;min-width:0"><option value="">'+t('Add an injury…')+'</option>'+injuryOptions()+'</select>'+
   '<select class="maxsel" data-getra="'+e.id+'" aria-label="'+t('Add a trauma to {name}',{name:esc(nameT(e.n))})+'" style="flex:1;min-width:0"><option value="">'+t('NPC trauma…')+'</option>'+NPC_TRAUMAS.map(x=>'<option value="'+esc(x[1])+'">'+x[0]+' · '+esc(t(x[1]))+'</option>').join('')+'</select>'+
   ((e.injuries.length||e.traumas.length)?'<button class="btn sm" data-gact="eclear" data-id="'+e.id+'">'+t('Clear injuries &amp; traumas')+'</button>':'')+'</div>'+
   '<div class="row" style="gap:6px;align-items:flex-end"><label class="field" style="width:150px"><span class="lbl">'+t('Type')+'</span><select class="f" id="et-'+e.id+'" data-gen="'+e.id+'" data-k="type">'+ENEMY_TYPES.map(x=>'<option value="'+x+'"'+(e.type===x?' selected':'')+'>'+(x==='Named'?t('Named'):t(x+' NPC'))+'</option>').join('')+'</select></label>'+picPicker('e',e.id,imgOk(e.pic))+'</div>'+
   '<label class="field"><span class="lbl">'+t('GM notes (attacks, special rules…)')+'</span><textarea class="f" id="enote-'+e.id+'" data-gen="'+e.id+'" data-k="note" rows="2">'+esc(e.note||'')+'</textarea></label>';
 }
 if(p&&master)h+='<button class="btn sm linkish" data-gact="eopen" data-id="'+e.id+'" aria-expanded="'+open+'">'+(open?t('Hide profile'):t('Show profile'))+'</button>';
 if(p&&open&&master)h+=npcProfileHtml(p,e);
 return h+'</div>';
}
function npcProfileHtml(p,e){
 const SK=[t('Agility'),t('Athletics'),t('Wits'),t('Presence'),t('Intuition'),t('Knowledge'),t('Resolve'),t('Melee'),t('Ranged'),t('Lore')];
 let h='<div class="npcp"><div class="skgrid">'+SK.map((k,i)=>'<span><small>'+t(k)+'</small><b>'+(p.sk[i]?p.sk[i]+'+':'—')+'</b></span>').join('')+'</div>';
 if(p.atk&&p.atk.length)h+='<div><span class="lbl">'+t('Attacks')+'</span>'+p.atk.map(a=>'<div class="note"><b>'+esc(t(a[0]))+'</b> · '+esc(t(a[1]))+' · '+t('dmg {n}',{n:a[2]})+' · '+t('injury {n}',{n:a[3]||'–'})+' · '+esc(t(a[4]))+(a[5]?' · '+esc(t(a[5])):'')+'</div>').join('')+'</div>';
 if(p.ab&&p.ab.length)h+='<div><span class="lbl">'+t('Abilities')+'</span>'+p.ab.map(a=>'<div class="note"><b>'+esc(t(a[0]))+'.</b> '+esc(t(a[1]))+'</div>').join('')+'</div>';
 if(p.wk&&p.wk.length)h+='<div><span class="lbl">'+t('Weaknesses')+'</span>'+p.wk.map(a=>'<div class="note"><b>'+esc(t(a[0]))+'.</b> '+esc(t(a[1]))+'</div>').join('')+'</div>';
 if(p.gear)h+='<div class="note"><b>'+t('Gear.')+'</b> '+esc(t(p.gear))+'</div>';
 return h+'</div>';
}

// ---------- hidden dice roller ----------
function rollDice(){const n=Math.max(1,Math.min(20,Number(gm.rollN)||1)),t=Math.max(2,Math.min(6,Number(gm.rollT)||4)),hz=Math.max(0,Math.min(n,Number(gm.rollH)||0)),mod=Number(gm.rollMod)||0;
 const dice=[];for(let i=0;i<n;i++){const v=1+Math.floor(Math.random()*6);dice.push({v,h:i<hz,s:Math.max(1,Math.min(6,v+mod))>=t});}
 gm.roll={dice,t,mod,succ:dice.filter(d=>d.s).length,ones:dice.filter(d=>d.v===1).length,hones:dice.filter(d=>d.h&&d.v===1).length,sixes:dice.filter(d=>d.v===6).length};render();}

// ---------- clues ----------
function clueHtml(c,master){
 const to=c.to&&c.to!=='all'?(chars[c.to]?chars[c.to].name:t('one investigator')):'';
 return '<div class="clue'+(master&&!c.shown?' draft':'')+'"'+(master?'':' data-clue-id="'+esc(c.id||'')+'"')+'>'+(master?'<div class="row" style="justify-content:space-between"><span class="chip'+(c.shown?' ok':'')+'">'+(c.shown?t('Revealed'):t('Not revealed yet'))+'</span><div class="row" style="gap:6px"><button class="btn sm'+(c.shown?'':' pri')+'" data-gact="cshow" data-id="'+c.id+'">'+(c.shown?t('Hide again'):t('Reveal'))+'</button><button class="btn sm icon" data-gact="cdel" data-id="'+c.id+'" aria-label="'+t('Delete clue')+'">×</button></div></div>':'')+
  '<h3>'+esc(c.title||t('Untitled'))+'</h3>'+(to?'<div class="note">'+t('For {name}',{name:esc(to)})+'</div>':'')+(c.img?'<img src="'+c.img+'" alt="'+esc(c.title||t('Handout'))+'" class="handout" data-zoom>':'')+(c.body?'<p style="white-space:pre-wrap;margin:6px 0 0">'+esc(c.body)+'</p>':'')+'</div>';
}
function pickClueImage(f){if(!f||!/^image\//.test(f.type))return toast(t('Choose an image file.'));const url=URL.createObjectURL(f);const img=new Image();
 img.onload=()=>{let w=img.naturalWidth,h=img.naturalHeight,s=Math.min(1,1200/Math.max(w,h));const cv=document.createElement('canvas');
  let q=0.82,d='';for(let k=0;k<6;k++){cv.width=Math.round(w*s);cv.height=Math.round(h*s);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);d=cv.toDataURL('image/jpeg',q);if(d.length<900000)break;s*=0.8;q-=0.05;}
  URL.revokeObjectURL(url);gm.clueImg=d;render();};img.onerror=()=>toast(t('Couldn’t read that image.'));img.src=url;}
const clueName=c=>c.title||(c.body||'').slice(0,40)||tk('picture');
const clueWho=c=>c.to==='all'?tk('everyone'):((chars[c.to]&&chars[c.to].name)||c.to);
function clueLog(c){if(c.shown){gmLog(logm('Revealed clue “{clue}” to {who}',{clue:clueName(c),who:clueWho(c)}),false);if(c.to==='all')gmStory(logm('Found “{clue}”',{clue:clueName(c)}));}else gmLog(logm('Hid clue “{clue}”',{clue:clueName(c)}),false);}
async function addClue(show){const tt=(document.getElementById('cl-title')||{}).value||'',b=(document.getElementById('cl-body')||{}).value||'';
 if(!tt.trim()&&!b.trim()&&!gm.clueImg)return toast(t('Write a clue or add a picture first.'));
 let img=gm.clueImg;if(img){toast(t('Saving picture…'));img=await storeImage(img,'campaigns/'+CAMP+'/'+authUid);}
 const id=gmId();const c={id,title:tt.trim(),body:b.trim(),img,to:gm.clueTo||'all',shown:!!show,t:Date.now()};clues[id]=c;gm.clueImg='';gmSet('clues/'+id,c);if(show)clueLog(c);else gmLog(logm('Saved clue “{clue}” (hidden)',{clue:clueName(c)}),false);
 const ti=document.getElementById('cl-title'),bo=document.getElementById('cl-body');if(ti)ti.value='';if(bo)bo.value='';render();toast(show?t('Clue revealed to the players.'):t('Clue saved. Reveal it when they find it.'));}

// ---------- campaign ----------
function saveCampaign(){render();gmSet('campaign/main',JSON.parse(JSON.stringify(campaign)));}
function campaignHtml(master){
 const list=(key,label,fields,ph)=>{const a=campaign[key]||[];
  let h='<div><span class="lbl">'+label+'</span><div class="list">'+(a.length?a.map(x=>master?'<div class="item">'+(key==='npcs'?picHtml(x.pic,x.picFull,x.name):'')+'<div class="grow">'+fields.map(([f,pl,w])=>f==='done'?'':'<input class="f" id="cp-'+key+'-'+f+'-'+x.id+'" data-gcp="'+key+'" data-id="'+x.id+'" data-k="'+f+'" value="'+esc(x[f]||'')+'" placeholder="'+t(pl)+'"'+(w?' style="'+w+'"':'')+'>').join('')+(key==='npcs'?'<div class="row" style="gap:6px">'+picPicker('n',x.id,imgOk(x.pic))+'</div>':'')+'</div>'+(key==='threads'?'<button class="btn sm" data-gact="cpdone" data-id="'+x.id+'">'+(x.done?t('Reopen'):t('Done'))+'</button>':'')+'<button class="btn sm icon" data-gact="cpdel" data-list="'+key+'" data-id="'+x.id+'" aria-label="'+t('Remove')+'">×</button></div>'
   :'<div class="item">'+(key==='npcs'?picHtml(x.pic,x.picFull,x.name):'')+'<div class="grow"><b'+(x.done?' style="text-decoration:line-through;opacity:.6"':'')+'>'+esc(x.name||x.text||'')+'</b>'+(x.att?' <span class="chip">'+esc(x.att)+'</span>':'')+(x.note?'<span class="effect">'+esc(x.note)+'</span>':'')+'</div></div>').join(''):'<p class="note">'+ph+'</p>')+'</div>'+
  (master?'<div class="row"><button class="btn sm" data-gact="cpadd" data-list="'+key+'">'+t('Add')+'</button></div>':'')+'</div>';return h;};
 return '<div class="grid2">'+
  list('threads',t('Open threads'),[['text',t('What’s unresolved?'),'font-weight:600']],t('Nothing yet.'))+
  list('npcs',t('People met'),[['name',t('Name'),'font-weight:600'],['att',t('Attitude (friendly, hostile…)')],['note',t('Notes')]],t('Nobody yet.'))+
  list('locations',t('Places'),[['name',t('Place'),'font-weight:600'],['note',t('What happened there')]],t('Nowhere yet.'))+
 '</div>';
}

// ---------- session wrap-up and recap ----------
function wrapHtml(){
 const w=gm.wrap;return '<div class="list">'+SLOTS.map(s=>{const c=chars[s];const x=w[s]||(w[s]={xp:w.hours||4,mom:false});
  return '<div class="item"><div class="grow"><b>'+esc(c.name)+'</b><span class="effect">'+t('{n} unused XP now',{n:c.xpUnused})+(c.insightChance?' · '+t('already has an insight chance waiting'):'')+'</span></div>'+
  '<label class="row note" style="gap:4px">'+t('XP')+' <input class="maxsel" type="number" min="0" max="20" value="'+x.xp+'" data-gwrap="'+s+'" data-k="xp" style="width:60px"></label>'+
  '<label class="row note" style="gap:4px"><input type="checkbox" data-gwrap="'+s+'" data-k="mom"'+(x.mom?' checked':'')+'> '+t('Momentous')+'</label></div>';}).join('')+'</div>';
}
function awardSession(){let n=0;SLOTS.forEach(s=>{const x=gm.wrap[s];const c=chars[s];if(!x||!c)return;const xp=Math.max(0,Math.round(Number(x.xp)||0));const p={};
 if(xp){p.xpTotal=c.xpTotal+xp;p.xpUnused=c.xpUnused+xp;}if(x.mom)p.insightChance=true;if(Object.keys(p).length){save(s,p,[xp?logm('Earned {n} XP for session {session}',{n:xp,session:table.session}):null,x.mom?logm('Momentous session: may raise insight limit'):null].filter(Boolean));n++;}});
 if(n)gmLog(logm('End of session {n}: {list}',{n:table.session,list:SLOTS.filter(s=>gm.wrap[s]&&chars[s]&&((Number(gm.wrap[s].xp)||0)>0||gm.wrap[s].mom)).map(s=>chars[s].name+' '+(Number(gm.wrap[s].xp)>0?'+'+Math.round(Number(gm.wrap[s].xp))+' XP':'')+(gm.wrap[s].mom?' ('+t('momentous')+')':'')).join(', ')}),false);
 gm.wrap={};toast(n?t('Awarded. Players can spend their XP now.'):t('Nothing to award.'));}
function recapText(){return t('Session {n} recap',{n:historySession})+'\n'+recapGroups().map(([n,a])=>'\n'+n+':\n'+a.map(x=>'- '+logText(x)).join('\n')).join('\n');}

// ---------- pages ----------
// An enemy killed earlier (kept on the campaign's record after the encounter is cleared). The GM can take it off.
function pastBrief(x){const q=Math.max(1,x.qty||1),k=x.killed||q,ty=tallyText(q,k);return '<div class="item" style="align-items:center">'+picHtml(x.pic,x.picFull,nameT(x.n))+'<div class="grow"><b>'+esc(nameT(x.n))+'</b>'+(ty?'<span class="effect">'+ty+'</span>':'')+'</div>'+(k>=q?'<span class="chip bad">'+t('Dead')+'</span>':'')+(isGM()?'<button class="btn sm icon" data-gact="defdel" data-id="'+esc(x.id)+'" aria-label="'+t('Remove {name}',{name:esc(nameT(x.n))})+'">×</button>':'')+'</div>';}
function renderJournal(){
 const shown=Object.values(clues).filter(c=>c.shown).sort((a,b)=>b.t-a.t);
 let h=turnBar()+'<section class="sec"><div class="sec-head"><h2>'+t('Clues &amp; handouts')+'</h2><span class="note">'+t('What the GM has revealed. Newest first.')+'</span></div>'+
  (shown.length?'<div class="clues">'+shown.map(c=>clueHtml(c,false)).join('')+'</div>':'<p class="note" style="margin:0">'+t('Nothing revealed yet.')+'</p>')+'</section>';
 // One list: enemies the GM is showing now, then ones killed earlier that are no longer on show (newest first).
 const shownEn=Object.values(enemies).filter(e=>e.shown).sort((a,b)=>a.t-b.t);
 const past=(campaign.defeated||[]).filter(x=>!(enemies[x.id]&&enemies[x.id].shown)).sort((a,b)=>b.at-a.at);
 if(shownEn.length||past.length)h+='<section class="sec"><div class="sec-head"><h2>'+t('Enemies')+'</h2><span class="note">'+(past.length?t('Shown by the GM, and enemies defeated so far.'):t('The GM is showing these.'))+'</span></div><div class="list">'+shownEn.map(enemyBrief).join('')+past.map(pastBrief).join('')+'</div></section>';
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Campaign')+'</h2>'+(campaign.date?'<span class="chip">'+esc(campaign.date)+'</span>':'')+'</div>'+campaignHtml(false)+'</section>';
 // finished sessions only: the current one appears once the GM starts the next
 const done=(table.session||1)-1;
 if(done>=1){
  if(jSession==null||jSession>done){jSession=done;setTimeout(()=>loadJournalRecap(done),0);}
  const sm=summaryOf(jSession);
  h+='<section class="sec"><div class="sec-head"><h2>'+t('Past sessions')+'</h2><label class="row note" style="gap:6px">'+t('Session')+' <select class="maxsel" data-jrecap="1" aria-label="'+t('Choose a session')+'" style="width:auto">'+Array.from({length:done},(_,i)=>done-i).map(i=>'<option value="'+i+'"'+(jSession===i?' selected':'')+'>'+i+'</option>').join('')+'</select></label></div>'+
   (sm?'<p class="recap-sum">'+esc(sm)+'</p>':'')+
   (jLog.length?'<div class="grid2">'+recapGroups(jLog).map(([n,a])=>'<div><span class="lbl">'+esc(n)+'</span><ul class="recap">'+a.map(x=>'<li>'+esc(logText(x))+'</li>').join('')+'</ul></div>').join('')+'</div>':(sm?'':'<p class="note" style="margin:0">'+t('Nothing was logged for session {n}.',{n:jSession})+'</p>'))+'</section>';
 }
 h+=galleryHtml();
 // Finishing the campaign: the owner or the GM marks it complete, and everything becomes a read-only record.
 if(canFinish()&&!campDone())h+='<section class="sec"><h2>'+t('Finish the campaign')+'</h2>'+(edit.done?'<div class="roll" role="status"><span>'+t('Mark {name} complete? Investigators, the journal and the GM tools become read-only until it’s reopened.',{name:'<b>'+esc(camp.name||'')+'</b>'})+'</span><div class="row"><button class="btn sm pri" data-act="campdone">'+t('Mark complete')+'</button><button class="btn sm" data-act="campdoneno">'+t('Cancel')+'</button></div></div>':'<p class="note" style="margin:0">'+t('When the story is over, mark the campaign complete. It moves to Completed on your campaigns page with its finish date, and everything stays readable. Investigators can still be brought into new campaigns.')+'</p><div class="row"><button class="btn" data-act="campdone">'+t('Mark campaign complete')+'</button></div>')+'</section>';
 return h;
}
// Next session (campaigns): the GM can set the next meetup right here; the owner can also set it in Settings.
const pad2=n=>String(n).padStart(2,'0');
const localInput=t=>{const d=new Date(t);return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+'T'+pad2(d.getHours())+':'+pad2(d.getMinutes());};
function gmNextHtml(){
 const ts=camp&&camp.nextSession,on=window.sessionShown&&sessionShown(ts);
 return '<section class="sec"><div class="sec-head"><h2>'+t('Next session')+'</h2>'+(on?'<span class="cdtext" data-cd="'+ts+'">'+esc(sessionRel(ts))+'</span>':'<span class="note">'+t('Not set')+'</span>')+'</div>'+
  '<div class="row" style="align-items:flex-end"><label class="field"><span class="lbl">'+t('Date and time')+'</span><input class="f" type="datetime-local" id="gm-nsdate" value="'+(on?localInput(ts):'')+'"></label>'+sessionHoursSelect('gm-nshours',camp.nextHours)+
  '<label class="field" style="flex:1;min-width:180px"><span class="lbl">'+t('Where (optional)')+'</span><input class="f" id="gm-nswhere" maxlength="80" data-place autocomplete="off" placeholder="'+t('e.g. Dan’s place, or Discord')+'" value="'+esc(on?camp.nextWhere||'':'')+'"></label>'+
  '<button class="btn pri" data-gact="nsset">'+(on?t('Update'):t('Set'))+'</button>'+(on?'<button class="btn" data-gact="nsclear">'+t('Clear')+'</button>':'')+'</div>'+
  '<p class="note" style="margin:0">'+t('Everyone sees a countdown on the campaign’s card and the Party tab, and can add it to their calendar.')+'</p></section>';
}
// FieldValue.delete() for whichever store this campaign uses (the device-only one has its own).
const fvDel=()=>(IS_LOCAL?LocalFB.FieldValue:firebase.firestore.FieldValue).delete();
function setNextSession(p){const ref=(IS_LOCAL?LocalFB.app():firebase.app('beta')).firestore().doc('campaigns/'+CAMP);return ref.update(p);}
function renderGM(){
 if(!isGMView())return gmPinHtml()+'<section class="sec"><h2>'+t('Game Master')+'</h2><p class="note">'+t('These are the Game Master’s tools. Players don’t need anything here.')+(CAMP?' '+t('The campaign owner chooses the GM on the campaign page.'):'')+'</p></section>';
 const en=Object.values(enemies).sort((a,b)=>a.t-b.t);const cats=[...new Set(NPCS.map(x=>x.cat))];const p=npcProfile(gm.addN);
 let h=turnBar()+gmPinHtml();
 if(CAMP)h+=gmNextHtml();
 // scene & turns
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Scene &amp; turns')+'</h2><span class="note">'+t('Everyone sees this bar at the top of their screen.')+'</span></div>'+
  '<div class="row"><label class="field" style="flex:1;min-width:200px"><span class="lbl">'+t('Scene')+'</span><input class="f" id="gm-scene" data-gt="scene" value="'+esc(table.scene)+'" placeholder="'+t('e.g. The Orne Library, after midnight')+'"></label>'+
  (table.scene||table.fight?'<button class="btn sm" data-gact="endscene">'+t('End scene')+'</button>':'')+'</div>';
 if(!table.fight)h+='<div class="row"><label class="field"><span class="lbl">'+t('Who goes first')+'</span><select class="f" id="gm-first" data-gs="fightFirst"><option value="investigators"'+(gm.fightFirst==='investigators'?' selected':'')+'>'+t('Investigators')+'</option><option value="adversaries"'+(gm.fightFirst==='adversaries'?' selected':'')+'>'+t('Adversaries')+'</option></select></label>'+
  '<label class="field"><span class="lbl">'+t('Surprise')+'</span><select class="f" id="gm-sur" data-gs="fightSurprise"><option value="none">'+t('Nobody surprised')+'</option><option value="investigators"'+(gm.fightSurprise==='investigators'?' selected':'')+'>'+t('Investigators are surprised')+'</option><option value="adversaries"'+(gm.fightSurprise==='adversaries'?' selected':'')+'>'+t('Adversaries are surprised')+'</option></select></label>'+
  '<button class="btn pri" data-gact="fight">'+t('Start a fight')+'</button></div>';
 else h+='<div class="row"><button class="btn pri" data-gact="next">'+(table.phase==='surprise'?t('Start round 1'):table.phase==='investigators'?t('Adversaries’ turn'):t('Investigators’ turn'))+'</button><button class="btn" data-gact="endfight">'+t('End fight')+'</button></div>';
 h+='<label class="row note" style="gap:6px"><input type="checkbox" data-gt="auto"'+(table.auto?' checked':'')+'> '+t('Refill each side’s pools automatically when their turn starts (surprise round: the side that isn’t surprised adds 1 die)')+'</label></section>';
 // encounter
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Encounter')+'</h2><span class="note">'+t('Enemies are hidden from players unless you show them.')+'</span></div>'+
  '<div class="row"><label class="field" style="flex:2;min-width:200px"><span class="lbl">'+(BOOK_NPCS?t('Add from the book'):t('Add an enemy'))+'</span><select class="f" id="gm-add" data-gs="addN">'+(BOOK_NPCS?'<option value="">'+t('Choose an enemy…')+'</option>':'')+cats.map(ct=>'<optgroup label="'+t(ct)+'">'+NPCS.filter(x=>x.cat===ct).map(x=>'<option value="'+esc(x.n)+'"'+(gm.addN===x.n?' selected':'')+'>'+esc(t(x.n))+'</option>').join('')+'</optgroup>').join('')+'<option value="__custom"'+(gm.addN==='__custom'?' selected':'')+'>'+t('Custom enemy')+'</option></select></label>'+
  '<label class="field" style="width:80px"><span class="lbl">'+t('How many')+'</span><input class="f" type="number" min="1" max="12" id="gm-count" data-gs="addCount" value="'+gm.addCount+'"></label>'+
  '<button class="btn" data-gact="eadd" '+(gm.addN?'':'disabled')+'>'+t('Add')+'</button></div>'+
  (gm.addN==='__custom'?'<div class="row"><label class="field" style="flex:2;min-width:180px"><span class="lbl">'+t('Name')+'</span><input class="f" id="gm-addname" data-gs="addName" maxlength="60" value="'+esc(gm.addName||'')+'" placeholder="'+t('e.g. Swamp devil')+'"></label><label class="field" style="flex:1;min-width:140px"><span class="lbl">'+t('Type')+'</span><select class="f" id="gm-addtype" data-gs="addType">'+ENEMY_TYPES.map(x=>'<option value="'+x+'"'+((gm.addType||'Minor')===x?' selected':'')+'>'+(x==='Named'?t('Named'):t(x+' NPC'))+'</option>').join('')+'</select></label></div>':'')+
  (gm.addN?'<label class="row note" style="gap:6px"><input type="checkbox" data-gs="addScale"'+(gm.addScale?' checked':'')+'> '+(p?t('Scale to the party: +1 die per investigator (max 8), so {n} instead of {base}',{n:Math.min(8,p.pool+SLOTS.length),base:p.pool}):t('Scale to the party: +1 die per investigator (max 8)'))+'</label>':'')+
  (BOOK_NPCS?'':'<p class="note" style="margin:0">'+t('Add enemies and set their pools yourself. Campaigns saved to an account can also add enemies from the Core Rulebook’s profiles.')+'</p>')+
  (p?'<p class="note" style="margin:0">'+esc(p.type==='Named'?t('Named character'):t(p.type+' NPC'))+(p.size?' · '+t(p.size):'')+'. '+t('Starting pool {n} is a suggestion: the book prints each pool in the profile art, so check it and adjust with Max.',{n:p.pool})+'</p>':'')+
  (en.length?'<div class="row"><button class="btn sm" data-gact="erefillall">'+t('Refill all enemies')+'</button><button class="btn sm dng" data-gact="eclearall">'+t('Remove all')+'</button></div>'+en.map(enemyHtml).join(''):'<p class="note" style="margin:0">'+t('No enemies in this scene.')+'</p>')+'</section>';
 // roller
 const r=gm.roll;
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Hidden dice roller')+'</h2><span class="note">'+t('Only you see these rolls.')+'</span></div><div class="row">'+
  '<label class="field" style="width:80px"><span class="lbl">'+t('Dice')+'</span><input class="f" type="number" min="1" max="20" data-gs="rollN" value="'+gm.rollN+'"></label>'+
  '<label class="field" style="width:100px"><span class="lbl">'+t('Skill')+'</span><select class="f" data-gs="rollT">'+[2,3,4,5,6].map(t=>'<option value="'+t+'"'+(Number(gm.rollT)===t?' selected':'')+'>'+t+'+</option>').join('')+'</select></label>'+
  '<label class="field" style="width:100px"><span class="lbl">'+t('Horror dice')+'</span><input class="f" type="number" min="0" max="20" data-gs="rollH" value="'+gm.rollH+'"></label>'+
  '<label class="field" style="width:100px"><span class="lbl">'+t('+/− per die')+'</span><input class="f" type="number" min="-3" max="3" data-gs="rollMod" value="'+gm.rollMod+'"></label>'+
  '<button class="btn pri" data-gact="roll">'+t('Roll')+'</button></div>'+
  (r?'<div class="rollout">'+r.dice.map(d=>'<span class="rd'+(d.h?' h':'')+(d.s?' s':'')+'">'+d.v+'</span>').join('')+'</div><p style="margin:0"><b>'+tn('{n} success','{n} successes',r.succ)+'</b> '+t('at {n}+',{n:r.t})+(r.mod?' ('+t('{mod} per die',{mod:(r.mod>0?'+':'')+r.mod})+')':'')+' · '+tn('{n} six','{n} sixes',r.sixes)+' · '+tn('{n} one','{n} ones',r.ones)+(r.hones?' · <b>'+t('{n} on horror dice: trauma',{n:r.hones})+'</b>':'')+'</p>':'')+'</section>';
 // clues
 const all=Object.values(clues).sort((a,b)=>b.t-a.t);
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Clues &amp; handouts')+'</h2><span class="note">'+t('Players see revealed clues on the Journal tab.')+'</span></div>'+
  '<label class="field"><span class="lbl">'+t('Title')+'</span><input class="f" id="cl-title" placeholder="'+t('e.g. A torn page from the Necronomicon')+'"></label>'+
  '<label class="field"><span class="lbl">'+t('Text')+'</span><textarea class="f" id="cl-body" rows="3" placeholder="'+t('What they find, read or hear')+'"></textarea></label>'+
  '<div class="row"><label class="btn sm" for="cl-img" style="display:inline-flex;align-items:center;cursor:pointer">'+(gm.clueImg?t('Change picture'):t('Add a picture'))+'</label><input type="file" id="cl-img" accept="image/*" data-gimg="1" hidden>'+(gm.clueImg?'<img src="'+gm.clueImg+'" alt="" style="height:48px;border-radius:6px"><button class="btn sm" data-gact="climgdel">'+t('Remove picture')+'</button>':'')+
  '<label class="field"><span class="lbl">'+t('For')+'</span><select class="f" data-gs="clueTo"><option value="all">'+t('Everyone')+'</option>'+SLOTS.map(s=>'<option value="'+s+'"'+(gm.clueTo===s?' selected':'')+'>'+t('{name} only',{name:esc(chars[s].name)})+'</option>').join('')+'</select></label></div>'+
  (gm.clueTo!=='all'&&chars[gm.clueTo]&&!chars[gm.clueTo].locked?'<p class="note" style="margin:0">'+t('{name}’s sheet has no passcode, so anyone could open this clue. It’s only private for sheets with a passcode.',{name:esc(chars[gm.clueTo].name)})+'</p>':'')+
  '<div class="row"><button class="btn pri" data-gact="cadd" data-n="1">'+t('Reveal now')+'</button><button class="btn" data-gact="cadd" data-n="0">'+t('Save for later')+'</button></div>'+
  (all.length?'<div class="clues">'+all.map(c=>clueHtml(c,true)).join('')+'</div>':'')+'</section>';
 // session
 const ss=[];for(let i=Math.max(1,table.session||1);i>=1;i--)ss.push(i);
 h+='<section class="sec"><div class="sec-head"><h2>'+t('End of session')+'</h2><span class="chip">'+t('Session {n}',{n:table.session||1})+'</span></div>'+
  '<p class="note" style="margin:0">'+t('The book suggests 1 XP per hour played, plus 1–3 for big moments. Tick <b>Momentous</b> for anyone who ended an encounter with all horror dice, took an injury of 4+, faced their past, brought their background into play, or failed badly enough to put the group at risk: they may raise their insight limit for 1 XP.')+'</p>'+
  '<div class="row"><label class="row note" style="gap:4px">'+t('Hours played')+' <input class="maxsel" type="number" min="0" max="12" data-gwrap="hours" value="'+(gm.wrap.hours||4)+'" style="width:60px"></label><button class="btn sm" data-gact="wrapall">'+t('Set everyone’s XP to that')+'</button></div>'+
  wrapHtml()+'<div class="row"><button class="btn pri" data-gact="award">'+t('Award XP')+'</button><button class="btn" data-gact="nextsession">'+t('Start session {n}',{n:(table.session||1)+1})+'</button></div>'+
  '<p class="note" style="margin:0">'+t('Starting the next session refills everyone’s insight, frees habitual and lucky items, clears trauma penalties and begins a new recap.')+'</p></section>';
 // recap
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Session recap')+'</h2></div><div class="row"><label class="field"><span class="lbl">'+t('Session')+'</span><select class="f" data-grecap="1"><option value="">'+t('Choose…')+'</option>'+ss.map(i=>'<option value="'+i+'"'+(historySession===i?' selected':'')+'>'+t('Session {n}',{n:i})+'</option>').join('')+'</select></label>'+(historySession&&histLog.length?'<button class="btn sm" data-gact="copyrecap">'+t('Copy as text')+'</button>':'')+'</div>';
 if(historySession){
  h+='<label class="field"><span class="lbl">'+t('Summary for players (optional)')+'</span><textarea class="f" rows="3" maxlength="2000" data-gsum="'+historySession+'" placeholder="'+t('A few sentences on what happened. Players see it in the Journal once session {n} is over.',{n:historySession})+'">'+esc(summaryOf(historySession))+'</textarea></label>';
  h+=histLog.length?'<div class="grid2">'+recapGroups().map(([n,a])=>'<div><span class="lbl">'+esc(n)+'</span><ul class="recap">'+a.map(x=>'<li>'+esc(logText(x))+'</li>').join('')+'</ul></div>').join('')+'</div>':'<p class="note" style="margin:0">'+t('Nothing logged for session {n}. (Recaps start from when this feature was added.)',{n:historySession})+'</p>';}
 h+='</section>';
 // campaign
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Campaign')+'</h2><span class="note">'+t('Players can read this on the Journal tab.')+'</span></div><label class="field" style="max-width:320px"><span class="lbl">'+t('In-game date')+'</span><input class="f" id="cp-date" data-gcpd="1" value="'+esc(campaign.date)+'" placeholder="'+t('e.g. Friday, October 14, 1927')+'"></label>'+campaignHtml(true)+'</section>';
 // notes
 h+='<section class="sec"><div class="sec-head"><h2>'+t('GM notes')+'</h2><span class="note">'+(CAMP?t('Private: only the GM can read these.'):t('Private: only the GM (and the master key) can read these.'))+'</span></div><textarea class="f" id="gm-notes" data-gnotes="1" rows="8"'+(isGM()?'':' readonly')+' placeholder="'+t('Secrets, plans, NPC motives…')+'">'+esc(gmNotes)+'</textarea></section>';
 // activity
 const g=isGM(),tf=x=>new Date(x).toLocaleString(I18N.locale, {weekday:'short',hour:'numeric',minute:'2-digit'});
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Recent')+'</h2><span class="note">'+(CAMP?t('Only the GM sees this.'):t('Only the GM and the master key see this.'))+'</span>'+(g&&gmLogList.length?'<button class="btn sm dng" data-gact="glclear">'+t('Clear all')+'</button>':'')+'</div><div class="log">'+(gmLogList.length?gmLogList.map(l=>'<span class="row" style="gap:6px;flex-wrap:nowrap">'+(g?'<button class="btn sm icon" style="min-height:24px;width:24px" data-gact="gldel" data-id="'+esc(l.id)+'" aria-label="'+t('Remove this entry')+'">×</button>':'')+'<span>'+tf(l.t)+' — '+esc(logText(l))+'</span></span>').join(''):t('Nothing yet.'))+'</div></section>';
 return h;
}

// ---------- GM clicks and edits ----------
function gmClick(b){const a=b.dataset.gact,id=b.dataset.id,n=Number(b.dataset.n),e=id&&enemies[id];
 if(!isGM()&&!['eopen','copyrecap'].includes(a))return toast(t('Only the GM can change this.'));
 switch(a){
  case 'fight':startFight();break;
  case 'next':nextTurn();break;
  case 'endfight':gmLog(logn('Fight ended after {n} round','Fight ended after {n} rounds',Math.max(1,table.round)),true);saveTable({fight:false,phase:'',round:0});break;
  case 'endscene':if(table.scene)gmLog(logm('Scene ended: {scene}',{scene:table.scene}),false);saveTable({scene:'',fight:false,phase:'',round:0});break;
  case 'eadd':if(gm.addN==='__custom'){gm.addN='';addEnemies();}else addEnemies();break;
  case 'eopen':gm.open[id]=!gm.open[id];render();break;
  case 'eshow':if(e){gmLog(e.shown?logm('Hid {enemy} from the players',{enemy:e.n}):logm('Showed {enemy} to the players',{enemy:e.n}),false);if(!e.shown)gmStory(logm('Encountered {enemy}',{enemy:e.n}));updEnemy(id,{shown:!e.shown});}break;
  case 'edel':if(e){gmLog(logm('Removed {enemy}',{enemy:e.n}),false);delete enemies[id];render();gmDel('enemies/'+id);}break;
  case 'eclearall':if(Object.keys(enemies).length)gmLog(logm('Cleared all enemies'),false);Object.keys(enemies).forEach(k=>gmDel('enemies/'+k));enemies={};render();break;
  case 'espend':if(e){if(e.regular>0)updEnemy(id,{regular:e.regular-1});else if(e.horror>0)updEnemy(id,{horror:e.horror-1});}break;
  case 'erefill':if(e)refillEnemy(e);break;
  case 'erefillall':Object.values(enemies).filter(x=>!x.out).forEach(x=>refillEnemy(x));break;
  case 'edmg':if(e)enemyDamage(e,1);break;
  case 'eheal':if(e&&e.limit<e.max)gmLog(logm('{enemy} healed 1',{enemy:e.n}),false),updEnemy(id,{limit:e.limit+1});break;
  case 'estrain':if(e)gmLog(logm('{enemy} strained to fight on',{enemy:e.n}),!!e.shown),updEnemy(id,{limit:e.max,strained:true});break;
  // Dead enemies go on the campaign's record (campaign/main), so the Journal keeps them after the encounter is cleared.
  case 'eqty':if(e)setTally(id,eQty(e)+n,eKilled(e));break;
  case 'ekill':if(e)setTally(id,eQty(e),eKilled(e)+n);break;
  case 'edead':if(e&&!e.dead){setTally(id,eQty(e),eQty(e));toast(t('{enemy} is dead. The Journal keeps it in the list of enemies.',{enemy:nameT(e.n)}));}break;
  case 'eundead':if(e&&e.dead){setTally(id,eQty(e),0);gmLog(logm('{enemy} is not dead after all',{enemy:e.n}),false);}break;
  case 'defdel':campaign.defeated=(campaign.defeated||[]).filter(x=>x.id!==id);saveCampaign();break;
  case 'eback':if(e)gmLog(logm('{enemy} is back in the fight',{enemy:e.n}),false),updEnemy(id,{out:false,limit:Math.max(1,e.limit)});break;
  case 'emax':if(e){const m=Math.max(1,Math.min(12,e.max+n));const lim=e.limit===e.max?m:Math.min(e.limit,m);e.max=m;e.limit=lim;enemyClamp(e);updEnemy(id,{max:m,limit:e.limit,regular:e.regular,horror:e.horror});}break;
  case 'ehl':if(e)updEnemy(id,{horrorLimit:Math.max(0,Math.min(e.max,(e.horrorLimit||0)+n))});break;
  case 'eclear':if(e)updEnemy(id,{injuries:[],traumas:[]});break;
  case 'roll':rollDice();break;
  case 'cadd':addClue(n===1);break;
  case 'cshow':{const c=clues[id];if(c){c.shown=!c.shown;clueLog(c);render();gmSet('clues/'+id,{shown:c.shown},true);}break;}
  case 'cdel':if(clues[id])gmLog(logm('Deleted clue “{clue}”',{clue:clueName(clues[id])}),false);delete clues[id];render();gmDel('clues/'+id);break;
  case 'climgdel':gm.clueImg='';render();break;
  case 'picdel':{const id=b.dataset.id;if(b.dataset.kind==='e'){if(enemies[id])updEnemy(id,{pic:'',picFull:''});}else{campaign.npcs=(campaign.npcs||[]).map(x=>x.id===id?{...x,pic:'',picFull:''}:x);saveCampaign();}break;}
  case 'cpadd':{const l=b.dataset.list;campaign[l]=[...(campaign[l]||[]),{id:gmId()}];saveCampaign();break;}
  case 'cpdel':{const l=b.dataset.list;campaign[l]=(campaign[l]||[]).filter(x=>x.id!==id);saveCampaign();break;}
  case 'cpdone':campaign.threads=(campaign.threads||[]).map(x=>x.id===id?{...x,done:!x.done}:x);saveCampaign();break;
  case 'wrapall':SLOTS.forEach(s=>{gm.wrap[s]={...(gm.wrap[s]||{mom:false}),xp:gm.wrap.hours||4};});render();break;
  case 'award':awardSession();break;
  case 'nsset':{const v=(document.getElementById('gm-nsdate')||{}).value,w=((document.getElementById('gm-nswhere')||{}).value||'').trim().slice(0,80),ts=v?new Date(v).getTime():NaN;
   if(!Number.isFinite(ts))return toast(t('Pick a date and time.'));if(ts<Date.now()-3600000)return toast(t('That time has already passed.'));
   setNextSession({nextSession:ts,nextWhere:w,nextHours:(h=>h===null?fvDel():h)(sessionHoursValue((document.getElementById('gm-nshours')||{}).value))}).then(()=>toast(t('Next session set for {when}.',{when:sessionWhen(ts)})),e=>{if(window.quotaHit&&quotaHit(e))return;toast(t('Couldn’t save that. Try again.'));});break;}
  case 'nsclear':setNextSession({nextSession:fvDel(),nextWhere:fvDel(),nextHours:fvDel()}).then(()=>toast(t('Next session cleared.')),e=>{if(window.quotaHit&&quotaHit(e))return;toast(t('Couldn’t clear it. Try again.'));});break;
  case 'nextsession':SLOTS.filter(gmCan).forEach(x=>R.newSession(x,true));saveTable({session:(table.session||1)+1,scene:'',fight:false,phase:'',round:0});gmLog(logm('Session {n} started',{n:table.session}),false);gm.wrap={};toast(t('Session {n} started.',{n:table.session}));break;
  case 'gldel':gmLogList=gmLogList.filter(x=>x.id!==id);render();gmDel('gmlog/'+id);break;
  case 'glclear':gmLogList.forEach(x=>gmDel('gmlog/'+x.id));gmLogList=[];render();break;
  case 'copyrecap':{const txt=recapText();try{navigator.clipboard.writeText(txt).then(()=>toast(t('Recap copied.')),()=>toast(t('Couldn’t copy. Select the text instead.')));}catch(x){toast(t('Couldn’t copy. Select the text instead.'));}break;}
 }
}
let notesT=null;
function gmChange(el){
 if(!isGM()&&(el.dataset.gpic||el.dataset.gt||el.dataset.gen||el.dataset.geinj||el.dataset.getra||el.dataset.gimg||el.dataset.gcp||el.dataset.gcpd||el.dataset.gnotes||el.dataset.gwrap)){toast(t('Only the GM can change this.'));render();return true;}
 if(el.dataset.gs){const k=el.dataset.gs;gm[k]=el.type==='checkbox'?el.checked:el.value;render();return true;}
 if(el.dataset.gt){const k=el.dataset.gt;if(k==='scene'&&el.value.trim()&&el.value.trim()!==table.scene)gmLog(logm('Scene: {scene}',{scene:el.value.trim()}),true);saveTable({[k]:el.type==='checkbox'?el.checked:el.value.trim()});return true;}
 if(el.dataset.gen){const id=el.dataset.gen,k=el.dataset.k;updEnemy(id,{[k]:el.value});
  // Keep its entry under Enemies defeated in step (name and type).
  if((k==='n'||k==='type')&&(campaign.defeated||[]).some(x=>x.id===id)){campaign.defeated=campaign.defeated.map(x=>x.id===id?{...x,[k]:el.value}:x);saveCampaign();}return true;}
 if(el.dataset.geinj){const e=enemies[el.dataset.geinj];if(e&&el.value){gmLog(logm('{enemy} suffered injury: {injury}',{enemy:e.n,injury:el.value}),!!e.shown);const inj=[...e.injuries,el.value];const p={injuries:inj};if(isUniqueInjury(el.value)&&e.injuries.filter(x=>x===el.value).length>=2&&!e.out){p.out=true;toast(t('A third {injury} injury is fatal.',{injury:t(el.value)}));}if(el.value==='Comatose'||el.value==='Dire'){e.limit=0;enemyClamp(e);Object.assign(p,{limit:0,regular:e.regular,horror:e.horror});}updEnemy(e.id,p);}return true;}
 if(el.dataset.getra){const e=enemies[el.dataset.getra];if(e&&el.value)gmLog(logm('{enemy} suffered trauma: {trauma}',{enemy:e.n,trauma:el.value}),!!e.shown),updEnemy(e.id,{traumas:[...e.traumas,el.value]});return true;}
 if(el.dataset.gimg){pickClueImage(el.files&&el.files[0]);el.value='';return true;}
 if(el.dataset.gpic){const kind=el.dataset.gpic,id=el.dataset.id,f=el.files&&el.files[0];el.value='';
  gmPicture(f,v=>{if(kind==='e'){if(enemies[id])updEnemy(id,v);if((campaign.defeated||[]).some(x=>x.id===id)){campaign.defeated=campaign.defeated.map(x=>x.id===id?{...x,...v}:x);saveCampaign();}}else{campaign.npcs=(campaign.npcs||[]).map(x=>x.id===id?{...x,...v}:x);saveCampaign();}toast(t('Picture saved.'));});return true;}
 if(el.dataset.gcp){const l=el.dataset.gcp;campaign[l]=(campaign[l]||[]).map(x=>x.id===el.dataset.id?{...x,[el.dataset.k]:el.value}:x);saveCampaign();return true;}
 if(el.dataset.gcpd){campaign.date=el.value;saveCampaign();return true;}
 if(el.dataset.gnotes){gmNotes=el.value;gmSet('gm/notes',{text:gmNotes});return true;}
 if(el.dataset.gwrap){const s=el.dataset.gwrap;if(s==='hours'){gm.wrap.hours=Math.max(0,Number(el.value)||0);return true;}
  const x=gm.wrap[s]||(gm.wrap[s]={xp:gm.wrap.hours||4,mom:false});if(el.dataset.k==='mom')x.mom=el.checked;else x.xp=Math.max(0,Number(el.value)||0);return true;}
 if(el.dataset.jrecap){loadJournalRecap(Number(el.value));return true;}
 if(el.dataset.gsum){const n=el.dataset.gsum;campaign.summaries={...(campaign.summaries||{}),[n]:el.value.trim().slice(0,2000)};saveCampaign();toast(t('Summary saved.'));return true;}
 if(el.dataset.grecap){if(el.value)loadRecap(Number(el.value));else{historySession=null;render();}return true;}
 return false;
}

// Opening a clue from a notification (play.html?c=...#clue-<id>): show the Journal and scroll to that clue.
let pendingClue=null;
function readClueHash(){const m=/^#clue-([A-Za-z0-9_-]{1,60})$/.exec(location.hash||'');if(!m)return false;pendingClue=m[1];active='journal';return true;}
readClueHash();
window.addEventListener('hashchange',()=>{if(readClueHash())render();});
function focusPendingClue(){
 if(!pendingClue||active!=='journal')return;
 const el=document.querySelector('[data-clue-id="'+pendingClue+'"]');if(!el)return;
 pendingClue=null;try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
 setTimeout(()=>{el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),2600);},60);
}
