/* Arkham Horror RPG Ledger — Shared state: the campaign, investigators, keys/roles, local cache, and saving a sheet.
   Part of the ledger; these files load in order and share their variables. */
// Campaign mode: ?c=<campaign id> runs this ledger inside one campaign, with accounts instead of passcodes.
const CAMP=(()=>{try{const v=new URLSearchParams(location.search).get('c')||'';return /^[A-Za-z0-9]{10,40}$/.test(v)?v:null;}catch(e){return null;}})();
// The campaign kept only in this browser ("Try it without an account", js/localdb.js).
// The sample party shown on the welcome page (js/demo.js): the same in-browser store, but nothing is kept.
const IS_DEMO=!!(CAMP&&window.DEMO_CAMP&&CAMP===window.DEMO_CAMP);
const IS_LOCAL=!!(CAMP&&((window.LOCAL_CAMP&&CAMP===window.LOCAL_CAMP)||IS_DEMO));
// ?embed=1: shown inside the welcome page, without the site's header and footer.
const EMBED=IS_DEMO&&/[?&]embed=1/.test(location.search);if(EMBED){document.documentElement.classList.add('embed');document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(a&&!a.target&&!a.hasAttribute('download')&&(a.getAttribute('href')||'').charAt(0)!=='#')a.target='_top';},true);}
// No campaign in the address: go to My campaigns (STOP keeps the rest from starting).
const STOP=!CAMP;if(STOP)location.replace('./');
let camp=null,halted=null;
const TAB_KEY='apl-tab'+(CAMP?'-'+CAMP:'');
let SLOTS=CAMP?[]:['p1','p2','p3','p4'];
const MAX_SLOTS=12,slotNum=x=>parseInt(String(x).slice(1))||0,isSlotId=x=>/^p([1-9]|1[0-2])$/.test(x);
let rosterLocked=false,pendingTab=null;
const SEED={"p1": {"archetype": "Seeker", "bg": {"employment": "", "encounter": "", "enemies": "", "family": "", "lodging": "", "origin": "", "salary": "", "vehicle": ""}, "debts": "", "habitual": {"name": "Stick of Gum", "used": false}, "horror": 0, "horrorLimit": 0, "injuries": [], "insight": 1, "insightLimit": 1, "items": [{"id": "i1", "name": "Lockpicks", "note": ""}], "knacks": [{"id": "k1", "name": "Scientific", "text": "When performing a complex action using Knowledge to conduct an experiment or scientific analysis, add 1 to the result of each die rolled.", "tier": 1}, {"id": "k2", "name": "Brilliant Insight", "text": "On a complex Knowledge or Lore action that rolls two or more 6s, you or one ally within earshot immediately regains 1 insight (up to the insight limit).", "tier": 1}], "log": [{"m": "Refilled dice pool", "t": 1790404667653}, {"m": "Bought Colt Police Revolver for $30.00", "t": 1790404660204}, {"m": "Gained $5.00", "t": 1790404654074}, {"m": "Gained $5.00", "t": 1790404653898}, {"m": "Gained $5.00", "t": 1790404653348}, {"m": "Gained $5.00", "t": 1790404653206}, {"m": "Gained $5.00", "t": 1790404653058}, {"m": "Gained $5.00", "t": 1790404652874}, {"m": "Gained $5.00", "t": 1790404652540}, {"m": "Gained $5.00", "t": 1790404652315}, {"m": "Refilled dice pool", "t": 1790403386024}, {"m": "Rested: pool limit restored", "t": 1790403188043}], "money": 13.75, "name": "Wallace Morrow", "negative": "", "personality": "", "player": "Dan", "poolLimit": 6, "poolMax": 6, "positive": "", "regular": 6, "relics": "", "reloads": 4, "skills": {"agility": {"max": "", "r": 6}, "athletics": {"max": "", "r": 6}, "intuition": {"max": "", "r": 6}, "knowledge": {"max": "2", "r": 5}, "lore": {"max": "3", "r": 5}, "melee": {"max": "", "r": 6}, "presence": {"max": "", "r": 6}, "ranged": {"max": "3", "r": 4}, "resolve": {"max": "", "r": 5}, "wits": {"max": "3", "r": 5}}, "tomes": "", "traumaMod": 0, "traumas": [], "weapons": [{"ammo": 2, "ammoMax": 2, "dmg": "2", "id": "w1", "inj": "3", "name": "Colt 1911 Pistol", "range": "75 ft", "rc": 1, "skill": "Ranged Combat", "special": "None"}, {"ammo": 0, "ammoMax": 0, "dmg": "1", "id": "w2", "inj": "4", "name": "Pocketknife", "range": "Engaged", "skill": "Melee Combat", "special": "Very Hard to Find (3 successes to spot)"}], "xpTotal": 12, "xpUnused": 7}, "p2": {"archetype": "", "bg": {"employment": "", "encounter": "", "enemies": "", "family": "", "lodging": "", "origin": "", "salary": "", "vehicle": ""}, "debts": "", "habitual": {"name": "", "used": false}, "horror": 0, "horrorLimit": 0, "injuries": [], "insight": 1, "insightLimit": 1, "items": [], "knacks": [], "log": [{"m": "Refilled dice pool", "t": 1790404667655}, {"m": "Refilled dice pool", "t": 1790403386025}], "money": 0, "name": "Investigator 2", "negative": "", "personality": "", "player": "", "poolLimit": 6, "poolMax": 6, "positive": "", "regular": 6, "relics": "", "reloads": 0, "skills": {"agility": {"max": "", "r": 6}, "athletics": {"max": "", "r": 6}, "intuition": {"max": "", "r": 6}, "knowledge": {"max": "", "r": 6}, "lore": {"max": "", "r": 6}, "melee": {"max": "", "r": 6}, "presence": {"max": "", "r": 6}, "ranged": {"max": "", "r": 6}, "resolve": {"max": "", "r": 6}, "wits": {"max": "", "r": 6}}, "tomes": "", "traumaMod": 0, "traumas": [], "weapons": [], "xpTotal": 0, "xpUnused": 0}, "p3": {"archetype": "", "bg": {"employment": "", "encounter": "", "enemies": "", "family": "", "lodging": "", "origin": "", "salary": "", "vehicle": ""}, "debts": "", "habitual": {"name": "", "used": false}, "horror": 0, "horrorLimit": 0, "injuries": [], "insight": 1, "insightLimit": 1, "items": [], "knacks": [], "log": [{"m": "Refilled dice pool", "t": 1790404667656}, {"m": "Refilled dice pool", "t": 1790403386025}], "money": 0, "name": "Investigator 3", "negative": "", "personality": "", "player": "", "poolLimit": 6, "poolMax": 6, "positive": "", "regular": 6, "relics": "", "reloads": 0, "skills": {"agility": {"max": "", "r": 6}, "athletics": {"max": "", "r": 6}, "intuition": {"max": "", "r": 6}, "knowledge": {"max": "", "r": 6}, "lore": {"max": "", "r": 6}, "melee": {"max": "", "r": 6}, "presence": {"max": "", "r": 6}, "ranged": {"max": "", "r": 6}, "resolve": {"max": "", "r": 6}, "wits": {"max": "", "r": 6}}, "tomes": "", "traumaMod": 0, "traumas": [], "weapons": [], "xpTotal": 0, "xpUnused": 0}, "p4": {"archetype": "", "bg": {"employment": "", "encounter": "", "enemies": "", "family": "", "lodging": "", "origin": "", "salary": "", "vehicle": ""}, "debts": "", "habitual": {"name": "", "used": false}, "horror": 0, "horrorLimit": 0, "injuries": [], "insight": 1, "insightLimit": 1, "items": [], "knacks": [], "log": [{"m": "Refilled dice pool", "t": 1790404667656}, {"m": "Refilled dice pool", "t": 1790403386026}], "money": 0, "name": "Investigator 4", "negative": "", "personality": "", "player": "", "poolLimit": 6, "poolMax": 6, "positive": "", "regular": 6, "relics": "", "reloads": 0, "skills": {"agility": {"max": "", "r": 6}, "athletics": {"max": "", "r": 6}, "intuition": {"max": "", "r": 6}, "knowledge": {"max": "", "r": 6}, "lore": {"max": "", "r": 6}, "melee": {"max": "", "r": 6}, "presence": {"max": "", "r": 6}, "ranged": {"max": "", "r": 6}, "resolve": {"max": "", "r": 6}, "wits": {"max": "", "r": 6}}, "tomes": "", "traumaMod": 0, "traumas": [], "weapons": [], "xpTotal": 0, "xpUnused": 0}};
// Names from the book stay in English in the code and on the sheets (tk marks them for translating); pages show them with t().
const SKILLS=[['agility',tk('Agility')],['athletics',tk('Athletics')],['wits',tk('Wits')],['presence',tk('Presence')],['intuition',tk('Intuition')],['knowledge',tk('Knowledge')],['resolve',tk('Resolve')],['melee',tk('Melee Combat')],['ranged',tk('Ranged Combat')],['lore',tk('Lore')]];
const ARCH=[tk('Adventurer'),tk('Believer'),tk('Guardian'),tk('Hunter'),tk('Mystic'),tk('Rogue'),tk('Seeker'),tk('Survivor')];
const SKILL_COST={6:2,5:4,4:7,3:12};
const KNACK_COST={1:3,2:6,3:10,4:15};
const KNACK_CAP={1:3,2:2,3:2,4:1};
// Multiclassing (book p. 67): after 125 XP spent, 20 XP buys +1 dice pool maximum and either a second archetype
// (its knacks and skill limits too) or extra knacks in the same archetype (2 more tier 1, 1 more of tiers 2-4).
// c.mc = {arch} where arch is the second archetype, or the character's own archetype for "stay".
const MC_AT=125,MC_COST=20,MC_EXTRA={1:2,2:1,3:1,4:1};
const xpSpent=c=>Math.max(0,(Number(c.xpTotal)||0)-(Number(c.xpUnused)||0));
const mcArch=c=>c&&c.mc&&c.mc.arch&&c.mc.arch!==c.archetype?c.mc.arch:'';   // second archetype, if any
const mcSame=c=>!!(c&&c.mc&&c.mc.arch&&c.mc.arch===c.archetype);           // multiclassed within their own archetype
const archLabel=c=>[c.archetype,mcArch(c)].filter(Boolean).map(a=>t(a)).join(' / ');
// Which of the investigator's archetypes a knack belongs to (older knacks don't say; the first archetype wins ties).
function knackArch(c,k){if(k.arch)return k.arch;const m=mcArch(c);if(m&&!A.knacksFor(c.archetype).some(x=>x.name===k.name)&&A.knacksFor(m).some(x=>x.name===k.name))return m;return c.archetype;}
// How many knacks of this tier the investigator may have from that archetype.
function knackCap(c,tier,arch){return KNACK_CAP[tier]+(mcSame(c)&&arch===c.archetype?MC_EXTRA[tier]:0);}
// Skill "max" from every archetype the investigator has (the better limit wins).
function archMax(c,k,first){const a=[first||c.archetype,mcArch(c)].filter(Boolean);const f=a.length?Math.min(...a.map(x=>A.maxFor(x,k))):4;return f<4?String(f):'';}
const INJURIES=[null,
 [tk('Heavy Blow'),tk('Knocked prone. Next turn, spend 1 die to clear your head before any other action.')],
 [tk('Slowed'),tk('You move at half speed.')],
 [tk('Nasty Cut'),tk('Bleeding. Your pool limit can’t rise (rest, healing or straining) until healed.')],
 [tk('Concussed'),tk('−1 on each die for complex actions with Wits, Intuition, Knowledge or Lore.')],
 [tk('Injured Arm'),tk('Simple actions with that arm become complex; −1 per die on Athletics, Agility, Ranged and Melee.')],
 [tk('Injured Leg'),tk('Simple actions with that leg (moving too) become complex; −1 per die on Athletics, Agility and Melee.')],
 [tk('Loss of a Sense'),tk('Lose sight, smell or hearing (1d3). Takes 2 successes to heal.')],
 [tk('Severely Injured'),tk('−2 on each die for every complex action. Takes 2 successes to heal.')],
 [tk('Comatose'),tk('Pool limit drops to 0 until healed. Takes 2 successes to heal.')],
 [tk('Dire'),tk('Pool limit drops to 0. Takes 3 successes to heal. Without medical care within an hour, you die.')],
 [tk('Dead'),tk('You are dead — unless you permanently lower your insight limit by 2 to survive.')]];
