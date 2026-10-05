/* Arkham Ledger — Drawing the page: tabs, party, investigator sheets, pickers, house rules.
   Part of the ledger; these files load in order and share their variables. */
// ---------- render ----------
function sheetStatus(c){
 if(c.injuries.some(j=>j.name==='Dead'))return['bad','Dead'];
 if(c.traumas.some(j=>j.name==='Lost Forever'))return['bad','Lost forever'];
 if(c.injuries.some(j=>j.name==='Dire'))return['bad','Dire'];
 if(c.poolLimit===0)return['bad','Wounded'];
 if(c.horrorLimit>=Math.max(3,c.poolMax/2))return['warn','Shaken'];
 if(c.poolLimit<c.poolMax||c.injuries.length)return['warn','Hurt'];
 return['ok','Healthy'];
}
function poolHtml(c,mini){
 let h='',k=0;const pend=()=>k++<c.horrorLimit;
 for(let i=0;i<c.horror;i++){k++;h+='<span class="die hor" title="Horror die"></span>';}
 for(let i=0;i<c.regular;i++)h+=pend()?'<span class="die reg pend" title="Regular die \u2014 becomes a horror die on the next refill"></span>':'<span class="die reg" title="Regular die"></span>';
 for(let i=c.regular+c.horror;i<c.poolLimit;i++)h+=pend()?'<span class="die empty pend" title="Spent \u2014 refills as a horror die"></span>':'<span class="die empty" title="Spent"></span>';
 for(let i=c.poolLimit;i<c.poolMax;i++)h+='<span class="die lost" title="Lost to damage"></span>';
 return '<div class="pool'+(mini?' mini':'')+'" aria-label="'+(c.regular+c.horror)+' dice in pool">'+h+'</div>';
}
function renderTabs(){
 const t=document.getElementById('tabs');
 t.innerHTML=['party',...SLOTS,'journal',...(CAMP&&!isGM()?[]:['gm']),'create'].map(s=>'<button class="tab" role="tab" data-tab="'+s+'" aria-selected="'+(s===active)+'">'+esc(s==='party'?'Party':s==='create'?'+ New investigator':s==='journal'?'Journal':s==='gm'?'GM':(chars[s].name||'Investigator'))+'</button>').join('');
}
// The next meetup, set by the owner or GM in the campaign's Settings.
function nextSessionBar(){
 if(!CAMP||!camp||!window.sessionShown)return '';
 const t=camp.nextSession,gmMe=camp.gmUid===authUid,can=camp.ownerUid===authUid||gmMe,set=gmMe?'#gm':'./?settings='+encodeURIComponent(CAMP),go=gmMe?' data-act="gotogm"':'';
 if(!sessionShown(t))return '';
 return '<div class="nextsess"><div class="grow"><span class="lbl">Next session</span><span><b>'+esc(sessionWhen(t))+'</b>'+(camp.nextWhere?'<span class="note"> \u00b7 '+esc(camp.nextWhere)+'</span>':'')+'</span></div>'+
  '<span class="chip ok cdchip" data-cd="'+t+'">'+esc(sessionRel(t))+'</span><a class="btn sm" href="'+sessionIcs(camp.name,t,camp.nextWhere)+'" download="'+esc((camp.name||'session').replace(/[^\w -]+/g,''))+'.ics">Add to calendar</a>'+(mapsHref(camp.nextWhere)?'<a class="btn sm" href="'+esc(mapsHref(camp.nextWhere))+'" target="_blank" rel="noopener">Directions</a>':'')+(can?'<a class="btn sm" href="'+set+'"'+go+'>Change</a>':'')+'</div>';
}
function renderParty(){
 let h=turnBar()+nextSessionBar()+'<div class="banner">Tap an investigator to open their sheet. Every change syncs to everyone at the table.</div>'+
  (CAMP&&!canAddSheet()?'<p class="note" style="margin:0">You have your investigator. Only the campaign owner can add more.</p>':'')+
  (SLOTS.length<MAX_SLOTS&&canAddSheet()?'<div class="row"><button class="btn" data-act="addslot">'+(CAMP&&!keys.master?'+ Create my investigator':'+ Add an investigator')+'</button><span class="note">'+(rosterLocked?'Publish the updated Firestore rules (see README) to add or remove investigators.':'Adds a blank sheet. Use the New investigator tab to build one step by step.')+'</span></div>':'')+
  '<div class="party">';
 SLOTS.forEach(s=>{const c=chars[s];const [cls,lab]=sheetStatus(c);const lr=(c.log||[])[0];
  h+='<button class="pcard" data-tab="'+s+'"><div class="row" style="justify-content:space-between;width:100%"><div class="row" style="gap:10px;flex-wrap:nowrap">'+avatarHtml(c,'sm')+'<div><h3>'+esc(c.name)+'</h3><div class="note">'+esc([c.archetype,c.player&&('played by '+c.player)].filter(Boolean).join(' · ')||'Unassigned')+'</div></div></div><span class="chip '+cls+'">'+lab+'</span></div>'+
  poolHtml(c,true)+
  '<div class="kv"><div><span class="lbl">Pool</span><b>'+c.poolLimit+'/'+c.poolMax+'</b></div><div><span class="lbl">Horror</span><b>'+c.horrorLimit+'</b></div><div><span class="lbl">Insight</span><b>'+c.insight+'/'+c.insightLimit+'</b></div><div><span class="lbl">Injuries</span><b>'+c.injuries.length+'</b></div></div>'+
  (lr?'<div class="log">Latest: '+esc(lr.m)+'</div>':'')+'</button>';});
 h+='</div>';
 // In a campaign, players who aren't the GM only see the house rules here (and nothing at all if there are none).
 const gmBody=houseToggle()+(isGMView()?'<div class="row"><button class="btn pri" data-act="sessionAll">Start new session for everyone</button><button class="btn" data-act="refillAll">Refill every pool</button></div><p class="note" style="margin:0">A new session refills insight to its limit, frees habitual and lucky items and clears trauma roll penalties. '+(CAMP?'This covers every investigator in the campaign.':'With the master key or the GM PIN this covers every sheet.')+'</p>':(CAMP?'':'<p class="note" style="margin:0">Starting a new session and refilling every pool need the GM PIN (on the GM tab) or the master key.</p>'))+(!localMode&&!CAMP?(keys.master?'<div class="row"><span class="chip ok">Master key active</span><span class="note">This device can edit every sheet.</span><button class="btn sm" data-act="mforget">Remove master key from this device</button></div>':'<div class="row"><input class="maxsel" style="width:170px" type="password" id="mkey" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Master key" aria-label="Master key"><button class="btn sm" data-act="munlock">Use master key</button></div>'):'');
 const gmTitle=!CAMP||isGMView()?'Game Master':'House rules';
 if(gmBody)h+='<section class="sec gmsec"><div class="sec-head"><h2>'+gmTitle+'</h2></div>'+gmBody+'</section>';
 return h;
}
function fld(path,label,val,type,extra){return '<label class="field"><span class="lbl">'+label+'</span><input class="f" id="'+path.replace(/\./g,'-')+'" data-f="'+path+'" type="'+(type||'text')+'" value="'+esc(val)+'" '+(extra||'')+'></label>';}
function avatarHtml(c,size){const ini=esc(((c.name||'?').trim()[0]||'?').toUpperCase());return c.portrait?'<img class="avatar '+size+'" src="'+esc(c.portrait)+'" alt="Portrait of '+esc(c.name)+'">':'<span class="avatar '+size+'" aria-hidden="true">'+ini+'</span>';}
function shrinkImage(file){return new Promise((res,rej)=>{const img=new Image();const url=URL.createObjectURL(file);
 img.onload=()=>{const side=Math.min(img.width,img.height),S=320;const cv=document.createElement('canvas');cv.width=S;cv.height=S;const g=cv.getContext('2d');
  g.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,S,S);URL.revokeObjectURL(url);
  let q=0.82,d=cv.toDataURL('image/jpeg',q);while(d.length>120000&&q>0.4){q-=0.1;d=cv.toDataURL('image/jpeg',q);}res(d);};
 img.onerror=()=>{URL.revokeObjectURL(url);rej();};img.src=url;});}
