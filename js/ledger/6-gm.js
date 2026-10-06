/* Arkham Ledger — Game Master tools: scene and turns, enemies, dice roller, clues, campaign tracker, wrap-up, recap, Journal and GM pages.
   Part of the ledger; these files load in order and share their variables. */
// ---------- game master: table state, enemies, clues, campaign, notes, history ----------
const NPCS=window.APL_NPCS||[],NPC_TRAUMAS=window.APL_NPC_TRAUMAS||[];
let table={scene:'',fight:false,phase:'',round:0,first:'investigators',session:1,auto:true};
try{const k=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(k&&k.table)table={...table,...k.table};}catch(e){}
let enemies={},clues={},campaign={date:'',locations:[],npcs:[],threads:[]},gmNotes='',histLog=[],historySession=null;
const gm={open:{},roll:null,rollN:4,rollT:4,rollH:0,rollMod:0,fightFirst:'investigators',fightSurprise:'none',addN:'',addCount:1,addScale:false,clueImg:'',clueTo:'all',recap:null,wrap:{}};
let gmUnsubs=[],gmMasterState=null;
const isGM=()=>localMode||(!!keys.gm&&gmClaimed);
let keysReady=false,gmFlagReady=false;
const isGMView=()=>CAMP?isGM():(isGM()||!!keys.master);
const gmId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
async function gmSet(path,data,merge){if(!db)return;try{await db.doc(path).set(data,merge?{merge:true}:undefined);}catch(e){toast(e&&e.code==='permission-denied'?'Firebase refused that. Publish the updated rules (see README) and use the master key.':'Couldn’t save that. Try again.');}}
async function gmDel(path){if(!db)return;try{await db.doc(path).delete();}catch(e){toast('Couldn’t delete that. Try again.');}}
function saveTable(p){Object.assign(table,p);render();gmSet('table/state',{...table});}
let gmLogList=[];
// GM activity: private log (gmlog), plus public story beats that go into the session recap
function gmLog(m,pub){const e={id:gmId(),m,t:Date.now(),session:table.session||1};gmLogList=[e,...gmLogList].slice(0,40);
 const {id,...doc}=e;gmSet('gmlog/'+id,doc);
 if(pub)gmStory(m);render();}
function gmStory(m){const e={t:Date.now(),session:table.session||1};{const h={slot:'gm',name:'The story',m,t:e.t,session:e.session};if(historySession===h.session){histLog=[...histLog,h];render();}if(db)db.collection('history').add(h).catch(()=>{});}}
const recapGroups=(list=histLog)=>{const by={};list.forEach(x=>{const n=x.slot==='gm'?'The story':(x.name||x.slot);(by[n]=by[n]||[]).push(x);});return Object.entries(by).sort((a,b)=>(b[0]==='The story')-(a[0]==='The story'));};
function logHistory(slot,m){const c=chars[slot];const h={slot,name:(c&&c.name)||'',m,t:Date.now(),session:table.session||1};
 if(historySession===h.session)histLog=[...histLog,h];
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
}
// The Journal's own copy of a finished session's recap (separate from the GM tab's picker).
let jSession=null,jLog=[];
async function loadJournalRecap(n){jSession=n;jLog=[];render();
 if(!db)return;try{const qs=await db.collection('history').where('session','==',n).get();const a=[];qs.forEach(d=>a.push(d.data()));if(jSession===n){jLog=a.sort((x,y)=>x.t-y.t);render();}}catch(e){}}
const summaryOf=n=>String(((campaign.summaries||{})[n])||'').trim();
async function loadRecap(n){historySession=n;histLog=[];render();
 if(!db)return;try{const qs=await db.collection('history').where('session','==',n).get();const a=[];qs.forEach(d=>a.push(d.data()));histLog=a.sort((x,y)=>x.t-y.t);render();}catch(e){toast('Couldn’t load that session. Publish the updated rules (see README).');}}

// ---------- turn tracker ----------
function turnBar(){
 if(!table.scene&&!table.fight)return '';
 const ph=table.phase==='surprise'?'Surprise round':table.phase==='investigators'?'Investigators’ turn':table.phase==='adversaries'?'Adversaries’ turn':'';
 return '<div class="turnbar'+(table.phase==='adversaries'?' adv':'')+'" role="status"><span>'+(table.scene?'<b>'+esc(table.scene)+'</b>':'')+(table.fight?' <span class="chip warn">'+(table.phase==='surprise'?'Fight · surprise round':'Fight · round '+Math.max(1,table.round))+'</span>':' <span class="chip">Narrative scene</span>')+'</span>'+(ph?'<span class="ph">'+ph+'</span>':'')+'</div>';
}
function refillChar(s,n){const c=chars[s];if(!c||!gmCan(s))return;const cur=c.regular+c.horror;const want=n==null?c.poolLimit:Math.min(c.poolLimit,cur+n);if(want<=cur&&n!=null)return;
 let h=Math.min(c.horrorLimit,want),r=want-h;if(n!=null){h=Math.max(c.horror,Math.min(c.horrorLimit,c.horror+(want-cur)));r=want-h;}
 save(s,{horror:h,regular:r});}
function refillEnemy(e,n){const cur=e.regular+e.horror;const want=n==null?e.limit:Math.min(e.limit,cur+n);let h=Math.min(e.horrorLimit||0,want);if(n!=null)h=Math.max(e.horror,Math.min(e.horrorLimit||0,e.horror+Math.max(0,want-cur)));
 updEnemy(e.id,{horror:h,regular:Math.max(0,want-h)});}
function refillSide(side,n){if(side==='investigators')SLOTS.forEach(s=>refillChar(s,n));else Object.values(enemies).filter(e=>!e.out).forEach(e=>refillEnemy(e,n));}
function startFight(){const first=gm.fightFirst,sur=gm.fightSurprise;
 if(sur!=='none'){const other=sur==='investigators'?'adversaries':'investigators';if(table.auto)refillSide(other,1);saveTable({fight:true,phase:'surprise',round:0,first});gmLog('Fight started: the '+sur+' were surprised',true);toast('Surprise round: '+(other==='investigators'?'investigators':'adversaries')+' add 1 die. The surprised side doesn’t refill.');}
 else{if(table.auto)refillSide(first);saveTable({fight:true,phase:first,round:1,first});gmLog('Fight started: '+first+' go first',true);}}
