/* Arkham Horror RPG Ledger — Drawing the page: tabs, party, investigator sheets, pickers, house rules.
   Part of the ledger; these files load in order and share their variables. */
// ---------- render ----------
// An investigator's status chips, most serious first; at most two show. Dead and Lost forever show alone.
function sheetStatuses(c){
 const inj=c.injuries.map(j=>j.name);
 if(inj.includes('Dead'))return[['bad',t('Dead')]];
 if(c.traumas.some(j=>j.name==='Lost Forever'))return[['bad',t('Lost forever')]];
 const out=[];
 if(inj.includes('Dire'))out.push(['bad',t('Dire')]);
 if(c.poolLimit===0)out.push(['bad',t('Wounded')]);
 if(!inj.includes('Dire')&&inj.length)out.push(['inj',t('Injured')]);
 if(c.traumas.length)out.push(['mind',t('Traumatized')]);
 if(c.horrorLimit>=Math.max(3,c.poolMax/2))out.push(['mind',t('Shaken')]);
 if(!inj.length&&c.poolLimit>0&&c.poolLimit<c.poolMax)out.push(['warn',t('Damaged')]);
 return out.length?out.slice(0,2):[['ok',t('Healthy')]];
}
const statusChips=c=>'<span class="chips">'+sheetStatuses(c).map(([cls,lab])=>'<span class="chip '+cls+'">'+lab+'</span>').join('')+'</span>';
function poolHtml(c,mini){
 let h='',k=0;const pend=()=>k++<c.horrorLimit;
 for(let i=0;i<c.horror;i++){k++;h+='<span class="die hor" title="'+t('Horror die')+'"></span>';}
 for(let i=0;i<c.regular;i++)h+=pend()?'<span class="die reg pend" title="'+t('Regular die — becomes a horror die on the next refill')+'"></span>':'<span class="die reg" title="'+t('Regular die')+'"></span>';
 for(let i=c.regular+c.horror;i<c.poolLimit;i++)h+=pend()?'<span class="die empty pend" title="'+t('Spent — refills as a horror die')+'"></span>':'<span class="die empty" title="'+t('Spent')+'"></span>';
 for(let i=c.poolLimit;i<c.poolMax;i++)h+='<span class="die lost" title="'+t('Lost to damage')+'"></span>';
 return '<div class="pool'+(mini?' mini':'')+'" aria-label="'+tn('{n} die in pool','{n} dice in pool',c.regular+c.horror)+'">'+h+'</div>';
}
function renderTabs(){
 const tb=document.getElementById('tabs');
 tb.innerHTML=['party',...SLOTS,'journal',...(CAMP&&!isGM()?[]:['gm']),'create'].map(s=>'<button class="tab" role="tab" data-tab="'+s+'" aria-selected="'+(s===active)+'">'+esc(s==='party'?t('Party'):s==='create'?t('+ New investigator'):s==='journal'?t('Journal'):s==='gm'?t('GM'):(chars[s].name||t('Investigator')))+'</button>').join('');
}
// The next meetup, set by the owner or GM in the campaign's Settings.
function nextSessionBar(){
 if(!CAMP||!camp||!window.sessionShown)return '';
 const ts=camp.nextSession,gmMe=camp.gmUid===authUid,can=camp.ownerUid===authUid||gmMe,set=gmMe||IS_LOCAL?'#gm':'./?settings='+encodeURIComponent(CAMP),go=gmMe?' data-act="gotogm"':'';
 if(!sessionShown(ts))return '';
 return '<div class="nextsess"><div class="grow"><span class="lbl">'+t('Next session')+' · <span data-cd="'+ts+'">'+esc(sessionRel(ts))+'</span></span><span><b>'+esc(sessionSpan(ts,camp.nextHours))+'</b>'+(camp.nextWhere?'<span class="note"> · '+placeHtml(camp.nextWhere)+'</span>':'')+'</span></div>'+
  calMenuHtml(camp.name,ts,camp.nextWhere,IS_LOCAL?null:CAMP,camp.nextHours)+(can?'<a class="btn sm" href="'+set+'"'+go+'>'+t('Change')+'</a>':'')+'</div>';
}
// The campaign's picture across the top of the Party tab; tap it to see the whole picture.
function partyBanner(){return CAMP&&camp&&imgOk(camp.photo)?'<img class="partybanner" src="'+camp.photo+'" alt="'+esc(camp.name)+'" data-zoom'+(imgOk(camp.photoFull)?' data-full="'+camp.photoFull+'"':'')+'>':'';}
function renderParty(){
 const tip='<div class="banner">'+t('Tap an investigator to open their sheet.')+' '+(IS_DEMO?t('This is a sample campaign, so nothing you change here is saved.'):IS_LOCAL?t('Everything is saved in this browser. Save it to an account to keep it safe and share it with your group.'):t('Every change syncs to everyone at the table.'))+'</div>';
 // With a campaign picture: the picture on the left, next session and the tip beside it (stacked on phones).
 const pic=partyBanner();
 let h=turnBar()+(pic?'<div class="partyhead">'+pic+'<div class="partyside">'+nextSessionBar()+tip+'</div></div>':nextSessionBar()+tip)+
  (CAMP&&!canAddSheet()?'<p class="note" style="margin:0">'+t('You have your investigator. Only the campaign owner can add more.')+'</p>':'')+
  (SLOTS.length<MAX_SLOTS&&canAddSheet()?'<div class="row"><button class="btn" data-act="addslot">'+(CAMP&&!keys.master?t('+ Create my investigator'):t('+ Add an investigator'))+'</button><span class="note">'+(rosterLocked?t('Publish the updated Firestore rules (see README) to add or remove investigators.'):t('Adds a blank sheet. Use the New investigator tab to build one step by step.'))+'</span></div>':'')+
  '<div class="party">';
 SLOTS.forEach(s=>{const c=chars[s];const lr=(c.log||[])[0];
  h+='<button class="pcard" data-tab="'+s+'"><div class="row" style="justify-content:space-between;width:100%"><div class="row" style="gap:10px;flex-wrap:nowrap">'+avatarHtml(c,'sm')+'<div><h3>'+esc(c.name)+'</h3><div class="note">'+esc([archLabel(c),c.player&&t('played by {name}',{name:c.player==='You'?t('You'):c.player})].filter(Boolean).join(' · ')||t('Unassigned'))+'</div></div></div>'+statusChips(c)+'</div>'+
  poolHtml(c,true)+
  '<div class="kv"><div><span class="lbl">'+t('Pool')+'</span><b>'+c.poolLimit+'/'+c.poolMax+'</b></div><div><span class="lbl">'+t('Horror')+'</span><b>'+c.horrorLimit+'</b></div><div><span class="lbl">'+t('Insight')+'</span><b>'+c.insight+'/'+c.insightLimit+'</b></div><div><span class="lbl">'+t('Injuries')+'</span><b>'+c.injuries.length+'</b></div></div>'+
  (lr?'<div class="log">'+t('Latest: {text}',{text:esc(logText(lr))})+'</div>':'')+'</button>';});
 h+='</div>';
 // In a campaign, players who aren't the GM only see the house rules here (and nothing at all if there are none).
 const gmBody=houseToggle()+(isGMView()?'<div class="row"><button class="btn pri" data-act="sessionAll">'+t('Start new session for everyone')+'</button><button class="btn" data-act="refillAll">'+t('Refill every pool')+'</button></div><p class="note" style="margin:0">'+t('A new session refills insight to its limit, frees habitual and lucky items and clears trauma roll penalties.')+' '+(CAMP?t('This covers every investigator in the campaign.'):t('With the master key or the GM PIN this covers every sheet.'))+'</p>':(CAMP?'':'<p class="note" style="margin:0">'+t('Starting a new session and refilling every pool need the GM PIN (on the GM tab) or the master key.')+'</p>'))+(!localMode&&!CAMP?(keys.master?'<div class="row"><span class="chip ok">'+t('Master key active')+'</span><span class="note">'+t('This device can edit every sheet.')+'</span><button class="btn sm" data-act="mforget">'+t('Remove master key from this device')+'</button></div>':'<div class="row"><input class="maxsel" style="width:170px" type="password" id="mkey" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="'+t('Master key')+'" aria-label="'+t('Master key')+'"><button class="btn sm" data-act="munlock">'+t('Use master key')+'</button></div>'):'');
 const gmTitle=!CAMP||isGMView()?t('Game Master'):t('House rules');
 if(gmBody)h+='<section class="sec gmsec"><div class="sec-head"><h2>'+gmTitle+'</h2></div>'+gmBody+'</section>';
 return h;
}
function fld(path,label,val,type,extra){return '<label class="field"><span class="lbl">'+label+'</span><input class="f" id="'+path.replace(/\./g,'-')+'" data-f="'+path+'" type="'+(type||'text')+'" value="'+esc(val)+'" '+(extra||'')+'></label>';}
function avatarHtml(c,size){const ini=esc(((c.name||'?').trim()[0]||'?').toUpperCase());return c.portrait?'<img class="avatar '+size+'" src="'+esc(c.portrait)+'" alt="'+t('Portrait of {name}',{name:esc(c.name)})+'"'+(size==='lg'?' data-zoom'+(imgOk(c.portraitFull)?' data-full="'+esc(c.portraitFull)+'"':'')+' title="'+t('See the full picture')+'"':'')+'>':'<span class="avatar '+size+'" aria-hidden="true">'+ini+'</span>';}
function shrinkImage(file){return new Promise((res,rej)=>{const img=new Image();const url=URL.createObjectURL(file);
 img.onload=()=>{const side=Math.min(img.width,img.height),S=320;const cv=document.createElement('canvas');cv.width=S;cv.height=S;const g=cv.getContext('2d');
  g.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,S,S);URL.revokeObjectURL(url);
  let q=0.82,d=cv.toDataURL('image/jpeg',q);while(d.length>120000&&q>0.4){q-=0.1;d=cv.toDataURL('image/jpeg',q);}res(d);};
 img.onerror=()=>{URL.revokeObjectURL(url);rej();};img.src=url;});}