// Unique injuries (Additional Rules): they come from fire, lack of air, poison or disease, never from a roll on the table.
// They still add 1 to later injury rolls; a third instance of the same one kills.
const UNIQUE_INJURIES=[
 [tk('Burned'),tk('All complex actions with disadvantage. Each 1 you roll on a complex action discards a die from your pool afterward.')],
 [tk('Choking'),tk('Simple actions cost 2 dice. Every complex action is difficult. Another one each turn (or minute) you still can’t breathe.')],
 [tk('Sickened'),tk('Before each complex action, roll 1d3: that’s the most dice you can spend on it.')]];
// Effect text for any injury, from the table or unique.
function injuryInfo(nm){return INJURIES.find(x=>x&&x[0]===nm)||UNIQUE_INJURIES.find(x=>x[0]===nm)||null;}
const isUniqueInjury=nm=>UNIQUE_INJURIES.some(x=>x[0]===nm);
// Options for an injury picker: the table by roll result, then the unique ones.
function injuryOptions(){return INJURIES.slice(1).map((x,i)=>'<option value="'+esc(x[0])+'">'+(i===10?'11+':i+1)+' · '+esc(t(x[0]))+'</option>').join('')+
 '<optgroup label="'+t('Unique (fire, air, poison or disease)')+'">'+UNIQUE_INJURIES.map(x=>'<option value="'+esc(x[0])+'">'+esc(t(x[0]))+'</option>').join('')+'</optgroup>';}
