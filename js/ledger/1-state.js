/* Arkham Ledger — Shared state: the campaign, investigators, keys/roles, local cache, and saving a sheet.
   Part of the ledger; these files load in order and share their variables. */
// Campaign mode: ?c=<campaign id> runs this ledger inside one campaign, with accounts instead of passcodes.
const CAMP=(()=>{try{const v=new URLSearchParams(location.search).get('c')||'';return /^[A-Za-z0-9]{10,40}$/.test(v)?v:null;}catch(e){return null;}})();
// No campaign in the address: go to My campaigns (STOP keeps the rest from starting).
const STOP=!CAMP;if(STOP)location.replace('./');
let camp=null,halted=null;
const TAB_KEY='apl-tab'+(CAMP?'-'+CAMP:'');
let SLOTS=CAMP?[]:['p1','p2','p3','p4'];
const MAX_SLOTS=12,slotNum=x=>parseInt(String(x).slice(1))||0,isSlotId=x=>/^p([1-9]|1[0-2])$/.test(x);
let rosterLocked=false,pendingTab=null;
const SEED={"p1": {"archetype": "Seeker", "bg": {"employment": "", "encounter": "", "enemies": "", "family": "", "lodging": "", "origin": "", "salary": "", "vehicle": ""}, "debts": "", "habitual": {"name": "Stick of Gum", "used": false}, "horror": 0, "horrorLimit": 0, "injuries": [], "insight": 1, "insightLimit": 1, "items": [{"id": "i1", "name": "Lockpicks", "note": ""}], "knacks": [{"id": "k1", "name": "Scientific", "text": "When performing a complex action using Knowledge to conduct an experiment or scientific analysis, add 1 to the result of each die rolled.", "tier": 1}, {"id": "k2", "name": "Brilliant Insight", "text": "On a complex Knowledge or Lore action that rolls two or more 6s, you or one ally within earshot immediately regains 1 insight (up to the insight limit).", "tier": 1}], "log": [{"m": "Refilled dice pool", "t": 1790404667653}, {"m": "Bought Colt Police Revolver for $30.00", "t": 1790404660204}, {"m": "Gained $5.00", "t": 1790404654074}, {"m": "Gained $5.00", "t": 1790404653898}, {"m": "Gained $5.00", "t": 1790404653348}, {"m": "Gained $5.00", "t": 1790404653206}, {"m": "Gained $5.00", "t": 1790404653058}, {"m": "Gained $5.00", "t": 1790404652874}, {"m": "Gained $5.00", "t": 1790404652540}, {"m": "Gained $5.00", "t": 1790404652315}, {"m": "Refilled dice pool", "t": 1790403386024}, {"m": "Rested: pool limit restored", "t": 1790403188043}], "money": 13.75, "name": "Wallace Morrow", "negative": "", "personality": "", "player": "Dan", "poolLimit": 6, "poolMax": 6, "positive": "", "regular": 6, "relics": "", "reloads": 4, "skills": {"agility": {"max": "", "r": 6}, "athletics": {"max": "", "r": 6}, "intuition": {"max": "", "r": 6}, "knowledge": {"max": "2", "r": 5}, "lore": {"max": "3", "r": 5}, "melee": {"max": "", "r": 6}, "presence": {"max": "", "r": 6}, "ranged": {"max": "3", "r": 4}, "resolve": {"max": "", "r": 5}, "wits": {"max": "3", "r": 5}}, "tomes": "", "traumaMod": 0, "traumas": [], "weapons": [{"ammo": 2, "ammoMax": 2, "dmg": "2", "id": "w1", "inj": "3", "name": "Colt 1911 Pistol", "range": "75 ft", "rc": 1, "skill": "Ranged Combat", "special": "None"}, {"ammo": 0, "ammoMax": 0, "dmg": "1", "id": "w2", "inj": "4", "name": "Pocketknife", "range": "Engaged", "skill": "Melee Combat", "special": "Very Hard to Find (3 successes to spot)"}], "xpTotal": 12, "xpUnused": 7}, "p2": {"archetype": "", "bg": {"employment": "", "encounter": "", "enemies": "", "family": "", "lodging": "", "origin": "", "salary": "", "vehicle": ""}, "debts": "", "habitual": {"name": "", "used": false}, "horror": 0, "horrorLimit": 0, "injuries": [], "insight": 1, "insightLimit": 1, "items": [], "knacks": [], "log": [{"m": "Refilled dice pool", "t": 1790404667655}, {"m": "Refilled dice pool", "t": 1790403386025}], "money": 0, "name": "Investigator 2", "negative": "", "personality": "", "player": "", "poolLimit": 6, "poolMax": 6, "positive": "", "regular": 6, "relics": "", "reloads": 0, "skills": {"agility": {"max": "", "r": 6}, "athletics": {"max": "", "r": 6}, "intuition": {"max": "", "r": 6}, "knowledge": {"max": "", "r": 6}, "lore": {"max": "", "r": 6}, "melee": {"max": "", "r": 6}, "presence": {"max": "", "r": 6}, "ranged": {"max": "", "r": 6}, "resolve": {"max": "", "r": 6}, "wits": {"max": "", "r": 6}}, "tomes": "", "traumaMod": 0, "traumas": [], "weapons": [], "xpTotal": 0, "xpUnused": 0}, "p3": {"archetype": "", "bg": {"employment": "", "encounter": "", "enemies": "", "family": "", "lodging": "", "origin": "", "salary": "", "vehicle": ""}, "debts": "", "habitual": {"name": "", "used": false}, "horror": 0, "horrorLimit": 0, "injuries": [], "insight": 1, "insightLimit": 1, "items": [], "knacks": [], "log": [{"m": "Refilled dice pool", "t": 1790404667656}, {"m": "Refilled dice pool", "t": 1790403386025}], "money": 0, "name": "Investigator 3", "negative": "", "personality": "", "player": "", "poolLimit": 6, "poolMax": 6, "positive": "", "regular": 6, "relics": "", "reloads": 0, "skills": {"agility": {"max": "", "r": 6}, "athletics": {"max": "", "r": 6}, "intuition": {"max": "", "r": 6}, "knowledge": {"max": "", "r": 6}, "lore": {"max": "", "r": 6}, "melee": {"max": "", "r": 6}, "presence": {"max": "", "r": 6}, "ranged": {"max": "", "r": 6}, "resolve": {"max": "", "r": 6}, "wits": {"max": "", "r": 6}}, "tomes": "", "traumaMod": 0, "traumas": [], "weapons": [], "xpTotal": 0, "xpUnused": 0}, "p4": {"archetype": "", "bg": {"employment": "", "encounter": "", "enemies": "", "family": "", "lodging": "", "origin": "", "salary": "", "vehicle": ""}, "debts": "", "habitual": {"name": "", "used": false}, "horror": 0, "horrorLimit": 0, "injuries": [], "insight": 1, "insightLimit": 1, "items": [], "knacks": [], "log": [{"m": "Refilled dice pool", "t": 1790404667656}, {"m": "Refilled dice pool", "t": 1790403386026}], "money": 0, "name": "Investigator 4", "negative": "", "personality": "", "player": "", "poolLimit": 6, "poolMax": 6, "positive": "", "regular": 6, "relics": "", "reloads": 0, "skills": {"agility": {"max": "", "r": 6}, "athletics": {"max": "", "r": 6}, "intuition": {"max": "", "r": 6}, "knowledge": {"max": "", "r": 6}, "lore": {"max": "", "r": 6}, "melee": {"max": "", "r": 6}, "presence": {"max": "", "r": 6}, "ranged": {"max": "", "r": 6}, "resolve": {"max": "", "r": 6}, "wits": {"max": "", "r": 6}}, "tomes": "", "traumaMod": 0, "traumas": [], "weapons": [], "xpTotal": 0, "xpUnused": 0}};
const SKILLS=[['agility','Agility'],['athletics','Athletics'],['wits','Wits'],['presence','Presence'],['intuition','Intuition'],['knowledge','Knowledge'],['resolve','Resolve'],['melee','Melee Combat'],['ranged','Ranged Combat'],['lore','Lore']];
const ARCH=['Adventurer','Believer','Guardian','Hunter','Mystic','Rogue','Seeker','Survivor'];
const SKILL_COST={6:2,5:4,4:7,3:12};
const KNACK_COST={1:3,2:6,3:10,4:15};
const KNACK_CAP={1:3,2:2,3:2,4:1};
const INJURIES=[null,
 ['Heavy Blow','Knocked prone. Next turn, spend 1 die to clear your head before any other action.'],
 ['Slowed','You move at half speed.'],
 ['Nasty Cut','Bleeding. Your pool limit can’t rise (rest, healing or straining) until healed.'],
 ['Concussed','−1 on each die for complex actions with Wits, Intuition, Knowledge or Lore.'],
 ['Injured Arm','Simple actions with that arm become complex; −1 per die on Athletics, Agility, Ranged and Melee.'],
 ['Injured Leg','Simple actions with that leg (moving too) become complex; −1 per die on Athletics, Agility and Melee.'],
 ['Loss of a Sense','Lose sight, smell or hearing (1d3). Takes 2 successes to heal.'],
 ['Severely Injured','−2 on each die for every complex action. Takes 2 successes to heal.'],
 ['Comatose','Pool limit drops to 0 until healed. Takes 2 successes to heal.'],
 ['Dire','Pool limit drops to 0. Takes 3 successes to heal. Without medical care within an hour, you die.'],
 ['Dead','You are dead — unless you permanently lower your insight limit by 2 to survive.']];