function nextTurn(){let ph,round=table.round;
 if(table.phase==='surprise'){ph=table.first;round=1;}
 else{ph=table.phase==='investigators'?'adversaries':'investigators';if(ph===table.first)round++;}
 if(table.auto)refillSide(ph);if(round!==table.round)gmLog('Round '+round,false);saveTable({phase:ph,round});}

// ---------- enemies ----------
function npcProfile(n){return NPCS.find(x=>x.n===n);}
function addEnemies(){const p=npcProfile(gm.addN);const count=Math.max(1,Math.min(12,Number(gm.addCount)||1));
 const base=p?p.pool:4;const pool=gm.addScale?Math.min(8,base+SLOTS.length):base;
 const existing=Object.values(enemies).filter(e=>e.base===(p?p.n:'Custom enemy')).length;
 for(let i=0;i<count;i++){const id=gmId()+i;const hl=(p&&p.horror)||0;
  const e={id,base:p?p.n:'Custom enemy',n:(p?p.n:'Enemy')+(count>1||existing?' '+(existing+i+1):''),type:p?p.type:'Minor',max:pool,limit:pool,regular:pool-Math.min(hl,pool),horror:Math.min(hl,pool),horrorLimit:hl,injuries:[],traumas:[],strained:false,out:false,shown:false,t:Date.now()+i,note:''};
  enemies[id]=e;gmSet('enemies/'+id,e);}
 gmLog('Added '+count+' \u00d7 '+(p?p.n:'custom enemy'),false);gm.addCount=1;render();toast('Added '+count+' '+(p?p.n:'enemy')+(count>1?'s':'')+'.');}
function updEnemy(id,p){const e=enemies[id];if(!e)return;Object.assign(e,p);render();gmSet('enemies/'+id,p,true);}
function enemyClamp(e){e.limit=Math.max(0,Math.min(e.max,e.limit));let over=e.regular+e.horror-e.limit;while(over>0&&e.regular>0){e.regular--;over--;}while(over>0&&e.horror>0){e.horror--;over--;}}
function enemyDamage(e,n){if(e.out)return;e.limit-=n;enemyClamp(e);const p={limit:e.limit,regular:e.regular,horror:e.horror};
 if(e.limit===0){if(e.type==='Minor'){p.out=true;toast(e.n+' is out: killed or knocked unconscious (your call).');}
  else if(e.type==='Major'||e.type==='Monstrous'){if(e.strained){p.out=true;toast(e.n+' is out: killed or knocked unconscious (your call).');}else toast(e.n+' is wounded. As a Major NPC it can strain once to get its pool back.');}
  else toast(e.n+' is wounded.');}
 gmLog(e.n+' took '+n+' damage'+(p.out?' and is out':e.limit===0?' and is wounded':''),false);if(p.out&&e.shown)gmStory(e.n+' was taken down');
 updEnemy(e.id,p);}
function enemyHtml(e){
 const p=npcProfile(e.base);const open=!!gm.open[e.id];const master=isGM();
 const pc={regular:e.regular,horror:e.horror,poolLimit:e.limit,poolMax:e.max,horrorLimit:e.horrorLimit||0};
 let h='<div class="enemy'+(e.out?' out':'')+'"><div class="row" style="justify-content:space-between;align-items:center"><div class="row" style="gap:8px;align-items:center">'+
  (master?'<input class="f" id="en-'+e.id+'" data-gen="'+e.id+'" data-k="n" value="'+esc(e.n)+'" style="font-weight:700;max-width:220px">':'<b>'+esc(e.n)+'</b>')+
  '<span class="chip'+(e.out?' bad':e.limit<e.max?' warn':'')+'">'+(e.out?'Out':e.limit===0?'Wounded':esc(e.type==='Named'?'Named':e.type+' NPC'))+'</span>'+(master&&e.shown?'<span class="chip ok" title="Players can see this enemy">Shown</span>':'')+'</div>'+
  (master?'<div class="row" style="gap:6px"><button class="btn sm" data-gact="eshow" data-id="'+e.id+'">'+(e.shown?'Hide from players':'Show to players')+'</button><button class="btn sm icon" data-gact="edel" data-id="'+e.id+'" aria-label="Remove '+esc(e.n)+'">×</button></div>':'')+'</div>'+
  poolHtml(pc,true)+
  '<div class="note">Pool '+(e.regular+e.horror)+' / limit '+e.limit+' / max '+e.max+(e.horrorLimit?' · horror limit '+e.horrorLimit:'')+(e.injuries.length?' · '+e.injuries.map(esc).join(', '):'')+(e.traumas.length?' · <b>'+e.traumas.map(esc).join(', ')+'</b>':'')+'</div>';
 if(master){
  h+='<div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-gact="espend" data-id="'+e.id+'" '+(e.regular+e.horror?'':'disabled')+'>Spend a die</button><button class="btn sm" data-gact="erefill" data-id="'+e.id+'">Refill</button>'+
   '<button class="btn sm dng" data-gact="edmg" data-id="'+e.id+'" '+(e.out||!e.limit?'disabled':'')+'>Take damage</button><button class="btn sm" data-gact="eheal" data-id="'+e.id+'" '+(e.limit<e.max?'':'disabled')+'>Heal</button>'+
   ((e.type==='Major'||e.type==='Monstrous')&&!e.strained?'<button class="btn sm" data-gact="estrain" data-id="'+e.id+'" '+(e.limit<e.max&&!e.out?'':'disabled')+'>Strain (once)</button>':'')+
   '<span class="stepper"><span class="note">Max</span><button class="btn sm icon" data-gact="emax" data-n="-1" data-id="'+e.id+'" aria-label="Smaller pool">−</button><b class="num">'+e.max+'</b><button class="btn sm icon" data-gact="emax" data-n="1" data-id="'+e.id+'" aria-label="Bigger pool">+</button></span>'+
   '<span class="stepper"><span class="note">Horror limit</span><button class="btn sm icon" data-gact="ehl" data-n="-1" data-id="'+e.id+'" aria-label="Lower horror limit">−</button><b class="num">'+(e.horrorLimit||0)+'</b><button class="btn sm icon" data-gact="ehl" data-n="1" data-id="'+e.id+'" aria-label="Raise horror limit">+</button></span>'+
   (e.out?'<button class="btn sm" data-gact="eback" data-id="'+e.id+'">Back in the fight</button>':'')+'</div>'+
   '<div class="row" style="gap:6px"><select class="maxsel" data-geinj="'+e.id+'" aria-label="Add an injury to '+esc(e.n)+'" style="flex:1;min-width:0"><option value="">Add an injury…</option>'+INJURIES.slice(1).map((x,i)=>'<option value="'+esc(x[0])+'">'+(i===10?'11+':i+1)+' · '+esc(x[0])+'</option>').join('')+'</select>'+
   '<select class="maxsel" data-getra="'+e.id+'" aria-label="Add a trauma to '+esc(e.n)+'" style="flex:1;min-width:0"><option value="">NPC trauma…</option>'+NPC_TRAUMAS.map(t=>'<option value="'+esc(t[1])+'">'+t[0]+' · '+esc(t[1])+'</option>').join('')+'</select>'+
   ((e.injuries.length||e.traumas.length)?'<button class="btn sm" data-gact="eclear" data-id="'+e.id+'">Clear injuries &amp; traumas</button>':'')+'</div>';
 }
 if(p)h+='<button class="btn sm linkish" data-gact="eopen" data-id="'+e.id+'" aria-expanded="'+open+'">'+(open?'Hide':'Show')+' profile</button>';
 if(p&&open)h+=npcProfileHtml(p,e);
 return h+'</div>';
}
function npcProfileHtml(p,e){
 const SK=['Agility','Athletics','Wits','Presence','Intuition','Knowledge','Resolve','Melee','Ranged','Lore'];
 let h='<div class="npcp"><div class="skgrid">'+SK.map((k,i)=>'<span><small>'+k+'</small><b>'+(p.sk[i]?p.sk[i]+'+':'—')+'</b></span>').join('')+'</div>';
 if(p.atk&&p.atk.length)h+='<div><span class="lbl">Attacks</span>'+p.atk.map(a=>'<div class="note"><b>'+esc(a[0])+'</b> · '+esc(a[1])+' · dmg '+a[2]+' · injury '+(a[3]||'–')+' · '+esc(a[4])+(a[5]?' · '+esc(a[5]):'')+'</div>').join('')+'</div>';
 if(p.ab&&p.ab.length)h+='<div><span class="lbl">Abilities</span>'+p.ab.map(a=>'<div class="note"><b>'+esc(a[0])+'.</b> '+esc(a[1])+'</div>').join('')+'</div>';
 if(p.wk&&p.wk.length)h+='<div><span class="lbl">Weaknesses</span>'+p.wk.map(a=>'<div class="note"><b>'+esc(a[0])+'.</b> '+esc(a[1])+'</div>').join('')+'</div>';
 if(p.gear)h+='<div class="note"><b>Gear.</b> '+esc(p.gear)+'</div>';
 return h+'</div>';
}

