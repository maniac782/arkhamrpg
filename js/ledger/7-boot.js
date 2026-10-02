/* Arkham Ledger — Starting up: connect to Firebase (campaign mode or the original single-party mode) and start listening for changes.
   Part of the ledger; these files load in order and share their variables. */
// ---------- campaign boot (beta) ----------
async function bootCampaign(syncEl){
 const cfg0=window.FIREBASE_CONFIG;
 if(!cfg0||!cfg0.projectId||!window.firebase){localMode=true;render();syncEl.textContent='Not connected';return;}
 const cfg=Object.assign({},cfg0);if(/\.web\.app$|\.firebaseapp\.com$/.test(location.hostname))cfg.authDomain=location.hostname;
 const fb=firebase.initializeApp(cfg,'beta');window.armAppCheck&&armAppCheck(fb);const raw=fb.firestore();window.__campAuth=fb.auth();const pre='campaigns/'+CAMP+'/';
 const brand=document.querySelector('.brand h1');
 const syncLine=()=>{const me=(camp&&camp.names&&camp.names[authUid])||'';syncEl.innerHTML='<span class="nav"><a class="nav-l" href="./">\u2039 <span class="wide-only">My campaigns</span><span class="narrow-only">Campaigns</span></a><a class="nav-l" href="./?settings='+encodeURIComponent(CAMP)+'">'+(camp&&camp.ownerUid===authUid?'Settings':'Members')+'</a><span class="acct">'+(me?'<span class="av" aria-hidden="true">'+esc(me.charAt(0).toUpperCase())+'</span><b>'+esc(me)+'</b>':'')+'<button class="nav-l" id="signout" type="button">Sign out</button></span><span class="live" title="Changes sync live"><i></i><span class="wide-only">Live</span></span></span>';const so=document.getElementById('signout');if(so)so.onclick=()=>{try{localStorage.removeItem('apl-beta-cache');}catch(e){}window.__campAuth.signOut().then(()=>location.href='./');};};syncLine();window.__syncLine=syncLine;
 // Show the last-seen campaign right away (from this device) while sign-in and the database catch up.
 if(camp){if(brand)brand.innerHTML=(camp.photo&&/^data:image\/jpeg;base64,/.test(camp.photo)?'<img class="brandimg" src="'+camp.photo+'" alt="">':'')+esc(camp.name);document.title=camp.name+' \u2014 Arkham Ledger';applyRoles();render();}
 const u=await new Promise(res=>{const off=fb.auth().onAuthStateChanged(x=>{off();res(x);});});
 if(!u||u.isAnonymous){location.replace('./');return;}
 authUid=u.uid;
 db={doc:p=>raw.doc(pre+p),collection:p=>raw.collection(pre+p),batch:()=>raw.batch()};
 raw.doc('campaigns/'+CAMP).onSnapshot(snap=>{
  if(!snap.exists){halted='This campaign was deleted.';render();return;}
  camp=snap.data();
  if(!(camp.memberIds||[]).includes(authUid)){halted='You\u2019re not in this campaign. Ask its owner for an invite link.';render();return;}
  if(brand)brand.innerHTML=(camp.photo&&/^data:image\/jpeg;base64,/.test(camp.photo)?'<img class="brandimg" src="'+camp.photo+'" alt="">':'')+esc(camp.name);document.title=camp.name+' \u2014 Arkham Ledger';
  applyRoles();if(window.__syncLine)window.__syncLine();render();saveCache();
 },()=>{halted='You\u2019re not in this campaign. Ask its owner for an invite link.';render();});
 gmBoot();
 db.doc('settings/house').onSnapshot(snap=>{const d=snap.exists?snap.data():{};house={on:!!d.on,weapons:Array.isArray(d.weapons)?d.weapons:[],gear:Array.isArray(d.gear)?d.gear:[],rules:Array.isArray(d.rules)?d.rules:[]};render();},()=>{});
 db.collection('characters').onSnapshot(qs=>{
  const ids=[];
  qs.forEach(d=>{if(!isSlotId(d.id))return;ids.push(d.id);chars[d.id]=norm(JSON.parse(JSON.stringify(d.data())),slotNum(d.id));});
  if(!ids.length&&qs.metadata.fromCache)return;
  SLOTS=ids.sort((a,b)=>slotNum(a)-slotNum(b));
  Object.keys(chars).forEach(k=>{if(!SLOTS.includes(k))delete chars[k];});
  if(pendingTab&&SLOTS.includes(pendingTab)){active=pendingTab;pendingTab=null;}
  if(isSlotId(active)&&!SLOTS.includes(active)){active='party';edit.rm=null;}
  applyRoles();render();saveCache();
 },err=>{if(window.quotaHit&&quotaHit(err))return;if(err&&err.code==='permission-denied'){halted='You\u2019re not in this campaign. Ask its owner for an invite link.';render();}else syncEl.textContent='Sync paused \u2014 reload to reconnect';});
}