// Portraits are saved at 800 px (shown small on the sheet, full size when tapped). A campaign kept only in this browser
// stores them inline, so there they stay small to save room.
function openCrop(file,slot){const big=!!CAMP&&!IS_LOCAL,S=big?800:320;
 openCropper(file,{title:t('Position the face in the circle'),shape:'circle',outW:S,outH:S,maxLen:big?500000:120000,full:big?{side:2000,maxLen:1000000}:null,onError:toast,onSave:(d,full)=>{toast(t('Saving portrait…'));const at='campaigns/'+CAMP+'/'+authUid;
  Promise.all([storeImage(d,at),full?storeImage(full,at):null]).then(([u,fu])=>{if(big&&!isStoredImage(u))return toast(t('Couldn’t upload the portrait. Check your connection and try again.'));save(slot,{portrait:u,portraitFull:isStoredImage(fu)?fu:''},logm('Changed portrait'));if(full&&!isStoredImage(fu))setTimeout(()=>toast(t('The head shot saved, but the full picture didn’t upload. Try adding it again.')),2700);});}});}
function ownerPanel(s){
 const c=chars[s],names=(camp&&camp.names)||{},own=c.ownerUid||null,mine=!!own&&own===authUid,boss=!!keys.master&&!!camp,gone=!!own&&!names[own];
 const who=own&&!gone?names[own]:null;
 // The owner picks the player right in the header; everyone else just sees who plays it.
 const head=boss?'<label class="row" style="gap:8px;align-items:center;flex-wrap:nowrap" for="assign-'+s+'"><span class="lbl" style="margin:0">'+t('Played by')+'</span><select class="maxsel" id="assign-'+s+'" data-assign="'+s+'" data-fit="1" aria-label="'+t('Who plays this investigator')+'" style="width:auto;font-weight:600"><option value="">'+t('Nobody yet')+'</option>'+(camp.memberIds||[]).map(u=>'<option value="'+esc(u)+'"'+(u===own?' selected':'')+'>'+esc(names[u]||t('Member'))+(u===authUid?' '+t('(you)'):'')+'</option>').join('')+'</select></label>'
  :'<span class="chip '+(mine?'ok':who?'':'warn')+'">'+(mine?t('Your investigator'):who?t('Played by {name}',{name:esc(who)}):t('Unclaimed'))+'</span>';
 const oe=!!(camp&&camp.ownerEdits===true);
 const note=mine?(oe?t('Only you, the campaign owner and the GM can change it.'):t('Only you and the GM can change it.')):boss?(oe?t('You can edit any investigator as the campaign owner.'):gmEditsOn()?t('You can edit any investigator as the GM.'):t('Locked to its player. You can change this in Settings.')):gmEditsOn()?t('You can edit any investigator as the GM.'):who?t('Only its player can change it.'):t('Nobody plays this investigator yet.');
 let h='<section class="sec" style="gap:10px"><div class="sec-head"><div class="row" style="align-items:center">'+head+'<span class="note">'+note+'</span></div><button class="btn sm" data-act="printc">'+t('Open printable sheet')+'</button></div>';
 let row='';
 if(!boss&&(!own||gone)&&canAddSheet())row+='<button class="btn sm pri" data-act="claim">'+t('This is my investigator')+'</button>';
 if(mine&&!boss)row+='<button class="btn sm" data-act="release">'+t('Give up this investigator')+'</button>';
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
 const c=chars[s];let h='<section class="sec" style="gap:10px"><div class="sec-head"><div class="row"><span class="chip '+(c.locked?(canEdit(s)?'ok':'warn'):'ok')+'">'+(c.locked?(canEdit(s)?(keys.master&&!keys[s]?t('Master key'):t('Unlocked on this device')):t('Locked')):t('No passcode'))+'</span><span class="note">'+(c.locked?(canEdit(s)?(keys.master&&!keys[s]?t('You’re editing with the master key.'):t('Others need the passcode to edit it.')):t('Enter the passcode to edit. Anyone can still view it.')):t('Anyone with the link can edit this sheet.'))+'</span></div><button class="btn sm" data-act="printc">'+t('Open printable sheet')+'</button></div>';
 if(localMode)return h+'</section>';
 const inp=(id,ph)=>'<input class="maxsel" style="width:150px" type="password" id="'+id+'-'+s+'" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="'+ph+'" aria-label="'+ph+'">';
 if(!c.locked)h+='<div class="row">'+inp('lockset',t('New passcode'))+'<button class="btn sm" data-act="lockset">'+t('Lock with passcode')+'</button></div>';
 else if(!canEdit(s))h+='<div class="row">'+inp('unlock',t('Passcode'))+'<button class="btn sm pri" data-act="unlock">'+t('Unlock')+'</button></div>';
 else h+='<div class="row"><button class="btn sm" data-act="lockoff">'+t('Remove passcode')+'</button>'+(keys[s]?'<button class="btn sm" data-act="forget">'+t('Lock this device')+'</button>':'')+'</div>';
 return h+'</section>';
}
function renderChar(s){ const body=renderCharBody(s); return turnBar()+lockPanel(s)+(canEdit(s)?body:'<fieldset disabled style="border:0;padding:0;margin:0;min-width:0;display:flex;flex-direction:column;gap:16px">'+body+'</fieldset>')+removePanel(s); }
function removePanel(s){
 const can=(!db&&localMode)||!!keys.master;const c=chars[s];
 if(!can)return '<p class="note" style="margin:0">'+(CAMP?t('Only the campaign owner can remove an investigator from the party.'):t('Only the master key can remove an investigator from the party.'))+'</p>';
 if(edit.rm===s)return '<section class="sec"><div class="roll" role="status"><span>'+t('Remove {name} from the party? Their sheet is deleted for everyone. This can’t be undone.',{name:'<b>'+esc(c.name||t('this investigator'))+'</b>'})+'</span><div class="row"><button class="btn sm dng" data-act="rmyes">'+t('Remove {name}',{name:esc(c.name||t('investigator'))})+'</button><button class="btn sm" data-act="rmno">'+t('Cancel')+'</button></div></div></section>';
 return '<div class="row"><button class="btn sm dng" data-act="rmslot">'+t('Remove this investigator from the party…')+'</button></div>';
}
const ownsSheet=()=>SLOTS.some(x=>chars[x]&&chars[x].ownerUid===authUid);
// In a campaign the owner can add any number of investigators; everyone else gets one of their own.
const canAddSheet=()=>!CAMP||!!keys.master||!ownsSheet();
function freeSlot(){for(let i=1;i<=MAX_SLOTS;i++){const id='p'+i;if(!SLOTS.includes(id))return id;}return null;}
async function addSlot(data){
 if(rosterLocked)return toast(t('Publish the updated Firestore rules first (see README).')),null;
 if(!canAddSheet())return toast(t('You already have your investigator. Only the campaign owner can add more.')),null;
 const id=freeSlot();if(!id)return toast(t('The party is full ({n} investigators).',{n:MAX_SLOTS})),null;
 const c=norm(data||blank(slotNum(id)),slotNum(id));c.locked=false;if(CAMP){c.ownerUid=authUid;if(camp&&camp.names&&camp.names[authUid]&&!data)c.player=camp.names[authUid];}
 chars[id]=c;SLOTS=[...SLOTS,id].sort((a,b)=>slotNum(a)-slotNum(b));
 if(db){try{if(CAMP&&!keys.master){const b=db.batch();b.set(db.doc('characters/'+id),JSON.parse(JSON.stringify(c)));b.set(db.doc('players/'+authUid),{slot:id});await b.commit();}else await db.doc('characters/'+id).set(JSON.parse(JSON.stringify(c)));}catch(e){toast(e&&e.code==='permission-denied'?t('Firebase refused that. Publish the updated rules (see README).'):t('Couldn’t add the investigator. Try again.'));SLOTS=SLOTS.filter(x=>x!==id);delete chars[id];render();return null;}}
 return id;
}
async function removeSlot(s){
 const name=chars[s]&&chars[s].name;
 const pu=CAMP&&chars[s]&&chars[s].ownerUid;
 if(db){try{await db.doc('characters/'+s).delete();if(CAMP){if(pu)await db.doc('players/'+pu).delete().catch(()=>{});}else await db.doc('locks/'+s).delete().catch(()=>{});}catch(e){toast(e&&e.code==='permission-denied'?(CAMP?t('Only the campaign owner can remove investigators.'):t('Only the master key can remove investigators (and the updated rules must be published).')):t('Couldn’t remove that investigator. Try again.'));return;}}
 SLOTS=SLOTS.filter(x=>x!==s);delete chars[s];edit.rm=null;go('party');toast(t('{name} was removed from the party.',{name:name||t('Investigator')}));
}
// The picture's edit control, just under the portrait: one Edit button that opens Change / Remove
// (clicking the portrait itself shows it full size). With no picture yet it's a plain Add picture button.
function picEdit(c,s){
 const file='<input type="file" accept="image/*" id="pic-'+s+'" data-pic="1" hidden>';
 if(!c.portrait)return '<label class="btn sm picedit" for="pic-'+s+'">'+t('Add picture')+'</label>'+file;
 return '<span class="placewrap picedit"><button type="button" class="btn sm" data-placemenu aria-haspopup="true" aria-expanded="false" aria-label="'+t('Edit picture')+'">'+t('Edit')+'<span class="placecaret" aria-hidden="true">▾</span></button>'+
  '<span class="placemenu" role="menu" hidden><label role="menuitem" for="pic-'+s+'" tabindex="0">'+t('Change picture')+'</label><button type="button" role="menuitem" class="dng" data-act="picdel">'+t('Remove')+'</button></span></span>'+file;
}
function renderCharBody(s){
 const c=chars[s];const rl=lastRoll[s];
 let h='<section class="sec"><div class="sheethead"><div class="shpic">'+avatarHtml(c,'lg')+(canEdit(s)?picEdit(c,s):'')+'</div><div class="shname"><input class="namein" id="nm-'+s+'" data-f="name" value="'+esc(c.name)+'" aria-label="'+t('Investigator name')+'">'+statusChips(c)+'</div></div></section>';
 if(c.insightChance)h+='<section class="sec">'+(c.insightChance?'<div class="roll" role="status"><span>'+t('<b>Momentous session.</b> You may raise your insight limit by 1 for 1 XP (once, now).')+'</span><div class="row"><button class="btn sm pri" data-act="buyins" '+(c.xpUnused>=1&&c.insightLimit<10?'':'disabled')+'>'+t('Raise it · 1 XP')+'</button><button class="btn sm" data-act="skipins">'+t('Not this time')+'</button></div></div>':'')+'</section>';

 // condition
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Dice pool')+'</h2><span class="note num">'+t('{n} in pool · limit {limit} of {max}',{n:c.regular+c.horror,limit:c.poolLimit,max:c.poolMax})+'</span></div>'+poolHtml(c)+
 '<div class="legend"><span>'+t('■ regular')+'</span><span style="color:var(--horror)">'+t('■ horror')+'</span><span>'+t('□ spent')+'</span><span style="color:var(--danger)">'+t('▨ lost to damage')+'</span><span style="color:var(--horror)">'+t('▢ green ring = becomes horror on refill')+'</span></div>'+
 '<div class="row"><button class="btn" data-act="spend" data-k="reg" '+(c.regular?'':'disabled')+'>'+t('Spend regular die')+'</button><button class="btn hor" data-act="spend" data-k="hor" '+(c.horror?'':'disabled')+'>'+t('Spend horror die')+'</button><button class="btn pri" data-act="refill">'+t('Refill pool')+'</button></div>'+
 '<div class="row"><button class="btn dng" data-act="dmg" data-n="1" title="'+t('Lowers the pool limit by 1. Tap once per point of damage.')+'" '+(c.poolLimit>0?'':'disabled')+'>'+t('Take damage')+'</button><button class="btn" data-act="heal" data-n="1" title="'+t('Raises the pool limit by 1.')+'" '+(c.poolLimit<c.poolMax?'':'disabled')+'>'+t('Heal')+'</button><button class="btn" data-act="rest" '+(c.poolLimit<c.poolMax?'':'disabled')+'>'+t('Full rest')+'</button><button class="btn" data-act="strain" '+(c.poolLimit<c.poolMax?'':'disabled')+'>'+t('Strain')+'</button></div>'+
 activeEffects(c)+
 '<p class="note" style="margin:0">'+t('Damage lowers the pool limit. At 0 you’re wounded. Straining restores the limit, then you roll an injury at the end of your turn.')+'</p></section>';

 // skills
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Skills')+'</h2><span class="note">'+t('Success on a roll at or above the rating. Lower is better.')+' <span class="chip">'+t('{n} unused XP',{n:c.xpUnused})+'</span></span></div><div class="skills">'+
 SKILLS.map(([k,n])=>{const sk=c.skills[k];const cost=SKILL_COST[sk.r];return '<div class="skill"><span class="nm">'+t(n)+'</span><label class="note" for="mx-'+k+'-'+s+'">'+t('max')+'</label><select class="maxsel" id="mx-'+k+'-'+s+'" data-skmax="'+k+'"><option value="">–</option>'+[4,3,2].map(v=>'<option value="'+v+'"'+(String(sk.max)===String(v)?' selected':'')+'>'+v+'+</option>').join('')+'</select><span class="rate">'+sk.r+'+</span><button class="btn sm" data-act="imp" data-k="'+k+'" '+(cost?'':'disabled')+' aria-label="'+t('Improve {skill}',{skill:t(n)})+'">'+(cost?t('↑ {n} XP',{n:cost}):t('Best'))+'</button></div>';}).join('')+
 '</div><details><summary class="note" style="cursor:pointer">'+t('Set ratings by hand')+'</summary><div class="wgrid" style="margin-top:8px">'+SKILLS.map(([k,n])=>'<label class="field"><span class="lbl">'+t(n)+'</span><select class="f" id="sr-'+k+'-'+s+'" data-skr="'+k+'">'+[6,5,4,3,2].map(v=>'<option value="'+v+'"'+(c.skills[k].r===v?' selected':'')+'>'+v+'+</option>').join('')+'</select></label>').join('')+'</div></details></section>';

 // weapons
 const shared=sharedAmmo(),totRel=c.weapons.reduce((a,w)=>a+(w.fr?0:(w.reloads||0)),0);
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Weapons')+'</h2><span class="chip">'+t('{amount} left',{amount:money(c.money)})+'</span>'+(shared?'<span class="chip ok" title="'+t('House rule')+'">'+t('Universal ammo')+' · '+tn('{n} reload shared','{n} reloads shared',totRel)+'</span>':'')+'</div>'+
 weaponPicker(s)+'<div class="row"><button class="btn sm" data-act="addw">'+t('Add a custom weapon')+'</button></div>'+
 '<p class="note" style="margin:0">'+t('Mark off ammo only when an attack rolls one or more 1s. Reloading is a simple action, or complex (Ranged Combat) under pressure.')+'</p><div class="list">'+
 (c.weapons.length?c.weapons.map(w=>{let pips='';for(let i=0;i<w.ammoMax;i++)pips+='<button class="pip'+(i<w.ammo?'':' spent')+'" data-act="ammo" data-id="'+w.id+'" data-n="'+i+'" aria-label="'+(i<w.ammo?t('Ammo {n} loaded',{n:i+1}):t('Ammo {n} spent',{n:i+1}))+'"></button>';
  return '<div class="item"><div class="grow"><input class="f" id="wn-'+w.id+'" data-list="weapons" data-id="'+w.id+'" data-key="name" value="'+esc(t(w.name||''))+'" placeholder="'+t('Weapon')+'" style="font-weight:600">'+
  '<div class="wgrid">'+[['skill',t('Skill')],['range',t('Range')],['dmg',t('Damage')],['inj',t('Injury rating')],['ammoMax',t('Ammo')],['special',t('Special')]].map(([k,l])=>'<label class="field"><span class="lbl">'+l+'</span><input class="f" id="w'+k+'-'+w.id+'" data-list="weapons" data-id="'+w.id+'" data-key="'+k+'" value="'+esc(k==='skill'||k==='range'||k==='special'?t(w[k]||''):w[k])+'" '+(k==='ammoMax'?'type="number" min="0" max="12"':'')+'></label>').join('')+'</div>'+
  (w.ammoMax>0?'<div class="ammo">'+pips+'<button class="btn sm" data-act="reload" data-id="'+w.id+'" '+(w.ammo>=w.ammoMax||(!w.fr&&!(gunPool(c.weapons,w)>0)&&!(shared&&totRel>0))?'disabled':'')+'>'+(w.fr?t('Reload (free)'):t('Reload'))+'</button>'+
   (w.fr?'':'<span class="note">'+t('Extra reloads')+(sameGuns(c.weapons,w).length>1?' '+t('(shared by your {n} × {weapon})',{n:sameGuns(c.weapons,w).length,weapon:esc(t(w.name))}):'')+'</span><div class="stepper"><button class="btn sm icon" data-act="wrel" data-id="'+w.id+'" data-n="-1" aria-label="'+t('One fewer reload for {weapon}',{weapon:esc(w.name?t(w.name):t('this gun'))})+'">−</button><b class="num">'+gunPool(c.weapons,w)+'</b><button class="btn sm icon" data-act="wrel" data-id="'+w.id+'" data-n="1" aria-label="'+t('One more reload for {weapon}',{weapon:esc(w.name?t(w.name):t('this gun'))})+'">+</button></div>'+(w.rc?'<button class="btn sm" data-act="buyrel" data-id="'+w.id+'">'+t('Buy one · {price}',{price:money(w.rc)})+'</button>':''))+'</div>':'')+
  '</div><button class="btn sm icon" data-act="del" data-list="weapons" data-id="'+w.id+'" aria-label="'+t('Remove weapon')+'">×</button></div>';}).join(''):'<p class="note">'+t('No weapons.')+'</p>')+
 '</div></section>';

 // kits & supplies: items with use circles (first aid and surgeon kits, tool kits, lights), marked like ammo
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Kits &amp; supplies')+'</h2><span class="chip">'+t('{amount} left',{amount:money(c.money)})+'</span></div>'+
 kitPicker(s)+'<p class="note" style="margin:0">'+t('Mark a use when you roll a 1 while using it (tool kits: mark one to get their bonus). When every circle is marked, replenish it.')+'</p><div class="list">'+
 (c.kits.length?c.kits.map(k=>{let pips='';for(let i=0;i<k.uses;i++)pips+='<button class="pip'+(i<k.left?'':' spent')+'" data-act="kitmark" data-id="'+k.id+'" data-n="'+i+'" aria-label="'+(i<k.left?t('Use {n} left',{n:i+1}):t('Use {n} marked',{n:i+1}))+'"></button>';
  const cost=k.once?k.c:k.rp;
  return '<div class="item"><div class="grow"><input class="f" id="kn-'+k.id+'" data-list="kits" data-id="'+k.id+'" data-key="name" value="'+esc(t(k.name||''))+'" placeholder="'+t('Kit or supply')+'" style="font-weight:600">'+
  '<input class="f" id="ko-'+k.id+'" data-list="kits" data-id="'+k.id+'" data-key="note" value="'+esc(t(k.note||''))+'" placeholder="'+t('What it does')+'">'+
  '<div class="wgrid"><label class="field"><span class="lbl">'+t('Uses')+'</span><input class="f" id="ku-'+k.id+'" data-list="kits" data-id="'+k.id+'" data-key="uses" type="number" min="0" max="12" value="'+k.uses+'"></label>'+
  '<label class="field"><span class="lbl">'+(k.once?t('Price of a new one'):t('Replenish cost'))+'</span><input class="f" id="kc-'+k.id+'" data-list="kits" data-id="'+k.id+'" data-key="'+(k.once?'c':'rp')+'" type="number" min="0" step="0.01" value="'+(Number(cost)||0)+'"></label></div>'+
  (k.uses>0?'<div class="ammo">'+pips+(cost>0?'<button class="btn sm" data-act="kitfill" data-id="'+k.id+'" '+(k.left>=k.uses?'disabled':'')+'>'+(k.once?t('Buy a new one · {price}',{price:money(cost)}):t('Replenish · {price}',{price:money(cost)}))+'</button>':'')+
   '<button class="btn sm" data-act="kitfree" data-id="'+k.id+'" '+(k.left>=k.uses?'disabled':'')+'>'+t('Refill (free)')+'</button></div>':'')+
  '</div><button class="btn sm icon" data-act="del" data-list="kits" data-id="'+k.id+'" aria-label="'+t('Remove item')+'">×</button></div>';}).join(''):'<p class="note">'+t('No kits or supplies.')+'</p>')+
 '</div><p class="note" style="margin:0"><button class="linkbtn" data-act="addkit">'+t('Add your own')+'</button></p></section>';

 // horror & insight
 h+='<section class="sec"><div class="grid2"><div style="display:flex;flex-direction:column;gap:10px"><h2>'+t('Horror')+'</h2><div class="row"><div class="stat"><span class="lbl">'+t('Horror dice limit')+'</span><b class="num">'+c.horrorLimit+'</b></div><button class="btn hor" data-act="hor" data-n="1">'+t('Suffer 1')+'</button><button class="btn" data-act="hor" data-n="-1" '+(c.horrorLimit?'':'disabled')+'>'+t('Remove 1')+'</button></div>'+
 '<div class="row">'+fld('habitual.name',t('Habitual item'),t(c.habitual.name||''),'text','placeholder="'+t('e.g. Stick of gum')+'"')+'<span class="stepper"><button class="btn sm icon" data-act="habitdrop" '+(c.habitual.uses>0?'':'disabled')+' aria-label="'+t('Remove one (no effect, no refund)')+'" title="'+t('Remove one (no effect, no refund)')+'">−</button><span class="num" title="'+t('How many you have')+'" style="white-space:nowrap">× '+c.habitual.uses+'</span></span><button class="btn" data-act="habit" '+(c.habitual.used||!c.horrorLimit||c.habitual.uses<=0?'disabled':'')+'>'+(c.habitual.used?t('Used this session'):c.habitual.uses<=0?t('None left'):t('Use one (−1 horror)'))+'</button><button class="btn sm" data-act="buyhabit">'+t('Buy another $1')+'</button><span class="note">'+t('{amount} left',{amount:money(c.money)})+'</span></div>'+
 '<p class="note" style="margin:0">'+t('Refills put horror dice in first. A 1 on a horror die means a trauma. Introspection (Resolve) or counseling (Presence) also removes 1.')+'</p></div>'+
 '<div style="display:flex;flex-direction:column;gap:10px"><h2>'+t('Insight')+'</h2><div class="row"><div class="stat"><span class="lbl">'+t('Insight')+'</span><b class="num">'+c.insight+' / '+c.insightLimit+'</b></div><button class="btn" data-act="ins" data-n="-1" '+(c.insight?'':'disabled')+'>'+t('Spend 1')+'</button><button class="btn" data-act="ins" data-n="1" '+(c.insight<c.insightLimit?'':'disabled')+'>'+t('Regain 1')+'</button></div>'+
 '<p class="note" style="margin:0">'+t('Spend for +1 success after a success, advantage before a roll, a clue, or a handy detail in the scene.')+'</p>'+
 '<div class="row">'+fld('lucky.name',t('Lucky item'),t(c.lucky.name||''),'text','placeholder="'+t('e.g. Grandpa’s silver dollar')+'"')+'<button class="btn" data-act="lucky" '+(c.lucky.used||!c.lucky.name||c.insight>=c.insightLimit?'disabled':'')+'>'+(c.lucky.used?t('Used this session'):t('Use it (+1 insight)'))+'</button></div>'+
 traitField(s,c)+'</div></div></section>';

 // knacks
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Knacks')+'</h2><span class="chip">'+t('{n} unused XP',{n:c.xpUnused})+'</span></div>'+knackPicker(c)+
 '<div class="list">'+(c.knacks.length?c.knacks.map(k=>'<div class="item"><span class="tier">T'+k.tier+'</span><div class="grow"><input class="f" id="kn-'+k.id+'" data-list="knacks" data-id="'+k.id+'" data-key="name" value="'+esc(t(k.name||''))+'" placeholder="'+t('Knack name')+'" style="font-weight:600"><textarea class="f" id="kt-'+k.id+'" data-list="knacks" data-id="'+k.id+'" data-key="text" placeholder="'+t('What it does')+'">'+esc(A.knackShown(k))+'</textarea></div><button class="btn sm icon" data-act="del" data-list="knacks" data-id="'+k.id+'" aria-label="'+t('Remove knack')+'">×</button></div>').join(''):'<p class="note">'+t('No knacks yet.')+'</p>')+'</div>'+'</section>';

 // injuries & trauma
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Injuries &amp; traumas')+'</h2></div>'+
 '<div class="grid2"><div><span class="lbl">'+t('Injuries')+'</span>'+
 '<div class="row"><select class="maxsel" id="injsel-'+s+'" data-addinj="1" aria-label="'+t('Add an injury')+'" style="flex:1;min-width:0"><option value="">'+t('Add an injury…')+'</option>'+injuryOptions()+'</select></div>'+
 '<p class="note" style="margin:6px 0">'+(c.injuries.length?t('Roll 1d6 + {n} at the table (+1 for each injury you already have), then pick the result.',{n:c.injuries.length}):t('Roll 1d6 at the table, then pick the result.'))+' '+t('A fall of 10 ft or more rolls 1d3 instead, plus 1d3 for every 10 ft beyond the first. Fire, lack of air, poison and disease give a unique injury, no roll.')+'</p>'+
 '<div class="list">'+(c.injuries.length?c.injuries.map(j=>{const e=injuryInfo(j.name);return '<div class="item"><div class="grow"><b>'+esc(t(j.name))+'</b>'+(e?'<span class="effect">'+esc(t(e[1]))+'</span>':'')+'</div><button class="btn sm" data-act="healinj" data-id="'+j.id+'">'+t('Healed')+'</button></div>';}).join(''):'<p class="note">'+t('None.')+'</p>')+'</div></div>'+
 '<div><span class="lbl">'+t('Traumas')+(c.traumaMod?' · '+t('+{n} to trauma rolls this session',{n:c.traumaMod}):'')+'</span>'+(c.traumaMod?' <button class="linkbtn note" data-act="traclear">'+t('Clear')+'</button>':'')+
 '<div class="row"><select class="maxsel" id="trasel-'+s+'" data-addtra="1" aria-label="'+t('Add a trauma')+'" style="flex:1;min-width:0"><option value="">'+t('Add a trauma…')+'</option>'+Object.keys(TRAUMA_AT).map(k=>'<option value="'+esc(k)+'">'+TRAUMA_ROLL[k]+' · '+esc(t(k))+'</option>').join('')+'</select></div>'+
 '<p class="note" style="margin:6px 0">'+(c.traumaMod?t('Roll 1d6 + the number of 1s on your horror dice + {n} at the table, then pick the result.',{n:c.traumaMod}):t('Roll 1d6 + the number of 1s on your horror dice at the table, then pick the result.'))+'</p>'+
 '<div class="list">'+(c.traumas.length?c.traumas.map(j=>'<div class="item"><div class="grow"><b>'+esc(t(j.name))+'</b><span class="effect">'+esc(t(traumaFor(TRAUMA_AT[j.name]||1)[1]))+'</span></div><button class="btn sm" data-act="deltra" data-id="'+j.id+'">'+t('Clear')+'</button></div>').join(''):'<p class="note">'+t('None.')+'</p>')+'</div></div></div></section>';

 // resources
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Money &amp; equipment')+'</h2></div><div class="row"><div class="stat"><span class="lbl">'+t('Money')+'</span><b class="num">'+money(c.money)+'</b></div>'+
 [-1,-0.25,0.25,1,5].map(d=>'<button class="btn sm" data-act="cash" data-n="'+d+'">'+(d<0?'−':'+')+money(Math.abs(d))+'</button>').join('')+
 '</div>'+gearPicker(s)+'<div class="row"><label class="row note" for="cash-'+s+'">'+t('Amount')+' <input id="cash-'+s+'" class="maxsel" style="width:80px" type="number" step="0.01" min="0" placeholder="0.00"></label><button class="btn sm" data-act="cashin">'+t('Add')+'</button><button class="btn sm" data-act="cashout">'+t('Spend')+'</button><button class="btn sm" data-act="cashset" title="'+t('Replace the current money with this amount')+'">'+t('Set to this')+'</button></div>'+
 '<div class="list">'+(c.items.length?c.items.map(it=>'<div class="item"><div class="grow"><input class="f" id="in-'+it.id+'" data-list="items" data-id="'+it.id+'" data-key="name" value="'+esc(t(it.name||''))+'" placeholder="'+t('Item')+'" style="font-weight:600"><input class="f" id="io-'+it.id+'" data-list="items" data-id="'+it.id+'" data-key="note" value="'+esc(t(it.note||''))+'" placeholder="'+t('Notes or rules')+'"></div><button class="btn sm icon" data-act="del" data-list="items" data-id="'+it.id+'" aria-label="'+t('Remove item')+'">×</button></div>').join(''):'<p class="note">'+t('No equipment.')+'</p>')+
 '</div><div class="row"><button class="btn sm" data-act="addi">'+t('Add item')+'</button></div>'+vehiclePicker(s)+'<div class="grid2">'+fld('bg.vehicle',t('Vehicle'),c.bg.vehicle)+fld('bg.lodging',t('Lodging'),c.bg.lodging)+'</div></section>';

 h+='<details class="sec"><summary><h2>'+t('Tomes, relics &amp; debts')+'</h2></summary><div class="grid2"><label class="field"><span class="lbl">'+t('Tomes')+'</span><textarea class="f" id="tomes-'+s+'" data-f="tomes">'+esc(c.tomes)+'</textarea></label><label class="field"><span class="lbl">'+t('Relics')+'</span><textarea class="f" id="relics-'+s+'" data-f="relics">'+esc(c.relics)+'</textarea></label></div><label class="field"><span class="lbl">'+t('Eldritch debts or favors')+'</span><textarea class="f" id="debts-'+s+'" data-f="debts">'+esc(c.debts)+'</textarea></label></details>';

 // player, archetype & experience
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Player, archetype &amp; XP')+'</h2></div>'+
 '<div class="grid2">'+fld('player',t('Player'),c.player)+'<label class="field"><span class="lbl">'+t('Archetype')+'</span><select class="f" id="arch-'+s+'" data-f="archetype"><option value="">'+t('Choose…')+'</option>'+ARCH.map(a=>'<option value="'+a+'"'+(a===c.archetype?' selected':'')+'>'+t(a)+'</option>').join('')+'</select></label></div>'+
 '<div class="row"><div class="stat"><span class="lbl">'+t('Total XP')+'</span><b class="num">'+c.xpTotal+'</b></div><div class="stat"><span class="lbl">'+t('Unused XP')+'</span><b class="num">'+c.xpUnused+'</b></div><div class="row" style="gap:6px;align-items:center"><span class="note">'+t('Award XP')+'</span><div class="stepper"><button class="btn sm icon" data-act="xpamt" data-n="-1" aria-label="'+t('One less XP')+'">−</button><input id="xpamt-'+s+'" data-xpamt="1" class="maxsel num" type="number" inputmode="numeric" min="1" max="30" value="'+(xpAmt[s]||1)+'" aria-label="'+t('XP to award')+'" style="width:56px;text-align:center"><button class="btn sm icon" data-act="xpamt" data-n="1" aria-label="'+t('One more XP')+'">+</button></div><button class="btn sm pri" data-act="xpaward">'+t('Add')+'</button><button class="btn sm" data-act="xpfix">'+t('Fix XP…')+'</button></div></div>'+'<p class="note" style="margin:4px 0 0">'+t('The book suggests 1 XP per hour played, plus 1–3 for big moments.')+'</p>'+
 (edit.xp?'<div class="row">'+fld('xpTotal',t('Total XP'),c.xpTotal,'number','min="0" style="width:110px"')+fld('xpUnused',t('Unused XP'),c.xpUnused,'number','min="0" style="width:110px"')+'</div>':'')+
 '<div class="costs"><span>'+t('Skill 6+ → 5+')+'</span><span>'+t('2 XP')+'</span><span>'+t('Skill 5+ → 4+')+'</span><span>'+t('4 XP')+'</span><span>'+t('Skill 4+ → 3+ (archetype skills)')+'</span><span>'+t('7 XP')+'</span><span>'+t('Skill 3+ → 2+ (archetype skills)')+'</span><span>'+t('12 XP')+'</span><span>'+t('+1 insight limit (after a momentous session)')+'</span><span>'+t('1 XP')+'</span></div>'+
 '<div class="row"><button class="btn sm" data-act="buyins">'+t('Raise insight limit · 1 XP')+'</button></div>'+mcPanel(s,c)+'</section>';

 h+='<details class="sec"><summary><h2>'+t('Background')+'</h2></summary><div class="grid2">'+fld('bg.origin',t('Place of origin'),c.bg.origin)+fld('bg.family',t('Family & friends'),c.bg.family)+fld('bg.employment',t('Employment'),c.bg.employment)+fld('bg.salary',t('Weekly salary'),c.bg.salary)+fld('bg.encounter',t('First supernatural encounter'),c.bg.encounter)+fld('bg.enemies',t('Notable enemies'),c.bg.enemies)+'</div></details>';

 const gm=fullEdit()&&!localMode;
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Recent')+'</h2><div class="row">'+(gm&&(c.log||[]).length?'<button class="btn sm dng" data-act="clearlog">'+t('Clear all')+'</button>':'')+'<button class="btn sm" data-act="session">'+t('New session')+'</button></div></div><div class="log">'+((c.log||[]).length?c.log.map(l=>'<span class="row" style="gap:6px;flex-wrap:nowrap">'+(gm?'<button class="btn sm icon" style="min-height:24px;width:24px" data-act="dellog" data-n="'+l.t+'" aria-label="'+t('Remove this entry')+'">×</button>':'')+'<span>'+new Date(l.t).toLocaleString(I18N.locale, {weekday:'short',hour:'numeric',minute:'2-digit'})+' — '+esc(logText(l))+(logBy(l)?' <span class="by">'+esc(logBy(l))+'</span>':'')+'</span></span>').join(''):t('Nothing yet.'))+'</div>'+(gm?'<p class="note" style="margin:0">'+(CAMP?t('As the campaign owner, you can remove entries.'):t('Master key: you can remove entries.'))+'</p>':'')+'</section>';
 return h;
}
function activeEffects(c){
 const a=c.injuries.map(j=>{const e=injuryInfo(j.name);return '<div class="note"><b style="color:var(--danger)">'+esc(t(j.name))+'</b>'+(e?' — '+esc(t(e[1])):'')+'</div>';})
  .concat(c.traumas.map(j=>'<div class="note"><b style="color:var(--horror)">'+esc(t(j.name))+'</b> — '+esc(t(traumaFor(TRAUMA_AT[j.name]||1)[1]))+'</div>'));
 return a.length?'<div style="display:flex;flex-direction:column;gap:4px"><span class="lbl">'+t('Affecting you now')+'</span>'+a.join('')+'</div>':'';
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
 const [cls,lab,note]=!gmClaimed?['warn',t('No GM PIN'),t('Whoever runs the game sets a PIN here. After that only devices with the PIN can run these tools.')]
  :gmk?['ok',t('Unlocked on this device'),t('Others need the GM PIN to run these tools.')]
  :mk?['ok',t('Master key'),t('You can view the GM tools. Only the GM PIN can change them.')]
  :['warn',t('Locked'),t('Enter the GM PIN to run the GM tools.')];
 const inp=ph=>'<input class="maxsel" style="width:150px" type="password" id="gmpin" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="'+ph+'" aria-label="'+ph+'">';
 let h='<section class="sec" style="gap:10px"><div class="sec-head"><div class="row"><span class="chip '+cls+'">'+lab+'</span><span class="note">'+note+'</span></div></div>';
 if(!gmClaimed)h+='<div class="row">'+inp(t('New GM PIN'))+'<button class="btn sm pri" data-act="gmset">'+t('Set GM PIN')+'</button></div>';
 else if(gmk)h+=edit.gmclear?'<div class="row"><span class="note">'+t('Remove the GM PIN? Anyone can then set a new one and take over the GM tools. Your enemies, clues, notes and log stay.')+'</span><button class="btn sm dng" data-act="gmclear">'+t('Yes, remove it')+'</button><button class="btn sm" data-act="gmclearno">'+t('Cancel')+'</button></div>'
  :'<div class="row">'+inp(t('New GM PIN'))+'<button class="btn sm" data-act="gmset">'+t('Change GM PIN')+'</button><button class="btn sm" data-act="gmforget">'+t('Lock this device')+'</button><button class="btn sm" data-act="gmclearask">'+t('Remove GM PIN')+'</button></div>';
 else h+='<div class="row">'+inp(t('GM PIN'))+'<button class="btn sm pri" data-act="gmunlock">'+t('Unlock')+'</button>'+(mk?'<button class="btn sm" data-act="gmreset">'+t('Reset GM PIN')+'</button>':'')+'</div>';
 return h+'</section>';
}
function houseToggle(){
 const hr=HR();const names=[...(hr.rules||[]),...(hr.weapons||[]),...(hr.gear||[])].map(x=>x.n).filter(Boolean);
 if(!names.length)return CAMP&&keys.master&&!IS_LOCAL?'<p class="note" style="margin:0 0 8px">'+t('No house rules yet. Add custom weapons, gear or rule changes in {settings}.',{settings:'<a href="./?settings='+encodeURIComponent(CAMP)+'">'+t('Settings')+'</a>'})+'</p>':'';
 const can=(!db&&localMode)||!!keys.master;
 return '<div class="item" style="padding:0 0 8px"><div class="grow"><b>'+(CAMP&&!isGMView()?'':t('House rules')+' ')+(house.on?'<span class="chip ok">'+t('On')+'</span>':'<span class="chip warn">'+t('Off')+'</span>')+'</b><span class="effect">'+t('Adds: {list}.',{list:esc(names.map(n=>t(n)).join(', '))})+(can?'':' '+(CAMP?t('Only the campaign owner can change this.'):t('Only the master key can change this.'))+'')+'</span></div>'+(can?'<button class="btn sm" data-act="house">'+(house.on?t('Turn off'):t('Turn on'))+'</button>':'')+'</div>';
}
function traitField(s,c){
 const names=Object.keys(A.TRAITS);const cur=c.personality||'';const custom=cur&&!names.includes(cur);
 let h='<label class="field"><span class="lbl">'+t('Personality trait')+'</span><select class="f" id="trait-'+s+'" data-trait="1"><option value="">'+t('Choose…')+'</option>'+names.map(n=>'<option value="'+n+'"'+(n===cur?' selected':'')+'>'+t(n)+'</option>').join('')+(custom?'<option selected>'+esc(cur)+'</option>':'')+'</select></label>';
 const pend=edit.trait&&edit.trait.s===s?edit.trait.t:null;
 if(pend)h+='<div class="roll" role="status"><span>'+t('Changing from {from} to {to}. The book allows this with GM permission after a traumatic experience, for 2 XP.',{from:'<b>'+esc(t(cur))+'</b>',to:'<b>'+esc(t(pend))+'</b>'})+'</span><div class="row"><button class="btn sm pri" data-act="traitxp" '+(c.xpUnused>=2?'':'disabled')+'>'+t('Change for 2 XP')+'</button><button class="btn sm" data-act="traitfree">'+t('Just fixing a mistake (free)')+'</button><button class="btn sm" data-act="traitcancel">'+t('Cancel')+'</button></div></div>';
 h+=c.positive||c.negative?'<div class="grid2"><div><span class="lbl">'+t('Positive')+'</span><p class="effect" style="margin:4px 0 0">'+esc(t(c.positive||''))+'</p></div><div><span class="lbl">'+t('Negative (when triggered)')+'</span><p class="effect" style="margin:4px 0 0">'+esc(t(c.negative||''))+'</p></div></div>':'';
 return h;
}
function setTrait(s,tr,cost){const c=chars[s];const d=A.TRAITS[tr]||['',''];const p={personality:tr,positive:d[0],negative:d[1]};if(cost)p.xpUnused=c.xpUnused-cost;edit.trait=null;save(s,p,tr?(cost?logm('Changed personality trait to {trait} (2 XP)',{trait:tr}):logm('Personality trait: {trait}',{trait:tr})):logm('Cleared personality trait'));}
// Multiclassing (book p. 67), in the XP section.
function mcPanel(s,c){
 if(c.mc)return '<div class="row" style="align-items:center"><span class="chip ok">'+(mcArch(c)?t('Multiclassed: {archetype}',{archetype:esc(t(mcArch(c)))}):t('Multiclassed within {archetype}',{archetype:esc(t(c.archetype))}))+'</span><span class="note">'+(mcArch(c)?t('Knacks and skill limits from both archetypes. Dice pool max +1.'):t('2 more tier 1 knacks and 1 more of tiers 2–4. Dice pool max +1.'))+'</span>'+(fullEdit()?'<button class="linkbtn note" data-act="unmulticlass">'+t('Undo (gives the 20 XP back)')+'</button>':'')+'</div>';
 if(!c.archetype)return '';
 const sp=xpSpent(c);
 if(sp<MC_AT)return '<p class="note" style="margin:0">'+t('Multiclassing opens at {at} XP spent ({n} to go): 20 XP for +1 dice pool max and a second archetype, or more knacks in your own.',{at:MC_AT,n:MC_AT-sp})+'</p>';
 return '<div class="row"><label class="field" style="flex:1;min-width:200px"><span class="lbl">'+t('Multiclass')+'</span><select class="f" id="mcpick-'+s+'"><option value="">'+t('Choose…')+'</option><option value="'+esc(c.archetype)+'">'+t('Stay a {archetype} (more knacks)',{archetype:esc(t(c.archetype))})+'</option><optgroup label="'+t('Second archetype')+'">'+Object.keys(A.ARCH).filter(a=>a!==c.archetype).map(a=>'<option value="'+esc(a)+'">'+esc(t(a))+'</option>').join('')+'</optgroup></select></label><button class="btn" data-act="multiclass">'+t('Multiclass · 20 XP')+'</button></div><p class="note" style="margin:0">'+t('You’ve spent {n} XP, so you can multiclass: +1 dice pool max, and either a second archetype (its knacks and skill limits) or 2 more tier 1 knacks and 1 more of tiers 2–4 in your own.',{n:sp})+'</p>';
}
function knackPicker(c){
 const kn=A.knacksFor(c.archetype),m=mcArch(c);
 if(!kn.length)return '<p class="note" style="margin:0">'+t('Choose an archetype (under Player, archetype &amp; XP) to pick knacks from its list.')+'</p><div class="row"><button class="btn sm" data-act="addfree" data-list="knacks">'+t('Add a knack by hand')+'</button></div>';
 const owned=c.knacks.map(k=>k.name);
 const opts=m?[c.archetype,m].map(a=>[1,2,3,4].map(tier=>'<optgroup label="'+t('{archetype} · tier {n} · {xp} XP',{archetype:t(a),n:tier,xp:KNACK_COST[tier]})+'">'+A.knacksFor(a).filter(k=>k.tier===tier&&!owned.includes(k.name)).map(k=>'<option value="'+esc(a+'|'+k.name)+'"'+(kpickSel[active]===a+'|'+k.name?' selected':'')+'>'+(k.unique?'★ ':'')+esc(t(k.name))+'</option>').join('')+'</optgroup>').join('')).join(''):null;
 return '<div class="row"><label class="field" style="flex:1;min-width:200px"><span class="lbl">'+t('{archetype} knacks (★ unique)',{archetype:esc(archLabel(c))})+'</span><select class="f" id="kpick-'+active+'" data-kpick="1"><option value="">'+t('Add a knack…')+'</option>'+(opts||[1,2,3,4].map(tier=>'<optgroup label="'+t('Tier {n} · {xp} XP',{n:tier,xp:KNACK_COST[tier]})+'">'+kn.filter(k=>k.tier===tier&&!owned.includes(k.name)).map(k=>'<option value="'+esc(k.name)+'"'+(kpickSel[active]===k.name?' selected':'')+'>'+(k.unique?'★ ':'')+esc(t(k.name))+'</option>').join('')+'</optgroup>').join(''))+'</select></label><button class="btn" data-act="kbuy">'+t('Buy with XP')+'</button><button class="btn" data-act="kgrant">'+t('Add free')+'</button></div>';
}
function gearPicker(s){
 const cats=['Protection','Useful items','Tools and personal','Outdoors','Fares and fuel','Around town'];
 return '<div class="row"><label class="field" style="flex:1;min-width:220px"><span class="lbl">'+t('Buy equipment')+'</span><select class="f" id="gpick-'+s+'" data-pick="g"><option value="">'+t('Add equipment…')+'</option>'+cats.map(ct=>'<optgroup label="'+t(ct)+'">'+GR().map((g,i)=>g.cat===ct&&!g.u?'<option value="g:'+i+'"'+(pickSel['g'+s]==='g:'+i?' selected':'')+'>'+esc(t(g.n))+' — '+money(g.c)+'</option>':'').join('')+'</optgroup>').join('')+'</select></label><button class="btn" data-act="gbuy">'+t('Buy')+'</button><button class="btn" data-act="gfree">'+t('Add free')+'</button></div>'+pickDesc('g'+s);
}
// the chosen item's description, under its picker
function pickDesc(key){const v=pickSel[key];if(!v)return '';const g=GR()[Number(v.split(':')[1])];return g&&g.note?'<p class="note pickdesc">'+esc(t(g.note))+'</p>':'';}
function kitPicker(s){
 return '<div class="row"><label class="field" style="flex:1;min-width:220px"><span class="lbl">'+t('Get a kit or supply')+'</span><select class="f" id="kitpick-'+s+'" data-pick="k"><option value="">'+t('Choose one…')+'</option>'+GR().map((g,i)=>g.u?'<option value="g:'+i+'"'+(pickSel['k'+s]==='g:'+i?' selected':'')+'>'+esc(t(g.n))+' — '+money(g.c)+'</option>':'').join('')+'</select></label><button class="btn" data-act="kitbuy">'+t('Buy')+'</button><button class="btn" data-act="kitadd">'+t('Add free')+'</button></div>'+pickDesc('k'+s);
}
function vehiclePicker(s){
 const c=chars[s];
 return '<div class="row"><label class="field" style="flex:1;min-width:220px"><span class="lbl">'+t('Get a vehicle')+'</span><select class="f" id="vpick-'+s+'" data-pick="v"><option value="">'+t('Choose a vehicle…')+'</option>'+GR().map((g,i)=>g.cat==='Transport'?'<option value="g:'+i+'"'+(pickSel['v'+s]==='g:'+i?' selected':'')+'>'+esc(t(g.n))+' — '+money(g.c)+'</option>':'').join('')+'</select></label><button class="btn" data-act="vbuy">'+t('Buy')+'</button><button class="btn" data-act="vfree">'+t('Add free')+'</button></div>'+pickDesc('v'+s);
}
function weaponPicker(s){
 const grp=(lab,sk)=>'<optgroup label="'+lab+'">'+W().map((w,i)=>w.s===sk?'<option value="w:'+i+'"'+(pickSel['w'+s]==='w:'+i?' selected':'')+'>'+esc(t(w.n))+(w.house?' '+t('(house rule)'):'')+' — '+money(w.c)+'</option>':'').join('')+'</optgroup>';
 return '<div class="row"><label class="field" style="flex:1;min-width:220px"><span class="lbl">'+t('Get a weapon')+'</span><select class="f" id="wpick-'+s+'" data-pick="w"><option value="">'+t('Add a weapon…')+'</option>'+grp(t('Ranged'),'Ranged Combat')+grp(t('Melee'),'Melee Combat')+'</select></label><button class="btn" data-act="wbuy">'+t('Buy')+'</button><button class="btn" data-act="wfree">'+t('Add free')+'</button></div>';
}
function addGear(s,val,pay){
 const c=chars[s];const [ty,i]=val.split(':');const it=ty==='w'?W()[Number(i)]:GR()[Number(i)];if(!it)return;
 const m=Math.round(((Number(c.money)||0)-(pay?it.c:0))*100)/100;if(m<0)return toast(t('Not enough money. {item} costs {price}.',{item:t(it.n),price:money(it.c)}));
 const p={money:m};
 // fares, meals and drinks are spent, not kept: just take the money and note it
 if(it.x){if(!pay)return toast(t('That’s paid for, not kept, so there’s nothing to add free.'));save(s,p,logm('Paid {price} for {item}',{item:it.n,price:money(it.c)}));return;}
 if(ty==='w')p.weapons=[...c.weapons,{id:uid(),name:it.n,skill:it.s,range:it.r,dmg:it.d,inj:it.i,ammoMax:it.a,ammo:it.a,reloads:0,rc:it.rc,fr:!!it.fr,special:it.sp}];
 else if(it.cat==='Transport'){const v=(c.bg.vehicle||'').trim();p.bg={...c.bg,vehicle:v?v+', '+it.n:it.n};}
 else if(it.u)p.kits=[...c.kits,{id:uid(),name:it.n,note:it.note,uses:it.u,left:it.u,rp:it.rp||0,c:it.c,once:!it.rp}];
 else if(it.n==='Habitual Item')p.habitual={name:c.habitual.name||tk('Habitual item'),used:!!c.habitual.used,uses:(c.habitual.uses||0)+1};
 else p.items=[...c.items,{id:uid(),name:it.n,note:it.note}];
 save(s,p,pay?logm('Bought {item} for {price}',{item:it.n,price:money(it.c)}):logm('Added {item}',{item:it.n}));
}
// A dropdown is as wide as its longest option; size marked ones (data-fit) to the chosen option instead.
function fitSelects(root){
 (root||document).querySelectorAll('select[data-fit]').forEach(el=>{
  const o=el.options[el.selectedIndex];if(!o)return;const cs=getComputedStyle(el);
  const m=document.createElement('span');m.style.cssText='position:absolute;visibility:hidden;white-space:pre';m.style.font=cs.font;m.style.letterSpacing=cs.letterSpacing;m.textContent=o.text;
  document.body.appendChild(m);const w=m.getBoundingClientRect().width;m.remove();
  el.style.width=Math.ceil(w+parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight)+parseFloat(cs.borderLeftWidth)+parseFloat(cs.borderRightWidth)+2)+'px';});
}
document.addEventListener('change',e=>{if(e.target.matches&&e.target.matches('select[data-fit]'))fitSelects(e.target.parentNode);});
function render(){
 const ae=document.activeElement;
 const inApp=ae&&ae.closest&&ae.closest('#app');
 // Only hold off while someone is typing in a text box; radios, checkboxes and dropdowns update right away.
 const typing=inApp&&(ae.tagName==='TEXTAREA'||(ae.tagName==='INPUT'&&!/^(radio|checkbox|range|file|button|submit)$/i.test(ae.type)));
 if(typing){pending=true;renderTabs();return;}
 // Don't refocus dropdowns: on phones that reopens the picker right after a choice.
 const keepId=inApp&&ae.id&&ae.tagName!=='SELECT'?ae.id:null;
 pending=false;
 if(halted){document.getElementById('tabs').innerHTML='';document.getElementById('app').innerHTML='<section class="sec"><h2>'+t('Can’t open this campaign')+'</h2><p class="note" style="margin:0">'+esc(halted)+'</p><div class="row"><a class="btn pri" href="./">'+t('Go to My campaigns')+'</a></div></section>';return;}
 renderTabs();
 const app=document.getElementById('app');
 app.innerHTML=active==='party'?renderParty():active==='create'?renderCreator():active==='journal'?renderJournal():active==='gm'?renderGM():chars[active]?renderChar(active):renderParty();
 if(keepId){const el=document.getElementById(keepId);if(el)try{el.focus({preventScroll:true});}catch(e){}}
 fitSelects(app);
 if(typeof focusPendingClue==='function')focusPendingClue();
}