// ---------- hidden dice roller ----------
function rollDice(){const n=Math.max(1,Math.min(20,Number(gm.rollN)||1)),t=Math.max(2,Math.min(6,Number(gm.rollT)||4)),hz=Math.max(0,Math.min(n,Number(gm.rollH)||0)),mod=Number(gm.rollMod)||0;
 const dice=[];for(let i=0;i<n;i++){const v=1+Math.floor(Math.random()*6);dice.push({v,h:i<hz,s:Math.max(1,Math.min(6,v+mod))>=t});}
 gm.roll={dice,t,mod,succ:dice.filter(d=>d.s).length,ones:dice.filter(d=>d.v===1).length,hones:dice.filter(d=>d.h&&d.v===1).length,sixes:dice.filter(d=>d.v===6).length};render();}

// ---------- clues ----------
function clueHtml(c,master){
 const to=c.to&&c.to!=='all'?(chars[c.to]?chars[c.to].name:'one investigator'):'';
 return '<div class="clue'+(master&&!c.shown?' draft':'')+'">'+(master?'<div class="row" style="justify-content:space-between"><span class="chip'+(c.shown?' ok':'')+'">'+(c.shown?'Revealed':'Not revealed yet')+'</span><div class="row" style="gap:6px"><button class="btn sm'+(c.shown?'':' pri')+'" data-gact="cshow" data-id="'+c.id+'">'+(c.shown?'Hide again':'Reveal')+'</button><button class="btn sm icon" data-gact="cdel" data-id="'+c.id+'" aria-label="Delete clue">×</button></div></div>':'')+
  '<h3>'+esc(c.title||'Untitled')+'</h3>'+(to?'<div class="note">For '+esc(to)+'</div>':'')+(c.img?'<img src="'+c.img+'" alt="'+esc(c.title||'Handout')+'" class="handout">':'')+(c.body?'<p style="white-space:pre-wrap;margin:6px 0 0">'+esc(c.body)+'</p>':'')+'</div>';
}
function pickClueImage(f){if(!f||!/^image\//.test(f.type))return toast('Choose an image file.');const url=URL.createObjectURL(f);const img=new Image();
 img.onload=()=>{let w=img.naturalWidth,h=img.naturalHeight,s=Math.min(1,1200/Math.max(w,h));const cv=document.createElement('canvas');
  let q=0.82,d='';for(let k=0;k<6;k++){cv.width=Math.round(w*s);cv.height=Math.round(h*s);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);d=cv.toDataURL('image/jpeg',q);if(d.length<900000)break;s*=0.8;q-=0.05;}
  URL.revokeObjectURL(url);gm.clueImg=d;render();};img.onerror=()=>toast('Couldn’t read that image.');img.src=url;}