function injuryFor(n){return INJURIES[Math.min(Math.max(n,1),11)];}
function traumaFor(n){
 if(n<=2)return['Subtle Strangeness','Something odd at the edge of your senses. No further effect.'];
 if(n===3)return['Shocked','Discard 1 die. If you have none, add 1 to trauma rolls for the rest of the session.'];
 if(n===4)return['Stunned','Discard all dice. If you have none, add 1 to trauma rolls for the rest of the session.'];
 if(n<=7)return['Overcome by Horror','Spend 1 insight or trigger the negative side of your personality trait.'];
 if(n<=10)return['Mind Undone','Spend 2 insight or trigger your negative trait, with its effects lasting longer. Add 1 to trauma rolls for the rest of the session.'];
 return['Lost Forever','Your investigator is lost — unless you permanently lower your insight limit by 2 to survive.'];
}
const TRAUMA_AT={'Subtle Strangeness':1,'Shocked':3,'Stunned':4,'Overcome by Horror':5,'Mind Undone':8,'Lost Forever':11};
const TRAUMA_ROLL={'Subtle Strangeness':'1–2','Shocked':'3','Stunned':'4','Overcome by Horror':'5–7','Mind Undone':'8–10','Lost Forever':'11+'};
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'$'+(Number(v)||0).toFixed(2);
const d6=()=>1+Math.floor(Math.random()*6);