function injuryFor(n){return INJURIES[Math.min(Math.max(n,1),11)];}
function traumaFor(n){
 if(n<=2)return[tk('Subtle Strangeness'),tk('Something odd at the edge of your senses. No further effect.')];
 if(n===3)return[tk('Shocked'),tk('Discard 1 die. If you have none, add 1 to trauma rolls for the rest of the session.')];
 if(n===4)return[tk('Stunned'),tk('Discard all dice. If you have none, add 1 to trauma rolls for the rest of the session.')];
 if(n<=7)return[tk('Overcome by Horror'),tk('Spend 1 insight or trigger the negative side of your personality trait.')];
 if(n<=10)return[tk('Mind Undone'),tk('Spend 2 insight or trigger your negative trait, with its effects lasting longer. Add 1 to trauma rolls for the rest of the session.')];
 return[tk('Lost Forever'),tk('Your investigator is lost — unless you permanently lower your insight limit by 2 to survive.')];
}
const TRAUMA_AT={'Subtle Strangeness':1,'Shocked':3,'Stunned':4,'Overcome by Horror':5,'Mind Undone':8,'Lost Forever':11};
const TRAUMA_ROLL={'Subtle Strangeness':'1–2','Shocked':'3','Stunned':'4','Overcome by Horror':'5–7','Mind Undone':'8–10','Lost Forever':'11+'};
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'$'+(Number(v)||0).toFixed(2);
const d6=()=>1+Math.floor(Math.random()*6);