const clueName=c=>'\u201c'+(c.title||(c.body||'').slice(0,40)||'picture')+'\u201d';
const clueWho=c=>c.to==='all'?'everyone':((chars[c.to]&&chars[c.to].name)||c.to);
function clueLog(c){if(c.shown){gmLog('Revealed clue '+clueName(c)+' to '+clueWho(c),false);if(c.to==='all')gmStory('Found '+clueName(c));}else gmLog('Hid clue '+clueName(c),false);}
async function addClue(show){const t=(document.getElementById('cl-title')||{}).value||'',b=(document.getElementById('cl-body')||{}).value||'';
 if(!t.trim()&&!b.trim()&&!gm.clueImg)return toast('Write a clue or add a picture first.');
 let img=gm.clueImg;if(img){toast('Saving picture\u2026');img=await storeImage(img,'campaigns/'+CAMP+'/'+authUid);}
 const id=gmId();const c={id,title:t.trim(),body:b.trim(),img,to:gm.clueTo||'all',shown:!!show,t:Date.now()};clues[id]=c;gm.clueImg='';gmSet('clues/'+id,c);if(show)clueLog(c);else gmLog('Saved clue '+clueName(c)+' (hidden)',false);
 const ti=document.getElementById('cl-title'),bo=document.getElementById('cl-body');if(ti)ti.value='';if(bo)bo.value='';render();toast(show?'Clue revealed to the players.':'Clue saved. Reveal it when they find it.');}

// ---------- campaign ----------
function saveCampaign(){render();gmSet('campaign/main',JSON.parse(JSON.stringify(campaign)));}
function campaignHtml(master){
 const list=(key,label,fields,ph)=>{const a=campaign[key]||[];
  let h='<div><span class="lbl">'+label+'</span><div class="list">'+(a.length?a.map(x=>master?'<div class="item"><div class="grow">'+fields.map(([f,pl,w])=>f==='done'?'':'<input class="f" id="cp-'+key+'-'+f+'-'+x.id+'" data-gcp="'+key+'" data-id="'+x.id+'" data-k="'+f+'" value="'+esc(x[f]||'')+'" placeholder="'+pl+'"'+(w?' style="'+w+'"':'')+'>').join('')+'</div>'+(key==='threads'?'<button class="btn sm" data-gact="cpdone" data-id="'+x.id+'">'+(x.done?'Reopen':'Done')+'</button>':'')+'<button class="btn sm icon" data-gact="cpdel" data-list="'+key+'" data-id="'+x.id+'" aria-label="Remove">×</button></div>'
   :'<div class="item"><div class="grow"><b'+(x.done?' style="text-decoration:line-through;opacity:.6"':'')+'>'+esc(x.name||x.text||'')+'</b>'+(x.att?' <span class="chip">'+esc(x.att)+'</span>':'')+(x.note?'<span class="effect">'+esc(x.note)+'</span>':'')+'</div></div>').join(''):'<p class="note">'+ph+'</p>')+'</div>'+
  (master?'<div class="row"><button class="btn sm" data-gact="cpadd" data-list="'+key+'">Add</button></div>':'')+'</div>';return h;};
 return '<div class="grid2">'+
  list('threads','Open threads',[['text','What’s unresolved?','font-weight:600']],'Nothing yet.')+
  list('npcs','People met',[['name','Name','font-weight:600'],['att','Attitude (friendly, hostile…)'],['note','Notes']],'Nobody yet.')+
  list('locations','Places',[['name','Place','font-weight:600'],['note','What happened there']],'Nowhere yet.')+
 '</div>';
}

// ---------- session wrap-up and recap ----------
function wrapHtml(){
 const w=gm.wrap;return '<div class="list">'+SLOTS.map(s=>{const c=chars[s];const x=w[s]||(w[s]={xp:w.hours||4,mom:false});
  return '<div class="item"><div class="grow"><b>'+esc(c.name)+'</b><span class="effect">'+c.xpUnused+' unused XP now'+(c.insightChance?' · already has an insight chance waiting':'')+'</span></div>'+
  '<label class="row note" style="gap:4px">XP <input class="maxsel" type="number" min="0" max="20" value="'+x.xp+'" data-gwrap="'+s+'" data-k="xp" style="width:60px"></label>'+
  '<label class="row note" style="gap:4px"><input type="checkbox" data-gwrap="'+s+'" data-k="mom"'+(x.mom?' checked':'')+'> Momentous</label></div>';}).join('')+'</div>';
}
function awardSession(){let n=0;SLOTS.forEach(s=>{const x=gm.wrap[s];const c=chars[s];if(!x||!c)return;const xp=Math.max(0,Math.round(Number(x.xp)||0));const p={};
 if(xp){p.xpTotal=c.xpTotal+xp;p.xpUnused=c.xpUnused+xp;}if(x.mom)p.insightChance=true;if(Object.keys(p).length){save(s,p,[xp?'Earned '+xp+' XP for session '+table.session:'',x.mom?'Momentous session: may raise insight limit':''].filter(Boolean).join(' · '));n++;}});
 if(n)gmLog('End of session '+table.session+': '+SLOTS.filter(s=>gm.wrap[s]&&chars[s]&&((Number(gm.wrap[s].xp)||0)>0||gm.wrap[s].mom)).map(s=>chars[s].name+' '+(Number(gm.wrap[s].xp)>0?'+'+Math.round(Number(gm.wrap[s].xp))+' XP':'')+(gm.wrap[s].mom?' (momentous)':'')).join(', '),false);
 gm.wrap={};toast(n?'Awarded. Players can spend their XP now.':'Nothing to award.');}
function recapText(){return 'Session '+historySession+' recap\n'+recapGroups().map(([n,a])=>'\n'+n+':\n'+a.map(x=>'- '+x.m).join('\n')).join('\n');}