function blank(i){
 const skills={};SKILLS.forEach(([k])=>skills[k]={r:6,max:''});
 return {name:'Investigator '+i,player:'',archetype:'',personality:'',positive:'',negative:'',xpTotal:0,xpUnused:0,skills,
  poolMax:6,poolLimit:6,regular:6,horror:0,horrorLimit:0,insightLimit:1,insight:1,
  injuries:[],traumas:[],traumaMod:0,knacks:[],weapons:[],money:0,items:[],habitual:{name:'',used:false,uses:0},lucky:{name:'',used:false},reloads:0,
  bg:{origin:'',family:'',employment:'',salary:'',encounter:'',enemies:'',vehicle:'',lodging:''},tomes:'',relics:'',debts:'',log:[]};
}
function norm(c,i){const b=blank(i);const o=Object.assign(b,c||{});o.skills=Object.assign(blank(i).skills,o.skills||{});o.bg=Object.assign(blank(i).bg,o.bg||{});o.habitual=Object.assign({name:'',used:false},o.habitual||{});if(typeof o.habitual.uses!=='number')o.habitual.uses=o.habitual.name?1:0;o.lucky=Object.assign({name:'',used:false},o.lucky||{});
 o.weapons=(o.weapons||[]).map(w=>({...w}));
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
function canEdit(s){if(!db&&localMode)return true;if(CAMP){const c=chars[s];return (!!keys.master&&!(camp&&camp.ownerEdits===false))||!!(c&&c.ownerUid&&c.ownerUid===authUid);}const c=chars[s];return !(c&&c.locked)||!!keys[s]||!!keys.master;}
let lastRoll={};
let kpickSel={},pickSel={},xpAmt={};
// Last-seen party, kept on this device so a refresh shows the sheets right away while Firebase reconnects.
const CACHE_KEY='apl-cache-v1'+(CAMP?'-'+CAMP:'');
let CACHED=null;
try{const k=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');CACHED=k;
 if(CAMP&&k&&k.camp&&k.uid){camp=k.camp;authUid=k.uid;}
 if(k&&Array.isArray(k.slots)&&k.slots.length&&k.slots.every(isSlotId)){SLOTS=k.slots;SLOTS.forEach(x=>{if(k.chars&&k.chars[x])chars[x]=norm(k.chars[x],slotNum(x));});(k.keys||[]).forEach(x=>keys[x]=true);gmClaimed=!!k.gm;}}catch(e){}
let cacheT;
function saveCache(){clearTimeout(cacheT);cacheT=setTimeout(()=>{const d={slots:SLOTS,chars:{},keys:Object.keys(keys).filter(k=>keys[k]),gm:gmClaimed,table,house,...(CAMP?{camp,uid:authUid}:{})};SLOTS.forEach(x=>d.chars[x]=chars[x]);
 try{localStorage.setItem(CACHE_KEY,JSON.stringify(d));}catch(e){try{SLOTS.forEach(x=>d.chars[x]={...chars[x],portrait:''});localStorage.setItem(CACHE_KEY,JSON.stringify(d));}catch(e2){}}},400);}
try{const t=localStorage.getItem(TAB_KEY);if(t&&(t==='party'||t==='create'||t==='journal'||t==='gm'||SLOTS.includes(t)))active=t;else if(t&&isSlotId(t))pendingTab=t;}catch(e){}
SLOTS.forEach(s=>{if(!chars[s])chars[s]=blank(slotNum(s));});

const toastEl=document.getElementById('toast');let toastT;
function toast(m){toastEl.textContent=m;toastEl.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>toastEl.hidden=true,2600);}

async function save(slot,patch,logMsg){
 if(!canEdit(slot)&&!(isGM()&&Object.keys(patch).every(k=>GM_FIELDS.includes(k)))){toast(CAMP?'Only '+(chars[slot].name||'this investigator')+'\u2019s player can change that.':chars[slot].name+'’s sheet is locked. Unlock it to make changes.');return;}
 const c=chars[slot];
 if(patch.weapons&&legacyRel.has(slot)){patch.reloads=0;legacyRel.delete(slot);}
 Object.assign(c,patch);
 if(logMsg){c.log=[{t:Date.now(),m:logMsg},...(c.log||[])].slice(0,12);patch.log=c.log;logHistory(slot,logMsg);}
 render();
 if(!db)return;
 try{await db.doc('characters/'+slot).update(patch);}
 catch(e){
  try{await db.doc('characters/'+slot).set(JSON.parse(JSON.stringify(c)));}catch(e2){if(window.quotaHit&&quotaHit(e2))return;toast(e2&&e2.code==='permission-denied'?'That sheet’s passcode has changed. Unlock it again to edit.':'Couldn’t save that change. Check your connection and try again.');}
 }
}