function blank(i){
 const skills={};SKILLS.forEach(([k])=>skills[k]={r:6,max:''});
 return {name:t('Investigator {n}',{n:i}),player:'',archetype:'',personality:'',positive:'',negative:'',xpTotal:0,xpUnused:0,skills,
  poolMax:6,poolLimit:6,regular:6,horror:0,horrorLimit:0,insightLimit:1,insight:1,
  injuries:[],traumas:[],traumaMod:0,knacks:[],weapons:[],kits:[],mc:null,trash:[],money:0,items:[],habitual:{name:'',used:false,uses:0},lucky:{name:'',used:false},reloads:0,
  bg:{origin:'',family:'',employment:'',salary:'',encounter:'',enemies:'',vehicle:'',lodging:''},tomes:'',relics:'',debts:'',log:[]};
}
function norm(c,i){const b=blank(i);const o=Object.assign(b,c||{});
 // An injury or trauma saved as a bare name becomes a proper entry.
 ['injuries','traumas'].forEach(k=>{o[k]=(Array.isArray(o[k])?o[k]:[]).map(j=>typeof j==='string'?{id:uid(),name:j,note:''}:j).filter(j=>j&&j.name);});o.skills=Object.assign(blank(i).skills,o.skills||{});o.bg=Object.assign(blank(i).bg,o.bg||{});o.habitual=Object.assign({name:'',used:false},o.habitual||{});if(typeof o.habitual.uses!=='number')o.habitual.uses=o.habitual.name?1:0;o.lucky=Object.assign({name:'',used:false},o.lucky||{});
 o.weapons=(o.weapons||[]).map(w=>({...w}));
 o.kits=(o.kits||[]).map(k=>({...k}));
 // equipment bought before it had a description gets the catalog's one
 o.items=(o.items||[]).map(it=>it&&!it.note&&window.APL?{...it,note:(window.APL.GEAR.find(g=>g.n===it.name)||{}).note||''}:it);
 o.knacks=(o.knacks||[]).map(k=>k.text||!window.APL?k:{...k,text:window.APL.knackText(k.name)});
 if(o.reloads>0&&!o.weapons.some(w=>typeof w.reloads==='number')){const g=o.weapons.find(w=>Number(w.ammoMax)>0&&!w.fr);if(g){g.reloads=o.reloads;o.reloads=0;legacyRel.add('p'+i);}}
 o.weapons.forEach(w=>{if(typeof w.reloads!=='number')w.reloads=0;});
 return o;}