// ---------- pages ----------
function renderJournal(){
 const shown=Object.values(clues).filter(c=>c.shown).sort((a,b)=>b.t-a.t);
 let h=turnBar()+'<section class="sec"><div class="sec-head"><h2>Clues &amp; handouts</h2><span class="note">What the GM has revealed. Newest first.</span></div>'+
  (shown.length?'<div class="clues">'+shown.map(c=>clueHtml(c,false)).join('')+'</div>':'<p class="note" style="margin:0">Nothing revealed yet.</p>')+'</section>';
 const shownEn=Object.values(enemies).filter(e=>e.shown);
 if(shownEn.length)h+='<section class="sec"><div class="sec-head"><h2>Enemies</h2><span class="note">The GM is showing these.</span></div>'+shownEn.sort((a,b)=>a.t-b.t).map(enemyHtml).join('')+'</section>';
 h+='<section class="sec"><div class="sec-head"><h2>Campaign</h2>'+(campaign.date?'<span class="chip">'+esc(campaign.date)+'</span>':'')+'</div>'+campaignHtml(false)+'</section>';
 // finished sessions only: the current one appears once the GM starts the next
 const done=(table.session||1)-1;
 if(done>=1){
  if(jSession==null||jSession>done){jSession=done;setTimeout(()=>loadJournalRecap(done),0);}
  const sm=summaryOf(jSession);
  h+='<section class="sec"><div class="sec-head"><h2>Past sessions</h2><label class="row note" style="gap:6px">Session <select class="maxsel" data-jrecap="1" aria-label="Choose a session" style="width:auto">'+Array.from({length:done},(_,i)=>done-i).map(i=>'<option value="'+i+'"'+(jSession===i?' selected':'')+'>'+i+'</option>').join('')+'</select></label></div>'+
   (sm?'<p class="recap-sum">'+esc(sm)+'</p>':'')+
   (jLog.length?'<div class="grid2">'+recapGroups(jLog).map(([n,a])=>'<div><span class="lbl">'+esc(n)+'</span><ul class="recap">'+a.map(x=>'<li>'+esc(x.m)+'</li>').join('')+'</ul></div>').join('')+'</div>':(sm?'':'<p class="note" style="margin:0">Nothing was logged for session '+jSession+'.</p>'))+'</section>';
 }
 return h;
}
// Next session (campaigns): the GM can set the next meetup right here; the owner can also set it in Settings.
const pad2=n=>String(n).padStart(2,'0');
const localInput=t=>{const d=new Date(t);return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+'T'+pad2(d.getHours())+':'+pad2(d.getMinutes());};
function gmNextHtml(){
 const t=camp&&camp.nextSession,on=window.sessionShown&&sessionShown(t);
 return '<section class="sec"><div class="sec-head"><h2>Next session</h2>'+(on?'<span class="cdtext" data-cd="'+t+'">'+esc(sessionRel(t))+'</span>':'<span class="note">Not set</span>')+'</div>'+
  '<div class="row" style="align-items:flex-end"><label class="field"><span class="lbl">Date and time</span><input class="f" type="datetime-local" id="gm-nsdate" value="'+(on?localInput(t):'')+'"></label>'+sessionHoursSelect('gm-nshours',camp.nextHours)+
  '<label class="field" style="flex:1;min-width:180px"><span class="lbl">Where (optional)</span><input class="f" id="gm-nswhere" maxlength="80" data-place autocomplete="off" placeholder="e.g. Dan\u2019s place, or Discord" value="'+esc(on?camp.nextWhere||'':'')+'"></label>'+
  '<button class="btn pri" data-gact="nsset">'+(on?'Update':'Set')+'</button>'+(on?'<button class="btn" data-gact="nsclear">Clear</button>':'')+'</div>'+
  '<p class="note" style="margin:0">Everyone sees a countdown on the campaign\u2019s card and the Party tab, and can add it to their calendar.</p></section>';
}
function setNextSession(p){const ref=firebase.app('beta').firestore().doc('campaigns/'+CAMP);return ref.update(p);}
function renderGM(){
 if(!isGMView())return gmPinHtml()+'<section class="sec"><h2>Game Master</h2><p class="note">These are the Game Master\u2019s tools. Players don\u2019t need anything here.'+(CAMP?' The campaign owner chooses the GM on the campaign page.':'')+'</p></section>';
 const en=Object.values(enemies).sort((a,b)=>a.t-b.t);const cats=[...new Set(NPCS.map(x=>x.cat))];const p=npcProfile(gm.addN);
 let h=turnBar()+gmPinHtml();
 if(CAMP)h+=gmNextHtml();
 // scene & turns
 h+='<section class="sec"><div class="sec-head"><h2>Scene &amp; turns</h2><span class="note">Everyone sees this bar at the top of their screen.</span></div>'+
  '<div class="row"><label class="field" style="flex:1;min-width:200px"><span class="lbl">Scene</span><input class="f" id="gm-scene" data-gt="scene" value="'+esc(table.scene)+'" placeholder="e.g. The Orne Library, after midnight"></label>'+
  (table.scene||table.fight?'<button class="btn sm" data-gact="endscene">End scene</button>':'')+'</div>';
 if(!table.fight)h+='<div class="row"><label class="field"><span class="lbl">Who goes first</span><select class="f" id="gm-first" data-gs="fightFirst"><option value="investigators"'+(gm.fightFirst==='investigators'?' selected':'')+'>Investigators</option><option value="adversaries"'+(gm.fightFirst==='adversaries'?' selected':'')+'>Adversaries</option></select></label>'+
  '<label class="field"><span class="lbl">Surprise</span><select class="f" id="gm-sur" data-gs="fightSurprise"><option value="none">Nobody surprised</option><option value="investigators"'+(gm.fightSurprise==='investigators'?' selected':'')+'>Investigators are surprised</option><option value="adversaries"'+(gm.fightSurprise==='adversaries'?' selected':'')+'>Adversaries are surprised</option></select></label>'+
  '<button class="btn pri" data-gact="fight">Start a fight</button></div>';
 else h+='<div class="row"><button class="btn pri" data-gact="next">'+(table.phase==='surprise'?'Start round 1':table.phase==='investigators'?'Adversaries’ turn':'Investigators’ turn')+'</button><button class="btn" data-gact="endfight">End fight</button></div>';
 h+='<label class="row note" style="gap:6px"><input type="checkbox" data-gt="auto"'+(table.auto?' checked':'')+'> Refill each side’s pools automatically when their turn starts (surprise round: the side that isn’t surprised adds 1 die)</label></section>';
 // encounter
 h+='<section class="sec"><div class="sec-head"><h2>Encounter</h2><span class="note">Enemies are hidden from players unless you show them.</span></div>'+
  '<div class="row"><label class="field" style="flex:2;min-width:200px"><span class="lbl">Add from the book</span><select class="f" id="gm-add" data-gs="addN"><option value="">Choose an enemy…</option>'+cats.map(ct=>'<optgroup label="'+ct+'">'+NPCS.filter(x=>x.cat===ct).map(x=>'<option value="'+esc(x.n)+'"'+(gm.addN===x.n?' selected':'')+'>'+esc(x.n)+'</option>').join('')+'</optgroup>').join('')+'<option value="__custom"'+(gm.addN==='__custom'?' selected':'')+'>Custom enemy</option></select></label>'+
  '<label class="field" style="width:80px"><span class="lbl">How many</span><input class="f" type="number" min="1" max="12" id="gm-count" data-gs="addCount" value="'+gm.addCount+'"></label>'+
  '<button class="btn" data-gact="eadd" '+(gm.addN?'':'disabled')+'>Add</button></div>'+
  (gm.addN?'<label class="row note" style="gap:6px"><input type="checkbox" data-gs="addScale"'+(gm.addScale?' checked':'')+'> Scale to the party: +1 die per investigator (max 8)'+(p?', so '+Math.min(8,p.pool+SLOTS.length)+' instead of '+p.pool:'')+'</label>':'')+
  (p?'<p class="note" style="margin:0">'+esc(p.type==='Named'?'Named character':p.type+' NPC')+(p.size?' · '+p.size:'')+'. Starting pool '+p.pool+' is a suggestion: the book prints each pool in the profile art, so check it and adjust with Max.</p>':'')+
  (en.length?'<div class="row"><button class="btn sm" data-gact="erefillall">Refill all enemies</button><button class="btn sm dng" data-gact="eclearall">Remove all</button></div>'+en.map(enemyHtml).join(''):'<p class="note" style="margin:0">No enemies in this scene.</p>')+'</section>';
 // roller
 const r=gm.roll;
 h+='<section class="sec"><div class="sec-head"><h2>Hidden dice roller</h2><span class="note">Only you see these rolls.</span></div><div class="row">'+
  '<label class="field" style="width:80px"><span class="lbl">Dice</span><input class="f" type="number" min="1" max="20" data-gs="rollN" value="'+gm.rollN+'"></label>'+
  '<label class="field" style="width:100px"><span class="lbl">Skill</span><select class="f" data-gs="rollT">'+[2,3,4,5,6].map(t=>'<option value="'+t+'"'+(Number(gm.rollT)===t?' selected':'')+'>'+t+'+</option>').join('')+'</select></label>'+
  '<label class="field" style="width:100px"><span class="lbl">Horror dice</span><input class="f" type="number" min="0" max="20" data-gs="rollH" value="'+gm.rollH+'"></label>'+
  '<label class="field" style="width:100px"><span class="lbl">+/− per die</span><input class="f" type="number" min="-3" max="3" data-gs="rollMod" value="'+gm.rollMod+'"></label>'+
  '<button class="btn pri" data-gact="roll">Roll</button></div>'+
  (r?'<div class="rollout">'+r.dice.map(d=>'<span class="rd'+(d.h?' h':'')+(d.s?' s':'')+'">'+d.v+'</span>').join('')+'</div><p style="margin:0"><b>'+r.succ+' success'+(r.succ===1?'':'es')+'</b> at '+r.t+'+'+(r.mod?' ('+(r.mod>0?'+':'')+r.mod+' per die)':'')+' · '+r.sixes+' six'+(r.sixes===1?'':'es')+' · '+r.ones+' one'+(r.ones===1?'':'s')+(r.hones?' · <b>'+r.hones+' on horror dice: trauma</b>':'')+'</p>':'')+'</section>';
 // clues
 const all=Object.values(clues).sort((a,b)=>b.t-a.t);
 h+='<section class="sec"><div class="sec-head"><h2>Clues &amp; handouts</h2><span class="note">Players see revealed clues on the Journal tab.</span></div>'+
  '<label class="field"><span class="lbl">Title</span><input class="f" id="cl-title" placeholder="e.g. A torn page from the Necronomicon"></label>'+
  '<label class="field"><span class="lbl">Text</span><textarea class="f" id="cl-body" rows="3" placeholder="What they find, read or hear"></textarea></label>'+
  '<div class="row"><label class="btn sm" for="cl-img" style="display:inline-flex;align-items:center;cursor:pointer">'+(gm.clueImg?'Change picture':'Add a picture')+'</label><input type="file" id="cl-img" accept="image/*" data-gimg="1" hidden>'+(gm.clueImg?'<img src="'+gm.clueImg+'" alt="" style="height:48px;border-radius:6px"><button class="btn sm" data-gact="climgdel">Remove picture</button>':'')+
  '<label class="field"><span class="lbl">For</span><select class="f" data-gs="clueTo"><option value="all">Everyone</option>'+SLOTS.map(s=>'<option value="'+s+'"'+(gm.clueTo===s?' selected':'')+'>'+esc(chars[s].name)+' only</option>').join('')+'</select></label></div>'+
  (gm.clueTo!=='all'&&chars[gm.clueTo]&&!chars[gm.clueTo].locked?'<p class="note" style="margin:0">'+esc(chars[gm.clueTo].name)+'’s sheet has no passcode, so anyone could open this clue. It’s only private for sheets with a passcode.</p>':'')+
  '<div class="row"><button class="btn pri" data-gact="cadd" data-n="1">Reveal now</button><button class="btn" data-gact="cadd" data-n="0">Save for later</button></div>'+
  (all.length?'<div class="clues">'+all.map(c=>clueHtml(c,true)).join('')+'</div>':'')+'</section>';
 // session
 const ss=[];for(let i=Math.max(1,table.session||1);i>=1;i--)ss.push(i);
 h+='<section class="sec"><div class="sec-head"><h2>End of session</h2><span class="chip">Session '+(table.session||1)+'</span></div>'+
  '<p class="note" style="margin:0">The book suggests 1 XP per hour played, plus 1–3 for big moments. Tick <b>Momentous</b> for anyone who ended an encounter with all horror dice, took an injury of 4+, faced their past, brought their background into play, or failed badly enough to put the group at risk: they may raise their insight limit for 1 XP.</p>'+
  '<div class="row"><label class="row note" style="gap:4px">Hours played <input class="maxsel" type="number" min="0" max="12" data-gwrap="hours" value="'+(gm.wrap.hours||4)+'" style="width:60px"></label><button class="btn sm" data-gact="wrapall">Set everyone’s XP to that</button></div>'+
  wrapHtml()+'<div class="row"><button class="btn pri" data-gact="award">Award XP</button><button class="btn" data-gact="nextsession">Start session '+((table.session||1)+1)+'</button></div>'+
  '<p class="note" style="margin:0">Starting the next session refills everyone’s insight, frees habitual and lucky items, clears trauma penalties and begins a new recap.</p></section>';
 // recap
 h+='<section class="sec"><div class="sec-head"><h2>Session recap</h2></div><div class="row"><label class="field"><span class="lbl">Session</span><select class="f" data-grecap="1"><option value="">Choose…</option>'+ss.map(i=>'<option value="'+i+'"'+(historySession===i?' selected':'')+'>Session '+i+'</option>').join('')+'</select></label>'+(historySession&&histLog.length?'<button class="btn sm" data-gact="copyrecap">Copy as text</button>':'')+'</div>';
 if(historySession){
  h+='<label class="field"><span class="lbl">Summary for players (optional)</span><textarea class="f" rows="3" maxlength="2000" data-gsum="'+historySession+'" placeholder="A few sentences on what happened. Players see it in the Journal once session '+historySession+' is over.">'+esc(summaryOf(historySession))+'</textarea></label>';
  h+=histLog.length?'<div class="grid2">'+recapGroups().map(([n,a])=>'<div><span class="lbl">'+esc(n)+'</span><ul class="recap">'+a.map(x=>'<li>'+esc(x.m)+'</li>').join('')+'</ul></div>').join('')+'</div>':'<p class="note" style="margin:0">Nothing logged for session '+historySession+'. (Recaps start from when this feature was added.)</p>';}
 h+='</section>';
 // campaign
 h+='<section class="sec"><div class="sec-head"><h2>Campaign</h2><span class="note">Players can read this on the Journal tab.</span></div><label class="field" style="max-width:320px"><span class="lbl">In-game date</span><input class="f" id="cp-date" data-gcpd="1" value="'+esc(campaign.date)+'" placeholder="e.g. Friday, October 14, 1927"></label>'+campaignHtml(true)+'</section>';
 // notes
 h+='<section class="sec"><div class="sec-head"><h2>GM notes</h2><span class="note">'+(CAMP?'Private: only the GM can read these.':'Private: only the GM (and the master key) can read these.')+'</span></div><textarea class="f" id="gm-notes" data-gnotes="1" rows="8"'+(isGM()?'':' readonly')+' placeholder="Secrets, plans, NPC motives…">'+esc(gmNotes)+'</textarea></section>';
 // activity
 const g=isGM(),tf=t=>new Date(t).toLocaleString([], {weekday:'short',hour:'numeric',minute:'2-digit'});
 h+='<section class="sec"><div class="sec-head"><h2>Recent</h2><span class="note">'+(CAMP?'Only the GM sees this.':'Only the GM and the master key see this.')+'</span>'+(g&&gmLogList.length?'<button class="btn sm dng" data-gact="glclear">Clear all</button>':'')+'</div><div class="log">'+(gmLogList.length?gmLogList.map(l=>'<span class="row" style="gap:6px;flex-wrap:nowrap">'+(g?'<button class="btn sm icon" style="min-height:24px;width:24px" data-gact="gldel" data-id="'+esc(l.id)+'" aria-label="Remove this entry">\u00d7</button>':'')+'<span>'+tf(l.t)+' \u2014 '+esc(l.m)+'</span></span>').join(''):'Nothing yet.')+'</div></section>';
 return h;
}