function openCrop(file,slot){openCropper(file,{title:'Position your portrait',shape:'circle',outW:320,outH:320,maxLen:120000,onError:toast,onSave:d=>save(slot,{portrait:d},'Changed portrait')});}
function ownerPanel(s){
 const c=chars[s],names=(camp&&camp.names)||{},own=c.ownerUid||null,mine=!!own&&own===authUid,boss=!!keys.master&&!!camp,gone=!!own&&!names[own];
 const who=own&&!gone?names[own]:null;
 // The owner picks the player right in the header; everyone else just sees who plays it.
 const head=boss?'<label class="row" style="gap:8px;align-items:center;flex-wrap:nowrap" for="assign-'+s+'"><span class="lbl" style="margin:0">Played by</span><select class="maxsel" id="assign-'+s+'" data-assign="'+s+'" aria-label="Who plays this investigator" style="width:auto;font-weight:600"><option value="">Nobody yet</option>'+(camp.memberIds||[]).map(u=>'<option value="'+esc(u)+'"'+(u===own?' selected':'')+'>'+esc(names[u]||'Member')+(u===authUid?' (you)':'')+'</option>').join('')+'</select></label>'
  :'<span class="chip '+(mine?'ok':who?'':'warn')+'">'+(mine?'Your investigator':who?'Played by '+esc(who):'Unclaimed')+'</span>';
 const oe=!!(camp&&camp.ownerEdits===true);
 const note=mine?(oe?'Only you, the campaign owner and the GM can change it.':'Only you and the GM can change it.'):boss?(oe?'You can edit any investigator as the campaign owner.':'Locked to its player. You can change this in Settings.'):who?'Only its player can change it.':'Nobody plays this investigator yet.';
 let h='<section class="sec" style="gap:10px"><div class="sec-head"><div class="row" style="align-items:center">'+head+'<span class="note">'+note+'</span></div><button class="btn sm" data-act="printc">Open printable sheet</button></div>';
 let row='';
 if(!boss&&(!own||gone)&&canAddSheet())row+='<button class="btn sm pri" data-act="claim">This is my investigator</button>';
 if(mine&&!boss)row+='<button class="btn sm" data-act="release">Give up this investigator</button>';
 if(row)h+='<div class="row">'+row+'</div>';
 return h+'</section>';
}
function applyRoles(){
 if(!CAMP||!camp)return;
 Object.keys(keys).forEach(k=>delete keys[k]);
 if(camp.ownerUid===authUid)keys.master=true;
 if(camp.gmUid&&camp.gmUid===authUid)keys.gm=true;
 gmClaimed=!!camp.gmUid;
 SLOTS.forEach(x=>{if(chars[x]&&chars[x].ownerUid===authUid)keys[x]=true;});
 keysReady=true;gmFlagReady=true;gmMasterState=null;gmSubscribe();
}
function lockPanel(s){
 if(CAMP)return ownerPanel(s);
 const c=chars[s];let h='<section class="sec" style="gap:10px"><div class="sec-head"><div class="row"><span class="chip '+(c.locked?(canEdit(s)?'ok':'warn'):'ok')+'">'+(c.locked?(canEdit(s)?(keys.master&&!keys[s]?'Master key':'Unlocked on this device'):'Locked'):'No passcode')+'</span><span class="note">'+(c.locked?(canEdit(s)?(keys.master&&!keys[s]?'You\u2019re editing with the master key.':'Others need the passcode to edit it.'):'Enter the passcode to edit. Anyone can still view it.'):'Anyone with the link can edit this sheet.')+'</span></div><button class="btn sm" data-act="printc">Open printable sheet</button></div>';
 if(localMode)return h+'</section>';
 const inp=(id,ph)=>'<input class="maxsel" style="width:150px" type="password" id="'+id+'-'+s+'" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="'+ph+'" aria-label="'+ph+'">';
 if(!c.locked)h+='<div class="row">'+inp('lockset','New passcode')+'<button class="btn sm" data-act="lockset">Lock with passcode</button></div>';
 else if(!canEdit(s))h+='<div class="row">'+inp('unlock','Passcode')+'<button class="btn sm pri" data-act="unlock">Unlock</button></div>';
 else h+='<div class="row"><button class="btn sm" data-act="lockoff">Remove passcode</button>'+(keys[s]?'<button class="btn sm" data-act="forget">Lock this device</button>':'')+'</div>';
 return h+'</section>';
}
function renderChar(s){ const body=renderCharBody(s); return turnBar()+lockPanel(s)+(canEdit(s)?body:'<fieldset disabled style="border:0;padding:0;margin:0;min-width:0;display:flex;flex-direction:column;gap:16px">'+body+'</fieldset>')+removePanel(s); }
function removePanel(s){
 const can=(!db&&localMode)||!!keys.master;const c=chars[s];
 if(!can)return '<p class="note" style="margin:0">'+(CAMP?'Only the campaign owner':'Only the master key')+' can remove an investigator from the party.</p>';
 if(edit.rm===s)return '<section class="sec"><div class="roll" role="status"><span>Remove <b>'+esc(c.name||'this investigator')+'</b> from the party? Their sheet is deleted for everyone. This can\u2019t be undone.</span><div class="row"><button class="btn sm dng" data-act="rmyes">Remove '+esc(c.name||'investigator')+'</button><button class="btn sm" data-act="rmno">Cancel</button></div></div></section>';
 return '<div class="row"><button class="btn sm dng" data-act="rmslot">Remove this investigator from the party…</button></div>';
}
const ownsSheet=()=>SLOTS.some(x=>chars[x]&&chars[x].ownerUid===authUid);
// In a campaign the owner can add any number of investigators; everyone else gets one of their own.
const canAddSheet=()=>!CAMP||!!keys.master||!ownsSheet();
function freeSlot(){for(let i=1;i<=MAX_SLOTS;i++){const id='p'+i;if(!SLOTS.includes(id))return id;}return null;}
async function addSlot(data){
 if(rosterLocked)return toast('Publish the updated Firestore rules first (see README).'),null;
 if(!canAddSheet())return toast('You already have your investigator. Only the campaign owner can add more.'),null;
 const id=freeSlot();if(!id)return toast('The party is full ('+MAX_SLOTS+' investigators).'),null;
 const c=norm(data||blank(slotNum(id)),slotNum(id));c.locked=false;if(CAMP){c.ownerUid=authUid;if(camp&&camp.names&&camp.names[authUid]&&!data)c.player=camp.names[authUid];}
 chars[id]=c;SLOTS=[...SLOTS,id].sort((a,b)=>slotNum(a)-slotNum(b));
 if(db){try{if(CAMP&&!keys.master){const b=db.batch();b.set(db.doc('characters/'+id),JSON.parse(JSON.stringify(c)));b.set(db.doc('players/'+authUid),{slot:id});await b.commit();}else await db.doc('characters/'+id).set(JSON.parse(JSON.stringify(c)));}catch(e){toast(e&&e.code==='permission-denied'?'Firebase refused that. Publish the updated rules (see README).':'Couldn\u2019t add the investigator. Try again.');SLOTS=SLOTS.filter(x=>x!==id);delete chars[id];render();return null;}}
 return id;
}
async function removeSlot(s){
 const name=chars[s]&&chars[s].name;
 const pu=CAMP&&chars[s]&&chars[s].ownerUid;
 if(db){try{await db.doc('characters/'+s).delete();if(CAMP){if(pu)await db.doc('players/'+pu).delete().catch(()=>{});}else await db.doc('locks/'+s).delete().catch(()=>{});}catch(e){toast(e&&e.code==='permission-denied'?(CAMP?'Only the campaign owner can remove investigators.':'Only the master key can remove investigators (and the updated rules must be published).'):'Couldn\u2019t remove that investigator. Try again.');return;}}
 SLOTS=SLOTS.filter(x=>x!==s);delete chars[s];edit.rm=null;go('party');toast((name||'Investigator')+' was removed from the party.');
}
function renderCharBody(s){
 const c=chars[s];const [cls,lab]=sheetStatus(c);const rl=lastRoll[s];
 let h='<section class="sec"><div class="row" style="justify-content:space-between;align-items:flex-start"><div class="row" style="flex:none;gap:10px;align-items:center">'+avatarHtml(c,'lg')+'<div class="pic-btns"><label class="btn sm" for="pic-'+s+'" style="display:inline-flex;align-items:center;cursor:pointer">'+(c.portrait?'Change picture':'Add picture')+'</label><input type="file" accept="image/*" id="pic-'+s+'" data-pic="1" hidden>'+(c.portrait?'<button class="btn sm" data-act="picdel">Remove</button>':'')+'</div></div><div style="flex:1;min-width:220px"><input class="namein" id="nm-'+s+'" data-f="name" value="'+esc(c.name)+'" aria-label="Investigator name"></div><span class="chip '+cls+'">'+lab+'</span></div>'+'</section>';
 if(c.insightChance)h+='<section class="sec">'+(c.insightChance?'<div class="roll" role="status"><span><b>Momentous session.</b> You may raise your insight limit by 1 for 1 XP (once, now).</span><div class="row"><button class="btn sm pri" data-act="buyins" '+(c.xpUnused>=1&&c.insightLimit<10?'':'disabled')+'>Raise it · 1 XP</button><button class="btn sm" data-act="skipins">Not this time</button></div></div>':'')+'</section>';

 // condition
 h+='<section class="sec"><div class="sec-head"><h2>Dice pool</h2><span class="note num">'+(c.regular+c.horror)+' in pool · limit '+c.poolLimit+' of '+c.poolMax+'</span></div>'+poolHtml(c)+
 '<div class="legend"><span>■ regular</span><span style="color:var(--horror)">■ horror</span><span>□ spent</span><span style="color:var(--danger)">▨ lost to damage</span><span style="color:var(--horror)">▢ green ring = becomes horror on refill</span></div>'+
 '<div class="row"><button class="btn" data-act="spend" data-k="reg" '+(c.regular?'':'disabled')+'>Spend regular die</button><button class="btn hor" data-act="spend" data-k="hor" '+(c.horror?'':'disabled')+'>Spend horror die</button><button class="btn pri" data-act="refill">Refill pool</button></div>'+
 '<div class="row"><button class="btn dng" data-act="dmg" data-n="1" title="Lowers the pool limit by 1. Tap once per point of damage." '+(c.poolLimit>0?'':'disabled')+'>Take damage</button><button class="btn" data-act="heal" data-n="1" title="Raises the pool limit by 1." '+(c.poolLimit<c.poolMax?'':'disabled')+'>Heal</button><button class="btn" data-act="rest" '+(c.poolLimit<c.poolMax?'':'disabled')+'>Full rest</button><button class="btn" data-act="strain" '+(c.poolLimit<c.poolMax?'':'disabled')+'>Strain</button></div>'+
 activeEffects(c)+
 '<p class="note" style="margin:0">Damage lowers the pool limit. At 0 you’re wounded. Straining restores the limit, then you roll an injury at the end of your turn.</p></section>';

 // skills
 h+='<section class="sec"><div class="sec-head"><h2>Skills</h2><span class="note">Success on a roll at or above the rating. Lower is better. <span class="chip">'+c.xpUnused+' unused XP</span></span></div><div class="skills">'+
 SKILLS.map(([k,n])=>{const sk=c.skills[k];const cost=SKILL_COST[sk.r];return '<div class="skill"><span class="nm">'+n+'</span><label class="note" for="mx-'+k+'-'+s+'">max</label><select class="maxsel" id="mx-'+k+'-'+s+'" data-skmax="'+k+'"><option value="">–</option>'+[4,3,2].map(v=>'<option value="'+v+'"'+(String(sk.max)===String(v)?' selected':'')+'>'+v+'+</option>').join('')+'</select><span class="rate">'+sk.r+'+</span><button class="btn sm" data-act="imp" data-k="'+k+'" '+(cost?'':'disabled')+' aria-label="Improve '+n+'">'+(cost?'↑ '+cost+' XP':'Best')+'</button></div>';}).join('')+
 '</div><details><summary class="note" style="cursor:pointer">Set ratings by hand</summary><div class="wgrid" style="margin-top:8px">'+SKILLS.map(([k,n])=>'<label class="field"><span class="lbl">'+n+'</span><select class="f" id="sr-'+k+'-'+s+'" data-skr="'+k+'">'+[6,5,4,3,2].map(v=>'<option value="'+v+'"'+(c.skills[k].r===v?' selected':'')+'>'+v+'+</option>').join('')+'</select></label>').join('')+'</div></details></section>';

 // weapons
 const shared=sharedAmmo(),totRel=c.weapons.reduce((a,w)=>a+(w.fr?0:(w.reloads||0)),0);
 h+='<section class="sec"><div class="sec-head"><h2>Weapons</h2><span class="chip">'+money(c.money)+' left</span>'+(shared?'<span class="chip ok" title="House rule">Universal ammo · '+totRel+' reload'+(totRel===1?'':'s')+' shared</span>':'')+'</div>'+
 weaponPicker(s)+'<div class="row"><button class="btn sm" data-act="addw">Add a custom weapon</button></div>'+
 '<p class="note" style="margin:0">Mark off ammo only when an attack rolls one or more 1s. Reloading is a simple action, or complex (Ranged Combat) under pressure.</p><div class="list">'+
 (c.weapons.length?c.weapons.map(w=>{let pips='';for(let i=0;i<w.ammoMax;i++)pips+='<button class="pip'+(i<w.ammo?'':' spent')+'" data-act="ammo" data-id="'+w.id+'" data-n="'+i+'" aria-label="Ammo '+(i+1)+(i<w.ammo?' loaded':' spent')+'"></button>';
  return '<div class="item"><div class="grow"><input class="f" id="wn-'+w.id+'" data-list="weapons" data-id="'+w.id+'" data-key="name" value="'+esc(w.name)+'" placeholder="Weapon" style="font-weight:600">'+
  '<div class="wgrid">'+[['skill','Skill'],['range','Range'],['dmg','Damage'],['inj','Injury rating'],['ammoMax','Ammo'],['special','Special']].map(([k,l])=>'<label class="field"><span class="lbl">'+l+'</span><input class="f" id="w'+k+'-'+w.id+'" data-list="weapons" data-id="'+w.id+'" data-key="'+k+'" value="'+esc(w[k])+'" '+(k==='ammoMax'?'type="number" min="0" max="12"':'')+'></label>').join('')+'</div>'+
  (w.ammoMax>0?'<div class="ammo">'+pips+'<button class="btn sm" data-act="reload" data-id="'+w.id+'" '+(w.ammo>=w.ammoMax||(!w.fr&&!(gunPool(c.weapons,w)>0)&&!(shared&&totRel>0))?'disabled':'')+'>'+(w.fr?'Reload (free)':'Reload')+'</button>'+
   (w.fr?'':'<span class="note">Extra reloads'+(sameGuns(c.weapons,w).length>1?' (shared by your '+sameGuns(c.weapons,w).length+' '+esc(w.name)+'s)':'')+'</span><div class="stepper"><button class="btn sm icon" data-act="wrel" data-id="'+w.id+'" data-n="-1" aria-label="One fewer reload for '+esc(w.name||'this gun')+'">−</button><b class="num">'+gunPool(c.weapons,w)+'</b><button class="btn sm icon" data-act="wrel" data-id="'+w.id+'" data-n="1" aria-label="One more reload for '+esc(w.name||'this gun')+'">+</button></div>'+(w.rc?'<button class="btn sm" data-act="buyrel" data-id="'+w.id+'">Buy one · '+money(w.rc)+'</button>':''))+'</div>':'')+
  '</div><button class="btn sm icon" data-act="del" data-list="weapons" data-id="'+w.id+'" aria-label="Remove weapon">×</button></div>';}).join(''):'<p class="note">No weapons.</p>')+
 '</div></section>';

 // horror & insight
 h+='<section class="sec"><div class="grid2"><div style="display:flex;flex-direction:column;gap:10px"><h2>Horror</h2><div class="row"><div class="stat"><span class="lbl">Horror dice limit</span><b class="num">'+c.horrorLimit+'</b></div><button class="btn hor" data-act="hor" data-n="1">Suffer 1</button><button class="btn" data-act="hor" data-n="-1" '+(c.horrorLimit?'':'disabled')+'>Remove 1</button></div>'+
 '<div class="row">'+fld('habitual.name','Habitual item',c.habitual.name,'text','placeholder="e.g. Stick of gum"')+'<span class="num" title="How many you have" style="white-space:nowrap">\u00d7 '+c.habitual.uses+'</span><button class="btn" data-act="habit" '+(c.habitual.used||!c.horrorLimit||c.habitual.uses<=0?'disabled':'')+'>'+(c.habitual.used?'Used this session':c.habitual.uses<=0?'None left':'Use one (\u22121 horror)')+'</button><button class="btn sm" data-act="buyhabit">Buy another $1</button><span class="note">'+money(c.money)+' left</span></div>'+
 '<p class="note" style="margin:0">Refills put horror dice in first. A 1 on a horror die means a trauma. Introspection (Resolve) or counseling (Presence) also removes 1.</p></div>'+
 '<div style="display:flex;flex-direction:column;gap:10px"><h2>Insight</h2><div class="row"><div class="stat"><span class="lbl">Insight</span><b class="num">'+c.insight+' / '+c.insightLimit+'</b></div><button class="btn" data-act="ins" data-n="-1" '+(c.insight?'':'disabled')+'>Spend 1</button><button class="btn" data-act="ins" data-n="1" '+(c.insight<c.insightLimit?'':'disabled')+'>Regain 1</button></div>'+
 '<p class="note" style="margin:0">Spend for +1 success after a success, advantage before a roll, a clue, or a handy detail in the scene.</p>'+
 '<div class="row">'+fld('lucky.name','Lucky item',c.lucky.name,'text','placeholder="e.g. Grandpa\u2019s silver dollar"')+'<button class="btn" data-act="lucky" '+(c.lucky.used||!c.lucky.name||c.insight>=c.insightLimit?'disabled':'')+'>'+(c.lucky.used?'Used this session':'Use it (+1 insight)')+'</button></div>'+
 traitField(s,c)+'</div></div></section>';

 // knacks
 h+='<section class="sec"><div class="sec-head"><h2>Knacks</h2><span class="chip">'+c.xpUnused+' unused XP</span></div>'+knackPicker(c)+
 '<div class="list">'+(c.knacks.length?c.knacks.map(k=>'<div class="item"><span class="tier">T'+k.tier+'</span><div class="grow"><input class="f" id="kn-'+k.id+'" data-list="knacks" data-id="'+k.id+'" data-key="name" value="'+esc(k.name)+'" placeholder="Knack name" style="font-weight:600"><textarea class="f" id="kt-'+k.id+'" data-list="knacks" data-id="'+k.id+'" data-key="text" placeholder="What it does">'+esc(k.text)+'</textarea></div><button class="btn sm icon" data-act="del" data-list="knacks" data-id="'+k.id+'" aria-label="Remove knack">×</button></div>').join(''):'<p class="note">No knacks yet.</p>')+'</div>'+'</section>';

 // injuries & trauma
 h+='<section class="sec"><div class="sec-head"><h2>Injuries &amp; traumas</h2></div>'+
 '<div class="grid2"><div><span class="lbl">Injuries</span>'+
 '<div class="row"><select class="maxsel" id="injsel-'+s+'" data-addinj="1" aria-label="Add an injury" style="flex:1;min-width:0"><option value="">Add an injury…</option>'+INJURIES.slice(1).map((x,i)=>'<option value="'+esc(x[0])+'">'+(i===10?'11+':i+1)+' · '+esc(x[0])+'</option>').join('')+'</select></div>'+
 '<p class="note" style="margin:6px 0">Roll 1d6'+(c.injuries.length?' + '+c.injuries.length:'')+' at the table'+(c.injuries.length?' (+1 for each injury you already have)':'')+', then pick the result.</p>'+
 '<div class="list">'+(c.injuries.length?c.injuries.map(j=>{const e=INJURIES.find(x=>x&&x[0]===j.name);return '<div class="item"><div class="grow"><b>'+esc(j.name)+'</b>'+(e?'<span class="effect">'+esc(e[1])+'</span>':'')+'</div><button class="btn sm" data-act="healinj" data-id="'+j.id+'">Healed</button></div>';}).join(''):'<p class="note">None.</p>')+'</div></div>'+
 '<div><span class="lbl">Traumas'+(c.traumaMod?' · +'+c.traumaMod+' to trauma rolls this session':'')+'</span>'+
 '<div class="row"><select class="maxsel" id="trasel-'+s+'" data-addtra="1" aria-label="Add a trauma" style="flex:1;min-width:0"><option value="">Add a trauma…</option>'+Object.keys(TRAUMA_AT).map(k=>'<option value="'+esc(k)+'">'+TRAUMA_ROLL[k]+' · '+esc(k)+'</option>').join('')+'</select></div>'+
 '<p class="note" style="margin:6px 0">Roll 1d6 + the number of 1s on your horror dice'+(c.traumaMod?' + '+c.traumaMod:'')+' at the table, then pick the result.</p>'+
 '<div class="list">'+(c.traumas.length?c.traumas.map(j=>'<div class="item"><div class="grow"><b>'+esc(j.name)+'</b><span class="effect">'+esc(traumaFor(TRAUMA_AT[j.name]||1)[1])+'</span></div><button class="btn sm" data-act="deltra" data-id="'+j.id+'">Clear</button></div>').join(''):'<p class="note">None.</p>')+'</div></div></div></section>';

 // resources
 h+='<section class="sec"><div class="sec-head"><h2>Money &amp; equipment</h2></div><div class="row"><div class="stat"><span class="lbl">Money</span><b class="num">'+money(c.money)+'</b></div>'+
 [-1,-0.25,0.25,1,5].map(d=>'<button class="btn sm" data-act="cash" data-n="'+d+'">'+(d<0?'−':'+')+money(Math.abs(d))+'</button>').join('')+
 '</div>'+gearPicker(s)+'<div class="row"><label class="row note" for="cash-'+s+'">Amount <input id="cash-'+s+'" class="maxsel" style="width:80px" type="number" step="0.01" min="0" placeholder="0.00"></label><button class="btn sm" data-act="cashin">Add</button><button class="btn sm" data-act="cashout">Spend</button><button class="btn sm" data-act="cashset" title="Replace the current money with this amount">Set to this</button></div>'+
 '<div class="list">'+(c.items.length?c.items.map(it=>'<div class="item"><div class="grow"><input class="f" id="in-'+it.id+'" data-list="items" data-id="'+it.id+'" data-key="name" value="'+esc(it.name)+'" placeholder="Item" style="font-weight:600"><input class="f" id="io-'+it.id+'" data-list="items" data-id="'+it.id+'" data-key="note" value="'+esc(it.note)+'" placeholder="Notes or rules"></div><button class="btn sm icon" data-act="del" data-list="items" data-id="'+it.id+'" aria-label="Remove item">×</button></div>').join(''):'<p class="note">No equipment.</p>')+
 '</div><div class="row"><button class="btn sm" data-act="addi">Add item</button></div>'+vehiclePicker(s)+'<div class="grid2">'+fld('bg.vehicle','Vehicle',c.bg.vehicle)+fld('bg.lodging','Lodging',c.bg.lodging)+'</div></section>';

 h+='<details class="sec"><summary><h2>Tomes, relics &amp; debts</h2></summary><div class="grid2"><label class="field"><span class="lbl">Tomes</span><textarea class="f" id="tomes-'+s+'" data-f="tomes">'+esc(c.tomes)+'</textarea></label><label class="field"><span class="lbl">Relics</span><textarea class="f" id="relics-'+s+'" data-f="relics">'+esc(c.relics)+'</textarea></label></div><label class="field"><span class="lbl">Eldritch debts or favors</span><textarea class="f" id="debts-'+s+'" data-f="debts">'+esc(c.debts)+'</textarea></label></details>';

 // player, archetype & experience
 h+='<section class="sec"><div class="sec-head"><h2>Player, archetype &amp; XP</h2></div>'+
 '<div class="grid2">'+fld('player','Player',c.player)+'<label class="field"><span class="lbl">Archetype</span><select class="f" id="arch-'+s+'" data-f="archetype"><option value="">Choose…</option>'+ARCH.map(a=>'<option'+(a===c.archetype?' selected':'')+'>'+a+'</option>').join('')+'</select></label></div>'+
 '<div class="row"><div class="stat"><span class="lbl">Total XP</span><b class="num">'+c.xpTotal+'</b></div><div class="stat"><span class="lbl">Unused XP</span><b class="num">'+c.xpUnused+'</b></div><div class="row" style="gap:6px;align-items:center"><span class="note">Award XP</span><div class="stepper"><button class="btn sm icon" data-act="xpamt" data-n="-1" aria-label="One less XP">−</button><input id="xpamt-'+s+'" data-xpamt="1" class="maxsel num" type="number" inputmode="numeric" min="1" max="30" value="'+(xpAmt[s]||1)+'" aria-label="XP to award" style="width:56px;text-align:center"><button class="btn sm icon" data-act="xpamt" data-n="1" aria-label="One more XP">+</button></div><button class="btn sm pri" data-act="xpaward">Add</button><button class="btn sm" data-act="xpfix">Fix XP…</button></div></div>'+'<p class="note" style="margin:4px 0 0">The book suggests 1 XP per hour played, plus 1–3 for big moments.</p>'+
 (edit.xp?'<div class="row">'+fld('xpTotal','Total XP',c.xpTotal,'number','min="0" style="width:110px"')+fld('xpUnused','Unused XP',c.xpUnused,'number','min="0" style="width:110px"')+'</div>':'')+
 '<div class="costs"><span>Skill 6+ → 5+</span><span>2 XP</span><span>Skill 5+ → 4+</span><span>4 XP</span><span>Skill 4+ → 3+ (archetype skills)</span><span>7 XP</span><span>Skill 3+ → 2+ (archetype skills)</span><span>12 XP</span><span>+1 insight limit (after a momentous session)</span><span>1 XP</span></div>'+
 '<div class="row"><button class="btn sm" data-act="buyins">Raise insight limit · 1 XP</button></div></section>';

 h+='<details class="sec"><summary><h2>Background</h2></summary><div class="grid2">'+fld('bg.origin','Place of origin',c.bg.origin)+fld('bg.family','Family & friends',c.bg.family)+fld('bg.employment','Employment',c.bg.employment)+fld('bg.salary','Weekly salary',c.bg.salary)+fld('bg.encounter','First supernatural encounter',c.bg.encounter)+fld('bg.enemies','Notable enemies',c.bg.enemies)+'</div></details>';

 const gm=!!keys.master&&ownerEditsOn()&&!localMode;
 h+='<section class="sec"><div class="sec-head"><h2>Recent</h2><div class="row">'+(gm&&(c.log||[]).length?'<button class="btn sm dng" data-act="clearlog">Clear all</button>':'')+'<button class="btn sm" data-act="session">New session</button></div></div><div class="log">'+((c.log||[]).length?c.log.map(l=>'<span class="row" style="gap:6px;flex-wrap:nowrap">'+(gm?'<button class="btn sm icon" style="min-height:24px;width:24px" data-act="dellog" data-n="'+l.t+'" aria-label="Remove this entry">\u00d7</button>':'')+'<span>'+new Date(l.t).toLocaleString([], {weekday:'short',hour:'numeric',minute:'2-digit'})+' \u2014 '+esc(l.m)+'</span></span>').join(''):'Nothing yet.')+'</div>'+(gm?'<p class="note" style="margin:0">'+(CAMP?'As the campaign owner, you can remove entries.':'Master key: you can remove entries.')+'</p>':'')+'</section>';
 return h;
}
function activeEffects(c){
 const a=c.injuries.map(j=>{const e=INJURIES.find(x=>x&&x[0]===j.name);return '<div class="note"><b style="color:var(--danger)">'+esc(j.name)+'</b>'+(e?' \u2014 '+esc(e[1]):'')+'</div>';})
  .concat(c.traumas.map(j=>'<div class="note"><b style="color:var(--horror)">'+esc(j.name)+'</b> \u2014 '+esc(traumaFor(TRAUMA_AT[j.name]||1)[1])+'</div>'));
 return a.length?'<div style="display:flex;flex-direction:column;gap:4px"><span class="lbl">Affecting you now</span>'+a.join('')+'</div>':'';
}
const edit={xp:false};
let house={on:false};
if(CAMP&&CACHED&&CACHED.house)house=CACHED.house;
function gunKey(w){return String(w.name||'').trim().toLowerCase();}
function sameGuns(ws,w){const k=gunKey(w);return k&&!w.fr?ws.filter(x=>!x.fr&&gunKey(x)===k):[w];}
function gunPool(ws,w){return sameGuns(ws,w).reduce((a,x)=>a+(x.reloads||0),0);}
// Campaigns keep their house rules in the database (Settings); the original site uses house-rules.js.
const HR=()=>CAMP?{weapons:(house.weapons||[]).filter(x=>!x.off&&x.n),gear:(house.gear||[]).filter(x=>!x.off&&x.n),rules:(house.rules||[]).filter(x=>!x.off&&x.n)}:(window.HOUSE_RULES||{});
function sharedAmmo(){return !!(house.on&&(HR().rules||[]).some(r=>r.id==='universalAmmo'));}
function W(){return house.on?[...A.WEAPONS,...(HR().weapons||[]).map(w=>({...w,house:true}))]:A.WEAPONS;}
function GR(){return house.on?[...A.GEAR,...(HR().gear||[]).map(g=>({...g,house:true}))]:A.GEAR;}
function gmPinHtml(){
 if(localMode||CAMP)return '';
 const gmk=isGM(),mk=!!keys.master;
 const [cls,lab,note]=!gmClaimed?['warn','No GM PIN','Whoever runs the game sets a PIN here. After that only devices with the PIN can run these tools.']
  :gmk?['ok','Unlocked on this device','Others need the GM PIN to run these tools.']
  :mk?['ok','Master key','You can view the GM tools. Only the GM PIN can change them.']
  :['warn','Locked','Enter the GM PIN to run the GM tools.'];
 const inp=ph=>'<input class="maxsel" style="width:150px" type="password" id="gmpin" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="'+ph+'" aria-label="'+ph+'">';
 let h='<section class="sec" style="gap:10px"><div class="sec-head"><div class="row"><span class="chip '+cls+'">'+lab+'</span><span class="note">'+note+'</span></div></div>';
 if(!gmClaimed)h+='<div class="row">'+inp('New GM PIN')+'<button class="btn sm pri" data-act="gmset">Set GM PIN</button></div>';
 else if(gmk)h+=edit.gmclear?'<div class="row"><span class="note">Remove the GM PIN? Anyone can then set a new one and take over the GM tools. Your enemies, clues, notes and log stay.</span><button class="btn sm dng" data-act="gmclear">Yes, remove it</button><button class="btn sm" data-act="gmclearno">Cancel</button></div>'
  :'<div class="row">'+inp('New GM PIN')+'<button class="btn sm" data-act="gmset">Change GM PIN</button><button class="btn sm" data-act="gmforget">Lock this device</button><button class="btn sm" data-act="gmclearask">Remove GM PIN</button></div>';
 else h+='<div class="row">'+inp('GM PIN')+'<button class="btn sm pri" data-act="gmunlock">Unlock</button>'+(mk?'<button class="btn sm" data-act="gmreset">Reset GM PIN</button>':'')+'</div>';
 return h+'</section>';
}
function houseToggle(){
 const hr=HR();const names=[...(hr.rules||[]),...(hr.weapons||[]),...(hr.gear||[])].map(x=>x.n).filter(Boolean);
 if(!names.length)return CAMP&&keys.master?'<p class="note" style="margin:0 0 8px">No house rules yet. Add custom weapons, gear or rule changes in <a href="./?settings='+encodeURIComponent(CAMP)+'">Settings</a>.</p>':'';
 const can=(!db&&localMode)||!!keys.master;
 return '<div class="item" style="padding:0 0 8px"><div class="grow"><b>'+(CAMP&&!isGMView()?'':'House rules ')+(house.on?'<span class="chip ok">On</span>':'<span class="chip warn">Off</span>')+'</b><span class="effect">Adds: '+esc(names.join(', '))+'.'+(can?'':' '+(CAMP?'Only the campaign owner can change this.':'Only the master key can change this.')+'')+'</span></div>'+(can?'<button class="btn sm" data-act="house">'+(house.on?'Turn off':'Turn on')+'</button>':'')+'</div>';
}
function traitField(s,c){
 const names=Object.keys(A.TRAITS);const cur=c.personality||'';const custom=cur&&!names.includes(cur);
 let h='<label class="field"><span class="lbl">Personality trait</span><select class="f" id="trait-'+s+'" data-trait="1"><option value="">Choose\u2026</option>'+names.map(n=>'<option'+(n===cur?' selected':'')+'>'+n+'</option>').join('')+(custom?'<option selected>'+esc(cur)+'</option>':'')+'</select></label>';
 const pend=edit.trait&&edit.trait.s===s?edit.trait.t:null;
 if(pend)h+='<div class="roll" role="status"><span>Changing from <b>'+esc(cur)+'</b> to <b>'+esc(pend)+'</b>. The book allows this with GM permission after a traumatic experience, for 2 XP.</span><div class="row"><button class="btn sm pri" data-act="traitxp" '+(c.xpUnused>=2?'':'disabled')+'>Change for 2 XP</button><button class="btn sm" data-act="traitfree">Just fixing a mistake (free)</button><button class="btn sm" data-act="traitcancel">Cancel</button></div></div>';
 h+=c.positive||c.negative?'<div class="grid2"><div><span class="lbl">Positive</span><p class="effect" style="margin:4px 0 0">'+esc(c.positive)+'</p></div><div><span class="lbl">Negative (when triggered)</span><p class="effect" style="margin:4px 0 0">'+esc(c.negative)+'</p></div></div>':'';
 return h;
}
function setTrait(s,t,cost){const c=chars[s];const d=A.TRAITS[t]||['',''];const p={personality:t,positive:d[0],negative:d[1]};if(cost)p.xpUnused=c.xpUnused-cost;edit.trait=null;save(s,p,t?(cost?'Changed personality trait to '+t+' (2 XP)':'Personality trait: '+t):'Cleared personality trait');}
function knackPicker(c){
 const kn=A.knacksFor(c.archetype);
 if(!kn.length)return '<p class="note" style="margin:0">Choose an archetype (under Player, archetype &amp; XP) to pick knacks from its list.</p><div class="row"><button class="btn sm" data-act="addfree" data-list="knacks">Add a knack by hand</button></div>';
 const owned=c.knacks.map(k=>k.name);
 return '<div class="row"><label class="field" style="flex:1;min-width:200px"><span class="lbl">'+esc(c.archetype)+' knacks (\u2605 unique)</span><select class="f" id="kpick-'+active+'" data-kpick="1"><option value="">Add a knack…</option>'+[1,2,3,4].map(t=>'<optgroup label="Tier '+t+' \u00b7 '+KNACK_COST[t]+' XP">'+kn.filter(k=>k.tier===t&&!owned.includes(k.name)).map(k=>'<option value="'+esc(k.name)+'"'+(kpickSel[active]===k.name?' selected':'')+'>'+(k.unique?'\u2605 ':'')+esc(k.name)+'</option>').join('')+'</optgroup>').join('')+'</select></label><button class="btn" data-act="kbuy">Buy with XP</button><button class="btn" data-act="kgrant">Add free</button></div>';
}
function gearPicker(s){
 const cats=['Protection','Useful items','Tools and personal','Outdoors'];
 return '<div class="row"><label class="field" style="flex:1;min-width:220px"><span class="lbl">Buy equipment</span><select class="f" id="gpick-'+s+'" data-pick="g"><option value="">Add equipment…</option>'+cats.map(ct=>'<optgroup label="'+ct+'">'+GR().map((g,i)=>g.cat===ct?'<option value="g:'+i+'"'+(pickSel['g'+s]==='g:'+i?' selected':'')+'>'+esc(g.n)+' \u2014 '+money(g.c)+'</option>':'').join('')+'</optgroup>').join('')+'</select></label><button class="btn" data-act="gbuy">Buy</button><button class="btn" data-act="gfree">Add free</button></div>';
}
function vehiclePicker(s){
 const c=chars[s];
 return '<div class="row"><label class="field" style="flex:1;min-width:220px"><span class="lbl">Get a vehicle</span><select class="f" id="vpick-'+s+'" data-pick="v"><option value="">Choose a vehicle…</option>'+GR().map((g,i)=>g.cat==='Transport'?'<option value="g:'+i+'"'+(pickSel['v'+s]==='g:'+i?' selected':'')+'>'+esc(g.n)+' \u2014 '+money(g.c)+'</option>':'').join('')+'</select></label><button class="btn" data-act="vbuy">Buy</button><button class="btn" data-act="vfree">Add free</button></div>';
}
function weaponPicker(s){
 const grp=(lab,sk)=>'<optgroup label="'+lab+'">'+W().map((w,i)=>w.s===sk?'<option value="w:'+i+'"'+(pickSel['w'+s]==='w:'+i?' selected':'')+'>'+esc(w.n)+(w.house?' (house rule)':'')+' \u2014 '+money(w.c)+'</option>':'').join('')+'</optgroup>';
 return '<div class="row"><label class="field" style="flex:1;min-width:220px"><span class="lbl">Get a weapon</span><select class="f" id="wpick-'+s+'" data-pick="w"><option value="">Add a weapon…</option>'+grp('Ranged','Ranged Combat')+grp('Melee','Melee Combat')+'</select></label><button class="btn" data-act="wbuy">Buy</button><button class="btn" data-act="wfree">Add free</button></div>';
}
function addGear(s,val,pay){
 const c=chars[s];const [t,i]=val.split(':');const it=t==='w'?W()[Number(i)]:GR()[Number(i)];if(!it)return;
 const m=Math.round(((Number(c.money)||0)-(pay?it.c:0))*100)/100;if(m<0)return toast('Not enough money. '+it.n+' costs '+money(it.c)+'.');
 const p={money:m};
 if(t==='w')p.weapons=[...c.weapons,{id:uid(),name:it.n,skill:it.s,range:it.r,dmg:it.d,inj:it.i,ammoMax:it.a,ammo:it.a,reloads:0,rc:it.rc,fr:!!it.fr,special:it.sp}];
 else if(it.cat==='Transport'){const v=(c.bg.vehicle||'').trim();p.bg={...c.bg,vehicle:v?v+', '+it.n:it.n};}
 else if(it.n==='Habitual Item')p.habitual={name:c.habitual.name||'Habitual item',used:!!c.habitual.used,uses:(c.habitual.uses||0)+1};
 else p.items=[...c.items,{id:uid(),name:it.n,note:it.note}];
 save(s,p,(pay?'Bought ':'Added ')+it.n+(pay?' for '+money(it.c):''));
}
function render(){
 const ae=document.activeElement;
 const inApp=ae&&ae.closest&&ae.closest('#app');
 // Only hold off while someone is typing in a text box; radios, checkboxes and dropdowns update right away.
 const typing=inApp&&(ae.tagName==='TEXTAREA'||(ae.tagName==='INPUT'&&!/^(radio|checkbox|range|file|button|submit)$/i.test(ae.type)));
 if(typing){pending=true;renderTabs();return;}
 // Don't refocus dropdowns: on phones that reopens the picker right after a choice.
 const keepId=inApp&&ae.id&&ae.tagName!=='SELECT'?ae.id:null;
 pending=false;
 if(halted){document.getElementById('tabs').innerHTML='';document.getElementById('app').innerHTML='<section class="sec"><h2>Can\u2019t open this campaign</h2><p class="note" style="margin:0">'+esc(halted)+'</p><div class="row"><a class="btn pri" href="./">Go to My campaigns</a></div></section>';return;}
 renderTabs();
 const app=document.getElementById('app');
 app.innerHTML=active==='party'?renderParty():active==='create'?renderCreator():active==='journal'?renderJournal():active==='gm'?renderGM():chars[active]?renderChar(active):renderParty();
 if(keepId){const el=document.getElementById(keepId);if(el)try{el.focus({preventScroll:true});}catch(e){}}
}