const legacyRel=new Set();

let db=null, chars={}, active='party', pending=false, localMode=false, authUid=null;
const keys={};// slot, 'master' or 'gm' -> this device holds a key
// fields the GM PIN may change on any sheet (XP awards, session start, pool refills)
const GM_FIELDS=['xpTotal','xpUnused','insightChance','insight','habitual','lucky','traumaMod','regular','horror','log'];
let gmClaimed=false;
const gmCan=s=>canEdit(s)||isGM();
// In a campaign the owner's extra powers (editing every sheet, deleting Recent entries) follow the Settings switch.
const ownerEditsOn=()=>!CAMP||!!(camp&&camp.ownerEdits===true); // off unless the owner turns it on in Settings
// The GM edits every sheet only while the owner has ticked "Let the GM edit every investigator" in Settings.
const gmEditsOn=()=>!!(CAMP&&camp&&camp.gmEdits===true&&camp.gmUid&&camp.gmUid===authUid);
// Owner or GM with full edit rights over other players' sheets.
const fullEdit=()=>(!!keys.master&&ownerEditsOn())||gmEditsOn();
function canEdit(s){if(!db&&localMode)return true;if(CAMP){const c=chars[s];return fullEdit()||!!(c&&c.ownerUid&&c.ownerUid===authUid);}const c=chars[s];return !(c&&c.locked)||!!keys[s]||!!keys.master;}
let lastRoll={};
let kpickSel={},pickSel={},xpAmt={};
// Last-seen party, kept on this device so a refresh shows the sheets right away while Firebase reconnects.
const CACHE_KEY='apl-cache-v1'+(CAMP?'-'+CAMP:'');
let CACHED=null;
try{const k=IS_DEMO?null:JSON.parse(localStorage.getItem(CACHE_KEY)||'null');CACHED=k;
 if(CAMP&&k&&k.camp&&k.uid){camp=k.camp;authUid=k.uid;}
 if(k&&Array.isArray(k.slots)&&k.slots.length&&k.slots.every(isSlotId)){SLOTS=k.slots;SLOTS.forEach(x=>{if(k.chars&&k.chars[x])chars[x]=norm(k.chars[x],slotNum(x));});(k.keys||[]).forEach(x=>keys[x]=true);gmClaimed=!!k.gm;}}catch(e){}
let cacheT;
function saveCache(){if(IS_DEMO)return;clearTimeout(cacheT);cacheT=setTimeout(()=>{const d={slots:SLOTS,chars:{},keys:Object.keys(keys).filter(k=>keys[k]),gm:gmClaimed,table,house,...(CAMP?{camp,uid:authUid}:{})};SLOTS.forEach(x=>d.chars[x]=chars[x]);
 try{localStorage.setItem(CACHE_KEY,JSON.stringify(d));}catch(e){try{SLOTS.forEach(x=>d.chars[x]={...chars[x],portrait:''});localStorage.setItem(CACHE_KEY,JSON.stringify(d));}catch(e2){}}},400);}
try{const t=IS_DEMO?null:localStorage.getItem(TAB_KEY);if(t&&(t==='party'||t==='create'||t==='journal'||t==='gm'||SLOTS.includes(t)))active=t;else if(t&&isSlotId(t))pendingTab=t;}catch(e){}
SLOTS.forEach(s=>{if(!chars[s])chars[s]=blank(slotNum(s));});

const toastEl=document.getElementById('toast');let toastT;
function toast(m){toastEl.textContent=m;toastEl.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>toastEl.hidden=true,2600);}