// ---------- GM clicks and edits ----------
function gmClick(b){const a=b.dataset.gact,id=b.dataset.id,n=Number(b.dataset.n),e=id&&enemies[id];
 if(!isGM()&&!['eopen','copyrecap'].includes(a))return toast('Only the GM can change this.');
 switch(a){
  case 'fight':startFight();break;
  case 'next':nextTurn();break;
  case 'endfight':gmLog('Fight ended after '+Math.max(1,table.round)+' round'+(table.round>1?'s':''),true);saveTable({fight:false,phase:'',round:0});break;
  case 'endscene':if(table.scene)gmLog('Scene ended: '+table.scene,false);saveTable({scene:'',fight:false,phase:'',round:0});break;
  case 'eadd':if(gm.addN==='__custom'){gm.addN='';addEnemies();}else addEnemies();break;
  case 'eopen':gm.open[id]=!gm.open[id];render();break;
  case 'eshow':if(e){gmLog((e.shown?'Hid ':'Showed ')+e.n+(e.shown?' from':' to')+' the players',false);if(!e.shown)gmStory('Encountered '+e.n);updEnemy(id,{shown:!e.shown});}break;
  case 'edel':if(e){gmLog('Removed '+e.n,false);delete enemies[id];render();gmDel('enemies/'+id);}break;
  case 'eclearall':if(Object.keys(enemies).length)gmLog('Cleared all enemies',false);Object.keys(enemies).forEach(k=>gmDel('enemies/'+k));enemies={};render();break;
  case 'espend':if(e){if(e.regular>0)updEnemy(id,{regular:e.regular-1});else if(e.horror>0)updEnemy(id,{horror:e.horror-1});}break;
  case 'erefill':if(e)refillEnemy(e);break;
  case 'erefillall':Object.values(enemies).filter(x=>!x.out).forEach(x=>refillEnemy(x));break;
  case 'edmg':if(e)enemyDamage(e,1);break;
  case 'eheal':if(e&&e.limit<e.max)gmLog(e.n+' healed 1',false),updEnemy(id,{limit:e.limit+1});break;
  case 'estrain':if(e)gmLog(e.n+' strained to fight on',!!e.shown),updEnemy(id,{limit:e.max,strained:true});break;
  case 'eback':if(e)gmLog(e.n+' is back in the fight',false),updEnemy(id,{out:false,limit:Math.max(1,e.limit)});break;
  case 'emax':if(e){const m=Math.max(1,Math.min(12,e.max+n));const lim=e.limit===e.max?m:Math.min(e.limit,m);e.max=m;e.limit=lim;enemyClamp(e);updEnemy(id,{max:m,limit:e.limit,regular:e.regular,horror:e.horror});}break;
  case 'ehl':if(e)updEnemy(id,{horrorLimit:Math.max(0,Math.min(e.max,(e.horrorLimit||0)+n))});break;
  case 'eclear':if(e)updEnemy(id,{injuries:[],traumas:[]});break;
  case 'roll':rollDice();break;
  case 'cadd':addClue(n===1);break;
  case 'cshow':{const c=clues[id];if(c){c.shown=!c.shown;clueLog(c);render();gmSet('clues/'+id,{shown:c.shown},true);}break;}
  case 'cdel':if(clues[id])gmLog('Deleted clue '+clueName(clues[id]),false);delete clues[id];render();gmDel('clues/'+id);break;
  case 'climgdel':gm.clueImg='';render();break;
  case 'cpadd':{const l=b.dataset.list;campaign[l]=[...(campaign[l]||[]),{id:gmId()}];saveCampaign();break;}
  case 'cpdel':{const l=b.dataset.list;campaign[l]=(campaign[l]||[]).filter(x=>x.id!==id);saveCampaign();break;}
  case 'cpdone':campaign.threads=(campaign.threads||[]).map(x=>x.id===id?{...x,done:!x.done}:x);saveCampaign();break;
  case 'wrapall':SLOTS.forEach(s=>{gm.wrap[s]={...(gm.wrap[s]||{mom:false}),xp:gm.wrap.hours||4};});render();break;
  case 'award':awardSession();break;
  case 'nsset':{const v=(document.getElementById('gm-nsdate')||{}).value,w=((document.getElementById('gm-nswhere')||{}).value||'').trim().slice(0,80),t=v?new Date(v).getTime():NaN;
   if(!Number.isFinite(t))return toast('Pick a date and time.');if(t<Date.now()-3600000)return toast('That time has already passed.');
   setNextSession({nextSession:t,nextWhere:w,nextHours:sessionHours((document.getElementById('gm-nshours')||{}).value)}).then(()=>toast('Next session set for '+sessionWhen(t)+'.'),e=>{if(window.quotaHit&&quotaHit(e))return;toast('Couldn\u2019t save that. Try again.');});break;}
  case 'nsclear':setNextSession({nextSession:firebase.firestore.FieldValue.delete(),nextWhere:firebase.firestore.FieldValue.delete(),nextHours:firebase.firestore.FieldValue.delete()}).then(()=>toast('Next session cleared.'),e=>{if(window.quotaHit&&quotaHit(e))return;toast('Couldn\u2019t clear it. Try again.');});break;
  case 'nextsession':SLOTS.filter(gmCan).forEach(x=>R.newSession(x,true));saveTable({session:(table.session||1)+1,scene:'',fight:false,phase:'',round:0});gmLog('Session '+table.session+' started',false);gm.wrap={};toast('Session '+table.session+' started.');break;
  case 'gldel':gmLogList=gmLogList.filter(x=>x.id!==id);render();gmDel('gmlog/'+id);break;
  case 'glclear':gmLogList.forEach(x=>gmDel('gmlog/'+x.id));gmLogList=[];render();break;
  case 'copyrecap':{const t=recapText();try{navigator.clipboard.writeText(t).then(()=>toast('Recap copied.'),()=>toast('Couldn’t copy. Select the text instead.'));}catch(x){toast('Couldn’t copy. Select the text instead.');}break;}
 }
}
let notesT=null;
function gmChange(el){
 if(!isGM()&&(el.dataset.gt||el.dataset.gen||el.dataset.geinj||el.dataset.getra||el.dataset.gimg||el.dataset.gcp||el.dataset.gcpd||el.dataset.gnotes||el.dataset.gwrap)){toast('Only the GM can change this.');render();return true;}
 if(el.dataset.gs){const k=el.dataset.gs;gm[k]=el.type==='checkbox'?el.checked:el.value;render();return true;}
 if(el.dataset.gt){const k=el.dataset.gt;if(k==='scene'&&el.value.trim()&&el.value.trim()!==table.scene)gmLog('Scene: '+el.value.trim(),true);saveTable({[k]:el.type==='checkbox'?el.checked:el.value.trim()});return true;}
 if(el.dataset.gen){updEnemy(el.dataset.gen,{[el.dataset.k]:el.value});return true;}
 if(el.dataset.geinj){const e=enemies[el.dataset.geinj];if(e&&el.value){gmLog(e.n+' suffered injury: '+el.value,!!e.shown);const inj=[...e.injuries,el.value];const p={injuries:inj};if(el.value==='Comatose'||el.value==='Dire'){e.limit=0;enemyClamp(e);Object.assign(p,{limit:0,regular:e.regular,horror:e.horror});}updEnemy(e.id,p);}return true;}
 if(el.dataset.getra){const e=enemies[el.dataset.getra];if(e&&el.value)gmLog(e.n+' suffered trauma: '+el.value,!!e.shown),updEnemy(e.id,{traumas:[...e.traumas,el.value]});return true;}
 if(el.dataset.gimg){pickClueImage(el.files&&el.files[0]);el.value='';return true;}
 if(el.dataset.gcp){const l=el.dataset.gcp;campaign[l]=(campaign[l]||[]).map(x=>x.id===el.dataset.id?{...x,[el.dataset.k]:el.value}:x);saveCampaign();return true;}
 if(el.dataset.gcpd){campaign.date=el.value;saveCampaign();return true;}
 if(el.dataset.gnotes){gmNotes=el.value;gmSet('gm/notes',{text:gmNotes});return true;}
 if(el.dataset.gwrap){const s=el.dataset.gwrap;if(s==='hours'){gm.wrap.hours=Math.max(0,Number(el.value)||0);return true;}
  const x=gm.wrap[s]||(gm.wrap[s]={xp:gm.wrap.hours||4,mom:false});if(el.dataset.k==='mom')x.mom=el.checked;else x.xp=Math.max(0,Number(el.value)||0);return true;}
 if(el.dataset.jrecap){loadJournalRecap(Number(el.value));return true;}
 if(el.dataset.gsum){const n=el.dataset.gsum;campaign.summaries={...(campaign.summaries||{}),[n]:el.value.trim().slice(0,2000)};saveCampaign();toast('Summary saved.');return true;}
 if(el.dataset.grecap){if(el.value)loadRecap(Number(el.value));else{historySession=null;render();}return true;}
 return false;
}