// ---------- boot ----------
if(!STOP)render();
(async()=>{
 if(STOP)return;
 const syncEl=document.getElementById('sync');
 if(CAMP){await bootCampaign(syncEl);return;}
 const cfg=window.FIREBASE_CONFIG;
 if(!cfg||!cfg.projectId||cfg.projectId.startsWith('PASTE')||!window.firebase){localMode=true;render();syncEl.textContent='Not connected — add your Firebase settings (see README)';return;}
 try{window.armAppCheck&&armAppCheck(firebase.initializeApp(cfg));db=firebase.firestore();}catch(e){db=null;localMode=true;render();syncEl.textContent='Couldn’t connect to Firebase — check the settings';return;}
 try{const cred=await firebase.auth().signInAnonymously();authUid=cred.user.uid;}catch(e){syncEl.textContent='Sign-in failed — turn on Anonymous sign-in in Firebase (see README)';db=null;localMode=true;render();return;}
 watchKeys();
 gmBoot();
 db.doc('settings/gm').onSnapshot(snap=>{gmClaimed=!!(snap.exists&&snap.data().set);gmFlagReady=true;saveCache();gmMasterState=null;gmSubscribe();render();},()=>{gmFlagReady=true;render();});
 db.doc('settings/house').onSnapshot(snap=>{house={on:!!(snap.exists&&snap.data().on)};render();},()=>{});
 syncEl.textContent='Live · synced for the party ';
 const legacy=()=>{rosterLocked=true;SLOTS=['p1','p2','p3','p4'];SLOTS.forEach((s,i)=>{
  const ref=db.doc('characters/'+s);let created=false;
  ref.onSnapshot(snap=>{
   if(!snap.exists){ if(!created&&!snap.metadata.fromCache){created=true;ref.set(SEED[s]||blank(i+1)).catch(()=>{});} return; }
   chars[s]=norm(JSON.parse(JSON.stringify(snap.data())),i+1);render();saveCache();
  },err=>{if(window.quotaHit&&quotaHit(err))return;syncEl.textContent='Sync paused — reload to reconnect';});
 });render();};
 let seeded=false;
 db.collection('characters').onSnapshot(qs=>{
  const ids=[];
  qs.forEach(d=>{if(!isSlotId(d.id))return;ids.push(d.id);chars[d.id]=norm(JSON.parse(JSON.stringify(d.data())),slotNum(d.id));});
  if(!ids.length&&!qs.metadata.fromCache&&!seeded){seeded=true;['p1','p2','p3','p4'].forEach((s,i)=>db.doc('characters/'+s).set(SEED[s]||blank(i+1)).catch(()=>{}));return;}
  if(!ids.length&&qs.metadata.fromCache)return;
  SLOTS=ids.sort((a,b)=>slotNum(a)-slotNum(b));
  Object.keys(chars).forEach(k=>{if(!SLOTS.includes(k))delete chars[k];});
  if(pendingTab&&SLOTS.includes(pendingTab)){active=pendingTab;pendingTab=null;}
  if(isSlotId(active)&&!SLOTS.includes(active)){active='party';edit.rm=null;}
  render();saveCache();
 },err=>{if(window.quotaHit&&quotaHit(err))return;if(err&&err.code==='permission-denied')legacy();else syncEl.textContent='Sync paused — reload to reconnect';});
})();