// Recent-list entries are saved in English (m) along with their wording and values (k, v; o is a plural's singular),
// so everyone in the party reads them in their own language: logm('Earned {n} XP',{n:3}), logn(one, other, n, values).
const fillEn=(s,v)=>String(s).replace(/\|[^|]*$/,'').replace(/\{(\w+)\}/g,(x,k)=>v&&v[k]!=null?v[k]:x);
function logm(k,v){v=v||{};return {m:fillEn(k,v),k,v};}
function logn(one,other,n,v){v={...(v||{}),n};return {m:fillEn(n===1?one:other,v),k:other,o:one,v};}
// values that name something from the book (a skill, knack, injury, item…) are translated too
const LOG_NAMES=['skill','knack','injury','trauma','item','weapon','src','trait','who','clue'];
// "Cultist 2": a name from the book with a number after it
function nameT(s){const m=/^(.+?)( \d+)$/.exec(String(s||''));return m?t(m[1])+m[2]:t(String(s||''));}
// "by Dan (GM)" for Recent entries the GM or campaign owner made on someone else's investigator.
function logBy(e){const b=e&&e.by;if(!b||!b.r)return '';const n=b.n||'';
 return b.r==='gm'?(n?t('by {name} (GM)',{name:n}):t('by the GM')):(n?t('by {name} (owner)',{name:n}):t('by the campaign owner'));}
function logText(e){if(!e)return '';if(Array.isArray(e.p))return e.p.map(logText).join(' · ');
 if(e.k){const v={...(e.v||{})};LOG_NAMES.forEach(x=>{if(typeof v[x]==='string')v[x]=t(v[x]);});if(typeof v.enemy==='string')v.enemy=nameT(v.enemy);return e.o?tn(e.o,e.k,Number(v.n),v):t(e.k,v);}
 return t(e.m||'');}
// Recent keeps this many entries per investigator and shows LOG_SHOW at a time ("Show more" for the rest).
const LOG_KEEP=100,LOG_SHOW=10;let logShown={};
// Full history per investigator, read from the session history only when opened: {open,loading,err,list}.
let fullHist={};
// Entries the owner or GM deletes vanish everywhere (Recent, Full history, recaps). They wait in c.trash for
// TRASH_DAYS so they can be undone, then their session-history copies are erased for good.
const TRASH_DAYS=7;
const histAlive=x=>!!x&&!x.gone;
// Older entries were stamped a moment apart in Recent and in the session history, so match loosely.
const sameEntry=(a,b)=>!!a&&!!b&&(a.t===b.t||(Math.abs(a.t-b.t)<=3000&&String(a.m||'')===String(b.m||'')));
async function save(slot,patch,logMsg){
 if(!canEdit(slot)&&!(isGM()&&Object.keys(patch).every(k=>GM_FIELDS.includes(k)))){toast(CAMP?t('Only {name}’s player can change that.',{name:chars[slot].name||t('this investigator')}):t('{name}’s sheet is locked. Unlock it to make changes.',{name:chars[slot].name}));return;}
 const c=chars[slot];
 if(patch.weapons&&legacyRel.has(slot)){patch.reloads=0;legacyRel.delete(slot);}
 Object.assign(c,patch);
 if(Array.isArray(logMsg))logMsg=logMsg.length?{m:logMsg.map(x=>x.m).join(' · '),p:logMsg}:null;else if(typeof logMsg==='string')logMsg=logMsg?{m:logMsg}:null;
 // In a campaign, an entry made by someone other than the investigator's player says who: the GM or the owner.
 if(logMsg&&CAMP&&camp&&authUid&&c.ownerUid!==authUid){const r=camp.gmUid===authUid?'gm':camp.ownerUid===authUid?'owner':null;
  if(r)logMsg={...logMsg,by:{r,n:String(((camp.names||{})[authUid])||'').slice(0,40)}};}
 if(logMsg){const now=Date.now();c.log=[{t:now,...logMsg},...(c.log||[])].slice(0,LOG_KEEP);patch.log=c.log;logHistory(slot,{...logMsg,t:now});}
 render();
 if(!db)return;
 try{await db.doc('characters/'+slot).update(patch);}
 catch(e){
  try{await db.doc('characters/'+slot).set(JSON.parse(JSON.stringify(c)));}catch(e2){if(window.quotaHit&&quotaHit(e2))return;toast(e2&&e2.code==='permission-denied'?t('That sheet’s passcode has changed. Unlock it again to edit.'):t('Couldn’t save that change. Check your connection and try again.'));}
 }
}
