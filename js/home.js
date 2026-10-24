/* Arkham Horror RPG Ledger — sign-in, My campaigns, invites and campaign Settings (members, roles, house rules). */
(function(){
'use strict';
const app=document.getElementById('app'),whoEl=document.getElementById('who'),toastEl=document.getElementById('toast');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastT;function toast(m){toastEl.textContent=m;toastEl.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>toastEl.hidden=true,3200);}
const MAX_OWNED=10;
// state
let fb=null,auth=null,db=null,user=null,profile=undefined,camps=[],campUnsub=null,profUnsub=null,inbox=[],outbox=[],inboxUnsub=null,outUnsub=null,outCid=null;
let banned=false,isAdm=false,seenDone=false,wantSave=false;
const ui={importing:'',confirmImport:false,mode:'signin',err:'',busy:false,view:'home',cid:null,confirmDel:false,confirmLeave:false,kick:null,newOpen:false,clear:new Set()};

function cfgOk(){const c=window.FIREBASE_CONFIG;return c&&c.projectId&&!String(c.projectId).startsWith('PASTE')&&window.firebase;}

// ---------- rendering ----------
function render(){
 if(ui.dragging){ui.renderAfterDrag=true;return;}
 const a=document.activeElement,keep=a&&a.id&&app.contains(a)&&/^(INPUT|TEXTAREA)$/.test(a.tagName)?{id:a.id,s:a.selectionStart,e:a.selectionEnd}:null; // not dropdowns: refocusing one reopens it on iPhone
 // keep whatever people have typed when the page redraws
 const vals={};app.querySelectorAll('input[id],textarea[id]').forEach(el=>{if(el.type!=='file')vals[el.id]=el.value;});
 if(!user){whoEl.innerHTML='';welcomeView();}
 else if(profile===undefined){whoEl.innerHTML='';app.innerHTML='<p class="note" style="padding:24px 16px">'+t('Loading your account…')+'</p>';}
 else if(!profile){whoEl.innerHTML=signOutHtml();app.innerHTML=usernameView();}
 else{const oc=ui.view==='camp'&&camps.find(x=>x.id===ui.cid);watchOutbox(oc&&oc.ownerUid===user.uid?oc.id:null);watchHouse(oc?oc.id:null);whoEl.innerHTML='<span class="nav">'+acctMenuHtml(profile.username,profile,{email:(auth&&auth.currentUser&&auth.currentUser.email)||user.email||'',admin:isAdm})+'</span>';app.innerHTML=banned?bannedView():ui.view==='camp'?campView():ui.view==='account'?accountView():ui.view==='new'?newView():ui.view==='invite'?inviteView():homeView();}
 Object.keys(vals).forEach(id=>{const el=document.getElementById(id);if(el&&app.contains(el)&&!ui.clear.has(id))el.value=vals[id];});ui.clear.clear();
 syncRename();
 // Keep the address in step with the page, so reloading a campaign's Settings stays there.
 if(user&&profile){const want=ui.view==='camp'&&ui.cid?'?settings='+encodeURIComponent(ui.cid):'';if(location.search!==want&&!/[?&]join=/.test(location.search)){try{history.replaceState(null,'',location.pathname+want);}catch(e){}}}
 if(keep){const el=document.getElementById(keep.id);if(el){el.focus();try{if(keep.s!=null)el.setSelectionRange(keep.s,keep.e);}catch(e){}}}
}
function bannedView(){return '<section class="sec auth"><h2>'+t('Account suspended')+'</h2><p class="note" style="margin:0">'+t('This account has been suspended, so it can’t create or change anything. If you think this is a mistake, email {email}.',{email:'<a href="mailto:maniac78@gmail.com?subject=Arkham%20Ledger%20account">maniac78@gmail.com</a>'})+'</p></section>';}
function provName(){const p=(auth&&auth.currentUser&&auth.currentUser.providerData[0])||{};return p.providerId==='google.com'?'Google':p.providerId==='password'?t('Email and password'):'—';}
function freshLogin(){const u=auth&&auth.currentUser;if(!u)return false;const t=Date.parse(u.metadata&&u.metadata.lastSignInTime||'');return !!t&&Date.now()-t<5*60*1000;}
function accountView(){
 const own=camps.filter(c=>c.ownerUid===user.uid),inn=camps.filter(c=>c.ownerUid!==user.uid);
 let h='<div class="row"><button class="btn sm" data-a="home">'+t('← My campaigns')+'</button></div>';
 h+='<section class="sec"><h2>'+t('Your account')+'</h2><div class="list">'+
  [[t('Username'),profile.username],[t('Email'),(auth.currentUser&&auth.currentUser.email)||user.email||'—'],[t('Signed in with'),provName()]].map(([k,v])=>'<div class="item"><div class="grow"><span class="lbl">'+k+'</span><b>'+esc(v)+'</b></div></div>').join('')+'</div></section>';
 const curC=AVATAR_COLORS[profile.color]?profile.color:'slate';
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Your icon')+'</h2><span class="row" style="gap:8px;align-items:center"><span class="avbig">'+acctIcon(profile.username,profile)+'</span><b>'+esc(profile.username)+'</b></span></div>'+
  '<div class="field"><span class="lbl">'+t('Photo')+'</span><div class="row" style="gap:8px;align-items:center"><label class="btn sm" for="avphoto" style="cursor:pointer">'+(profile.photo?t('Change photo'):t('Upload a photo'))+'</label><input type="file" id="avphoto" accept="image/*" hidden>'+(profile.photo?'<button class="btn sm" data-a="avphotodel">'+t('Remove photo')+'</button>':'')+'</div><span class="note">'+(profile.photo?t('Your photo is showing. Remove it to show your first letter on a color instead.'):t('Or show your first letter on the color you pick below.'))+'</span></div>'+
  // the color is only for the first-letter icon, so it's hidden while a photo is showing
  (profile.photo?'':'<div class="field"><span class="lbl">'+t('Color')+'</span><div class="swatches">'+Object.keys(AVATAR_COLORS).map(k=>'<button class="swatch'+(k===curC?' on':'')+'" data-a="avc" data-v="'+k+'" style="background:'+AVATAR_COLORS[k]+'" aria-label="'+t(k)+'" aria-pressed="'+(k===curC)+'"></button>').join('')+'</div></div>')+'</section>';
 loadPrefs();
 h+='<section class="sec"><h2>'+t('Language')+'</h2><label class="field" style="max-width:260px"><span class="lbl">'+t('Show the site in')+'</span>'+I18N.picker('acctlang','f')+'</label><p class="note" style="margin:0">'+t('Saved to your account, so it follows you to your other devices. Emails and notifications to you use it too.')+'</p></section>';
 h+=notifySection();
 h+='<section class="sec"><h2>'+t('Delete my account')+'</h2>';
 if(ui.delBusy)return h+'<p class="note" style="margin:0">'+t('Deleting your account… keep this page open.')+'</p></section>';
 h+='<p class="note" style="margin:0">'+t('This removes your username and sign-in for good.')+(own.length?' '+t('Campaigns you own are deleted for everyone: {list}.',{list:'<b>'+own.map(c=>esc(c.name)).join(', ')+'</b>'}):'')+(inn.length?' '+t('You’ll leave {list}; investigators you played there stay with those campaigns.',{list:inn.map(c=>'<b>'+esc(c.name)+'</b>').join(', ')}):'')+' '+t('This can’t be undone.')+'</p>';
 if(!ui.delAsk)h+='<div class="row"><button class="btn dng" data-a="acctdelask">'+t('Delete my account…')+'</button></div>';
 else if(!freshLogin())h+='<p class="note" style="margin:0">'+t('For your security, sign in again first. You’ll come straight back here.')+'</p><div class="row"><button class="btn pri" data-a="acctreauth">'+t('Sign in again')+'</button><button class="btn" data-a="acctdelno">'+t('Cancel')+'</button></div>';
 else h+='<div class="row"><button class="btn dng" data-a="acctdelyes">'+t('Yes, delete everything')+'</button><button class="btn" data-a="acctdelno">'+t('Cancel')+'</button></div>';
 return h+'</section>';
}
function myTz(){try{return (Intl.DateTimeFormat().resolvedOptions().timeZone||'').slice(0,50);}catch(e){return '';}}
// Keeps the time zone used for reminder emails current (stored privately in prefs/{uid}).
function saveTz(){const tz=myTz();if(!tz||!user)return;db.doc('prefs/'+user.uid).get().then(s=>{const p=s.exists?s.data():{};if(p.tz!==tz)return db.doc('prefs/'+user.uid).set({...p,tz});}).catch(()=>{});}
// Private settings (prefs/<uid>): reminders, notifications and the order of campaign cards. Loaded once.
function loadPrefs(){if(ui.prefs!==undefined||!user)return;ui.prefs=null;db.doc('prefs/'+user.uid).get().then(s=>{ui.prefs=s.exists?s.data():{};syncLang();render();},()=>{ui.prefs={};render();});}
// The language saved to the account wins on a new device; one picked here before signing in is saved to the account.
function syncLang(){if(ui.langSynced||!ui.prefs||!user)return;ui.langSynced=true;const saved=ui.prefs.lang;
 if(saved&&saved!==I18N.lang&&I18N.langs.some(x=>x[0]===saved))I18N.set(saved);
 else if(!saved&&I18N.chosen)db.doc('prefs/'+user.uid).set({lang:I18N.lang},{merge:true}).catch(()=>{});}
// Picking a language (here or in the footer) saves it to the account before the page reloads in it.
window.aplSaveLang=code=>{if(!user||!db)return null;if(ui.prefs)ui.prefs.lang=code;return db.doc('prefs/'+user.uid).set({lang:code},{merge:true});};
// Campaign cards in the order you dragged them into (new ones go at the end). Remembered on this device too,
// so the page doesn't jump while your settings load.
const ORDER_KEY='apl-camp-order';
function dragHinted(){try{return !!localStorage.getItem('apl-drag-hint');}catch(e){return false;}}
function myOrder(){if(ui.prefs&&Array.isArray(ui.prefs.campOrder))return ui.prefs.campOrder;try{return JSON.parse(localStorage.getItem(ORDER_KEY)||'[]');}catch(e){return [];}}
function sortByMyOrder(list){const o=myOrder(),at=id=>{const i=o.indexOf(id);return i<0?1e6:i;};return list.map((c,i)=>({c,i})).sort((a,b)=>(at(a.c.id)-at(b.c.id))||(a.i-b.i)).map(x=>x.c);}
function saveMyOrder(ids){ids=ids.slice(0,60);ui.prefs={...(ui.prefs||{}),campOrder:ids};try{localStorage.setItem(ORDER_KEY,JSON.stringify(ids));}catch(e){}
 db.doc('prefs/'+user.uid).set({campOrder:ids},{merge:true}).catch(e=>{if(window.quotaHit&&quotaHit(e))return;toast(t('Couldn’t save the new order.'));});}

// ---------- Reminders and notifications (Your account) ----------
const PUSH_TOK='apl-push-token';
function pushLocal(){try{return localStorage.getItem(PUSH_TOK)||'';}catch(e){return '';}}
function pushSupport(){
 const ua=navigator.userAgent||'',ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
 const standalone=window.isInstalledApp&&isInstalledApp();
 if(!window.PUSH_KEY)return 'off';
 if(ios&&!standalone)return 'ios-install';
 if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return 'unsupported';
 if(Notification.permission==='denied')return 'denied';
 return pushLocal()&&Notification.permission==='granted'?'on':'ready';
}
function notifySection(){
 const p=ui.prefs,st=pushSupport(),cb=(a,on,label)=>'<label class="row" style="gap:8px;align-items:center;cursor:pointer"><input type="checkbox" data-a="'+a+'"'+(on?' checked':'')+'> '+label+'</label>';
 let h='<section class="sec"><h2>'+t('Reminders &amp; notifications')+'</h2>';
 if(!p)return h+'<p class="note" style="margin:0">'+t('Loading…')+'</p></section>';
 h+=cb('remindtog',!p.noRemind,t('Remind me the day before a session'))+'<p class="note" style="margin:0">'+(st==='off'?t('By email to {email}.',{email:esc((auth.currentUser&&auth.currentUser.email)||user.email||t('your sign-in email'))}):t('By email to {email}, and as a notification on devices where they’re on.',{email:esc((auth.currentUser&&auth.currentUser.email)||user.email||t('your sign-in email'))}))+'</p>';
 if(st==='off')return h+'</section>';
 h+='<div class="field"><span class="lbl">'+t('Notifications on this device')+'</span>';
 if(st==='on')h+='<div class="row" style="gap:10px;align-items:center"><span class="cdtext">'+t('On')+'</span><button class="btn sm" data-a="pushoff">'+t('Turn off')+'</button><button class="btn sm" data-a="pushtest">'+t('Send a test')+'</button></div>';
 else if(st==='ready')h+='<div class="row" style="gap:10px;align-items:center"><button class="btn sm pri" data-a="pushon">'+t('Turn on notifications')+'</button></div>';
 else if(st==='ios-install')h+='<p class="note" style="margin:0">'+t('On iPhone and iPad, notifications work in the installed app. Choose <b>Install app</b> in the menu under your icon, open the ledger from your home screen, then turn them on here.')+'</p>';
 else if(st==='denied')h+='<p class="note" style="margin:0">'+t('Notifications are blocked for this site. Allow them in your browser’s site settings (or the phone’s Settings › Notifications), then come back here.')+'</p>';
 else h+='<p class="note" style="margin:0">'+t('This browser can’t show notifications. Try Chrome, Edge, Firefox or Safari, or the installed app on your phone.')+'</p>';
 h+='</div>';
 h+=cb('clutog',!p.noCluePush,t('When the GM reveals a clue to me'))+cb('turntog',!!p.pushTurns,t('When it’s the investigators’ turn in a fight'))+
  '<p class="note" style="margin:0">'+t('These go to every device where notifications are on.')+'</p>';
 return h+'</section>';
}
function savePrefs(patch,okMsg){const before={...(ui.prefs||{})};ui.prefs={...before,...patch};render();
 return db.doc('prefs/'+user.uid).set({...ui.prefs,tz:myTz()}).then(()=>okMsg&&toast(okMsg),()=>{ui.prefs=before;render();toast(t('Couldn’t save that.'));});}
async function pushOn(){
 try{
  const perm=await Notification.requestPermission();
  if(perm!=='granted'){render();return toast(perm==='denied'?t('Notifications are blocked. Allow them in your browser settings.'):t('Notifications weren’t turned on.'));}
  const reg=await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const tok=await firebase.messaging(fb).getToken({vapidKey:window.PUSH_KEY,serviceWorkerRegistration:reg});
  if(!tok)throw new Error('no token');
  await db.doc('devices/'+tok).set({uid:user.uid,ua:String(navigator.userAgent||'').slice(0,300),t:Date.now()});
  try{localStorage.setItem(PUSH_TOK,tok);}catch(e){}
  render();toast(t('Notifications are on for this device.'));
 }catch(e){console.warn('push',e);toast(t('Couldn’t turn on notifications here. Try again.'));render();}
}
async function pushOff(){
 const tok=pushLocal();try{localStorage.removeItem(PUSH_TOK);}catch(e){}
 if(tok)await db.doc('devices/'+tok).delete().catch(()=>{});
 try{await firebase.messaging(fb).deleteToken();}catch(e){}
 render();toast(t('Notifications are off for this device.'));
}
async function deleteAccount(){
 const u=auth.currentUser;if(!u)return;const uid=u.uid;ui.delBusy=true;render();
 try{
  for(const c of camps.filter(x=>x.ownerUid===uid)){
   await db.doc('campaigns/'+c.id).update({deleting:true}).catch(()=>{});
   const iv=await db.collection('invites').where('cid','==',c.id).where('fromUid','==',uid).get().catch(()=>null);if(iv)await Promise.all(iv.docs.map(d=>d.ref.delete().catch(()=>{})));
   await wipeCampaign(c.id);await db.doc('campaigns/'+c.id).delete();
  }
  for(const c of camps.filter(x=>x.ownerUid!==uid))await memberOut(c,uid).catch(()=>{});
  const b=db.batch();if(profile&&profile.usernameLower)b.delete(db.doc('usernames/'+profile.usernameLower));b.delete(db.doc('users/'+uid));b.delete(db.doc('prefs/'+uid));await b.commit();
  {const tok=pushLocal();if(tok)await db.doc('devices/'+tok).delete().catch(()=>{});}
  await dropFolder('users/'+uid);
  try{Object.keys(localStorage).filter(k=>/^apl-(beta-cache|memo-|cache-v1-|creator-v1)/.test(k)).forEach(k=>localStorage.removeItem(k));}catch(e){}
  try{await u.delete();}catch(e){await auth.signOut().catch(()=>{});}
  ui.delBusy=false;ui.delAsk=false;ui.view='home';toast(t('Your account was deleted.'));
 }catch(e){console.warn(e);ui.delBusy=false;if(window.quotaHit&&quotaHit(e))return render();toast(t('Couldn’t finish deleting. Try again.'));render();}
}
const signOutHtml=()=>'<button class="nav-l" data-a="signout">'+t('Sign out')+'</button>';
const errHtml=()=>ui.err?'<p class="err" role="alert">'+esc(ui.err)+'</p>':'';
function field(id,label,type,extra){return '<label class="field wide"><span class="lbl">'+label+'</span><input class="f" id="'+id+'" type="'+type+'" '+(extra||'')+'></label>';}

// The no-account way in: a campaign kept only in this browser (js/localdb.js) until they make an account.
const hasLocal=()=>{try{return !!(window.LocalFB&&LocalFB.exists());}catch(e){return false;}};
const localName=()=>{try{const d=LocalFB.dump();return (d.camp&&d.camp.name)||t('Your campaign');}catch(e){return t('Your campaign');}};
function localTryHtml(){
 if(hasLocal())return '<div class="trybox"><b>'+t('Welcome back')+'</b><span class="note">'+t('{name} is saved in this browser. Make an account any time to keep it safe and invite your group.',{name:'<b>'+esc(localName())+'</b>'})+'</span><div class="row"><a class="btn pri" href="play.html?c='+LOCAL_CAMP+'">'+t('Continue on this device →')+'</a></div></div>';
 return '<div class="trybox"><b>'+t('Just looking?')+'</b><span class="note">'+t('Try it without an account. Your campaign is saved in this browser only. When you’re ready, make an account and it moves over with you.')+'</span><div class="row"><button class="btn" data-a="trylocal">'+t('Try it without an account')+'</button></div></div>';
}
function introHtml(){
 const inv=(typeof pendingJoin!=='undefined'&&pendingJoin)?'<p class="invited">'+t('You’ve been invited to join {name}. Sign in or create an account and you’ll be asked to join.',{name:'<b>'+esc(pendingJoin.name||t('a campaign'))+'</b>'})+'</p>':'';
 const cta=hasLocal()?'':'<div class="row cta"><button class="btn pri" data-a="trylocal">'+t('Start a campaign, no account needed')+'</button><a class="btn narrow-only" href="#signin">'+t('Sign in')+'</a></div><p class="note" style="margin:0">'+t('It’s saved in this browser until you make an account, then it moves over with you.')+'</p>';
 return '<section class="intro">'+inv+(hasLocal()?localTryHtml():'')+'<h2>'+t('Live character sheets for the Arkham Horror Roleplaying Game')+'</h2>'+
  '<p>'+t('Everyone’s investigator stays in sync at the table: spend a die, take an injury or earn XP and the whole group sees it. The GM can run scenes and fights, track enemies, reveal clues to players and get an automatic recap of every session.')+'</p>'+cta+
  '<p class="note">'+t('Free, no ads. An unofficial fan project, not affiliated with Edge Studio or Fantasy Flight Games. You’ll need the <a href="https://store.asmodee.com/products/arkham-horror-rpg-core-rulebook" target="_blank" rel="noopener">Core Rulebook</a> to play. <a href="help.html">How it works</a>')+'</p></section>';
}
// The sample party: the real ledger in a frame, running on invented data that isn't saved (js/demo.js).
function demoHtml(){
 return '<section class="demo" aria-label="'+t('Sample campaign')+'"><div class="demohead"><h2>'+t('Have a look around')+'</h2><span class="note">'+t('A sample campaign with an invented party. Open a sheet, spend some dice or try the GM tab. Nothing here is saved.')+'</span></div>'+
  '<iframe id="demoframe" src="play.html?c='+DEMO_CAMP+'&amp;embed=1" title="'+t('Sample campaign')+'" loading="lazy"></iframe></section>';
}
// Signed out: the intro, the sign-in card and the sample party. The frame is made once, so redraws don't reset it.
function welcomeView(){
 // Came from "Save to an account": just the sign-in card, so it's right there on a phone.
 if(wantSave&&hasLocal()){app.innerHTML='<div class="savewrap"><a class="btn sm" data-a="savecancel" href="play.html?c='+LOCAL_CAMP+'">'+t('‹ Back to {name}',{name:esc(localName())})+'</a>'+authView()+'</div>';return;}
 const fr=document.getElementById('demoframe');
 if(fr&&app.contains(fr)){document.getElementById('introbox').innerHTML=introHtml();document.getElementById('authbox').innerHTML=authView();return;}
 app.innerHTML='<div class="welcome"><div id="introbox">'+introHtml()+'</div><div id="authbox">'+authView()+'</div>'+demoHtml()+'</div>';
 // Back from a sample investigator's printable sheet: return to the sample.
 if(location.hash==='#demoframe'){const f=document.getElementById('demoframe');if(f)setTimeout(()=>f.scrollIntoView({block:'start'}),50);}
}
function authView(){
 const up=ui.mode==='signup',reset=ui.mode==='reset';
 let h='<section class="sec auth" id="signin"><h2>'+(reset?t('Reset your password'):wantSave&&hasLocal()?t('Save your campaign'):up?t('Create an account'):t('Sign in'))+'</h2>';
 if(wantSave&&hasLocal()&&!reset)h+='<p class="note savenote" style="margin:0">'+t('Create a free account (or sign in) and {name} moves over to it, ready to invite your group. Nothing is lost.',{name:'<b>'+esc(localName())+'</b>'})+'</p>';
 if(!reset)h+='<button class="btn gbtn" data-a="google" '+(ui.busy?'disabled':'')+'><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z"/></svg>'+t('Continue with Google')+'</button><div class="or">'+t('or with email')+'</div>';
 h+='<form id="authform" style="display:flex;flex-direction:column;gap:10px" novalidate>'+field('em',t('Email'),'email','autocomplete="email" required')+
  (reset?'':field('pw',t('Password'),'password','autocomplete="'+(up?'new-password':'current-password')+'" minlength="6" required'))+
  (up?field('pw2',t('Confirm password'),'password','autocomplete="new-password" required'):'')+errHtml()+
  '<button class="btn pri wide" type="submit" '+(ui.busy?'disabled':'')+'>'+(reset?t('Send reset email'):up?t('Create account'):t('Sign in'))+'</button></form>';
 h+='<div class="row" style="justify-content:space-between">'+(reset?'<button class="btn sm" data-a="mode" data-m="signin">'+t('Back to sign in')+'</button>':
  (up?'<span class="note">'+t('Already have an account?')+'</span><button class="btn sm" data-a="mode" data-m="signin">'+t('Sign in')+'</button>':'<button class="btn sm" data-a="mode" data-m="reset">'+t('Forgot password?')+'</button><button class="btn sm" data-a="mode" data-m="signup">'+t('Create an account')+'</button>'))+'</div>';
 h+='<p class="note" style="margin:0;font-size:11px;text-align:center">'+t('Protected by reCAPTCHA. Google’s <a href="https://policies.google.com/privacy" rel="noopener">Privacy Policy</a> and <a href="https://policies.google.com/terms" rel="noopener">Terms</a> apply. See our <a href="privacy.html">privacy policy</a>.')+'</p>';
 return h+'</section>';
}
function usernameView(){
 return '<section class="sec auth"><h2>'+t('Pick a username')+'</h2><p class="note" style="margin:0">'+t('It’s the name other players see in your campaigns. 3–20 letters, numbers or underscores. Your email is never shown to other players.')+'</p>'+(wantSave&&hasLocal()?'<p class="note savenote" style="margin:0">'+t('Next, {name} moves over to your account.',{name:'<b>'+esc(localName())+'</b>'})+'</p>':'')+
  '<form id="unform" style="display:flex;flex-direction:column;gap:10px" novalidate>'+field('un',t('Username'),'text','autocomplete="username" maxlength="20" autocapitalize="off" spellcheck="false" required')+errHtml()+
  '<button class="btn pri wide" type="submit" '+(ui.busy?'disabled':'')+'>'+t('Save username')+'</button></form></section>';
}
const MAX_MEMBERS=12;
function chipsFor(c,u){const r=(c.roles||{})[u];let h='';if(r==='owner')h+='<span class="chip ok">'+t('Owner')+'</span>';if(c.gmUid&&c.gmUid===u)h+='<span class="chip warn">'+t('GM')+'</span>';if(r!=='owner'&&c.gmUid!==u)h+='<span class="chip">'+t('Player')+'</span>';return h;}
const photoOk=p=>window.imgOk(p);
// Shrink a chosen picture to a small JPEG (wide 16:9 crop) and save it on the campaign.
function campPhoto(f){const cid=ui.cid;openCropper(f,{title:t('Position the campaign picture'),shape:'wide',outW:1600,outH:900,maxLen:700000,full:{side:2400,maxLen:1200000},onError:toast,onSave:(d,full)=>{toast(t('Saving picture…'));const at='campaigns/'+cid+'/'+user.uid;Promise.all([storeImage(d,at),full?storeImage(full,at):null]).then(([u,fu])=>{if(!isStoredImage(u))throw {code:'upload'};return db.doc('campaigns/'+cid).update({photo:u,photoFull:isStoredImage(fu)?fu:FV().delete()});}).then(()=>toast(t('Picture saved.')),er=>{if(window.quotaHit&&quotaHit(er))return;toast(t('Couldn’t save the picture. Try again.'));});}});}
// A campaign with no picture gets a tinted banner with its first letter, so every card lines up.
function bannerHtml(c,photo){if(photoOk(photo))return '<img class="campimg" src="'+photo+'" alt="">';
 let h=0;for(const ch of String(c.id||c.name||'x'))h=(h*31+ch.charCodeAt(0))%360;
 return '<div class="campimg ph" style="--h:'+h+'" aria-hidden="true"><span>'+esc(String(c.name||'?').trim().charAt(0).toUpperCase()||'?')+'</span></div>';}
// An email invite as a card: the campaign's picture (saved on the invite) or its tinted letter, and who sent it.
const inviters={};
function inviteCard(i){
 const u=inviters[i.fromUid];
 if(u===undefined){inviters[i.fromUid]=null;db.doc('users/'+i.fromUid).get().then(d=>{inviters[i.fromUid]=d.exists?d.data():{};render();}).catch(()=>{});}
 const by=u&&u.username?u:{username:i.fromName};
 return '<div class="camp hasimg invcard">'+bannerHtml({id:i.cid,name:i.campaignName},i.photo)+'<h3>'+esc(i.campaignName)+'</h3>'+
  '<span class="invby">'+acctIcon(by.username,u||{})+'<span>'+t('{name} invited you to join',{name:'<b>'+esc(by.username||t('Someone'))+'</b>'})+'</span></span>'+
  '<div class="row invbtns"><button class="btn pri" data-a="ijoin" data-id="'+esc(i.id)+'">'+t('Join campaign')+'</button><button class="btn" data-a="idecline" data-id="'+esc(i.id)+'">'+t('Decline')+'</button></div></div>';
}
function campCard(c){const n=(c.memberIds||[]).length;return '<div class="camp hasimg" data-cid="'+esc(c.id)+'"><a class="campmain" href="'+ledgerUrl(c.id)+'">'+bannerHtml(c,c.photo)+'<h3>'+esc(c.name)+'</h3><span class="row" style="gap:6px">'+chipsFor(c,user.uid)+'<span class="note">'+tn('{n} member','{n} members',n)+'</span></span></a><div class="row campfoot">'+(c.completed?'<span class="cdline">'+t('Completed {date}',{date:new Date(c.completed.at).toLocaleDateString(I18N.locale,{year:'numeric',month:'short',day:'numeric'})})+'</span>':sessionShown(c.nextSession)?'<span class="cdline" title="'+esc(sessionWhen(c.nextSession))+'">'+t('Next session')+' <span data-cd="'+c.nextSession+'" data-cdb>'+sessionRelHtml(c.nextSession)+'</span></span>':'<span></span>')+'<button class="btn sm" data-a="open" data-id="'+esc(c.id)+'">'+(c.ownerUid===user.uid?t('Settings'):t('Members'))+'</button></div></div>';}
const ledgerUrl=id=>'play.html?c='+encodeURIComponent(id);
function homeView(){
 loadPrefs();
 // Completed campaigns are listed on their own, newest first (they still count toward the campaigns you own).
 const live=camps.filter(c=>!c.completed),done=camps.filter(c=>c.completed).sort((a,b)=>(b.completed.at||0)-(a.completed.at||0));
 const owned=sortByMyOrder(live.filter(c=>c.ownerUid===user.uid)),member=sortByMyOrder(live.filter(c=>c.ownerUid!==user.uid)),ownedAll=camps.filter(c=>c.ownerUid===user.uid).length;
 let h='';
 if(pendingJoin&&!camps.some(c=>c.id===pendingJoin.cid))h+='<section class="sec"><div class="sec-head"><h2>'+t('You’re invited')+'</h2></div><div class="camps"><div class="camp hasimg invcard">'+bannerHtml({id:pendingJoin.cid,name:pendingJoin.name||'?'},null)+'<h3>'+esc(pendingJoin.name||t('A campaign'))+'</h3><span class="note">'+t('You opened an invite link. Join to see the party and make your investigator.')+'</span>'+errHtml()+'<div class="row invbtns"><button class="btn pri" data-a="ljoin" '+(ui.busy?'disabled':'')+'>'+t('Join campaign')+'</button><button class="btn" data-a="lskip">'+t('Not now')+'</button></div></div></div></section>';
 if(user.email&&!user.emailVerified&&!user.providerData.some(x=>x.providerId==='google.com'))h+='<section class="sec"><p class="note" style="margin:0">'+t('Verify your email to see invites sent to {email}. Check your inbox for the link, then reload.',{email:'<b>'+esc(user.email)+'</b>'})+' <button class="btn sm" data-a="reverify">'+t('Send it again')+'</button></p></section>';
 if(hasLocal())h+=localBannerHtml();
 if(inbox.length)h+='<section class="sec"><div class="sec-head"><h2>'+t('You’re invited')+'</h2></div><div class="camps">'+inbox.map(inviteCard).join('')+'</div></section>';
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Campaigns you own')+'</h2>'+(ownedAll?'<span class="note">'+t('{n} of {max}',{n:ownedAll,max:MAX_OWNED})+'</span>':'')+'</div>';
 const tile=ownedAll<MAX_OWNED?'<button class="camp newtile" data-a="newopen"><span class="plus" aria-hidden="true">+</span><b>'+t('New campaign')+'</b><span class="note">'+(owned.length?t('Start another and invite your group.'):t('Start a campaign and invite your group.'))+'</span></button>':'';
 h+=(owned.length>1&&!dragHinted()?'<p class="note draghint">'+t('Tip: press and hold a campaign (or click and drag) to move it.')+'</p>':'')+'<div class="camps">'+owned.map(campCard).join('')+tile+'</div>'+(ownedAll>=MAX_OWNED?'<p class="note" style="margin:0">'+t('You own {n} campaigns, the most allowed. Delete one to start another.',{n:MAX_OWNED})+'</p>':'');
 h+='</section><section class="sec"><div class="sec-head"><h2>'+t('Campaigns you’re in')+'</h2></div>'+
  (member.length?(member.length>1&&!dragHinted()&&owned.length<2?'<p class="note draghint">'+t('Tip: press and hold a campaign (or click and drag) to move it.')+'</p>':'')+'<div class="camps">'+member.map(campCard).join('')+'</div>':'<p class="note" style="margin:0">'+t('None yet. When a friend invites you, it’ll show up here.')+'</p>')+'</section>';
 if(done.length)h+='<section class="sec"><div class="sec-head"><h2>'+t('Completed')+'</h2><span class="note">'+tn('{n} campaign','{n} campaigns',done.length)+'</span></div><div class="camps">'+done.map(campCard).join('')+'</div></section>';
 return h;
}
function localBannerHtml(){
 const nm=localName();
 let h='<section class="sec localban"><div class="sec-head"><h2>'+t('On this device')+'</h2></div><p class="note" style="margin:0">'+t('{name} is saved only in this browser. Save it to your account to keep it safe, open it anywhere and invite your group.',{name:'<b>'+esc(nm)+'</b>'})+'</p>'+errHtml();
 if(ui.localBusy)return h+'<p class="note" style="margin:0">'+t('Saving to your account… keep this page open.')+'</p></section>';
 if(ui.confirmLocalDel)return h+'<p class="note" style="margin:0">'+t('Delete “{name}” from this browser? This can’t be undone.',{name:esc(nm)})+'</p><div class="row"><button class="btn dng" data-a="dellocalyes">'+t('Yes, delete it')+'</button><button class="btn" data-a="dellocalno">'+t('Cancel')+'</button></div></section>';
 return h+'<div class="row"><button class="btn pri" data-a="savelocal">'+t('Save to my account')+'</button><a class="btn" href="play.html?c='+LOCAL_CAMP+'">'+t('Open')+'</a><button class="btn" data-a="dellocal">'+t('Delete…')+'</button></div></section>';
}
function newView(){
 const nm=((document.getElementById('cname')||{}).value||'').trim(),gm=ui.newGM||'me';
 let h='<div class="row"><button class="btn sm" data-a="home">'+t('← My campaigns')+'</button></div>';
 h+='<form id="newform" class="sec newcamp" novalidate><h2>'+t('New campaign')+'</h2>'+
  '<div class="newgrid"><div class="newfields">'+
  '<label class="field"><span class="lbl">'+t('Campaign name')+'</span><input class="f" id="cname" maxlength="60" placeholder="'+t('e.g. The Dunwich Legacy')+'" required autocomplete="off"></label>'+
  '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lbl" style="padding:0">'+t('Who will run the game?')+'</legend>'+
   '<label class="optrow"><input type="radio" name="ngm" value="me"'+(gm==='me'?' checked':'')+'><span><b>'+t('I’ll be the GM')+'</b><br><span class="note">'+t('You get the GM tab: scenes, enemies, clues and XP.')+'</span></span></label>'+
   '<label class="optrow"><input type="radio" name="ngm" value="later"'+(gm==='later'?' checked':'')+'><span><b>'+t('Someone else')+'</b><br><span class="note">'+t('Pick them in Settings once they’ve joined.')+'</span></span></label></fieldset>'+
  '<div class="field"><span class="lbl">'+t('Picture (optional)')+'</span><div class="row" style="gap:8px;align-items:center"><label class="btn sm" for="nphoto" style="cursor:pointer">'+(ui.newPhoto?t('Change picture'):t('Add a picture'))+'</label><input type="file" id="nphoto" accept="image/*" hidden>'+(ui.newPhoto?'<button class="btn sm" type="button" data-a="nphotodel">'+t('Remove')+'</button>':'')+'</div></div>'+
  '</div><div class="newprev"><span class="lbl">'+t('Preview')+'</span><div class="camp hasimg" aria-hidden="true">'+bannerHtml({id:ui.newId||'new',name:nm||t('Your campaign')},ui.newPhoto)+'<h3 id="nprevname">'+esc(nm||t('Your campaign'))+'</h3><span class="row" style="gap:6px"><span class="chip ok">'+t('Owner')+'</span><span class="note">'+tn('{n} member','{n} members',1)+'</span></span></div></div></div>'+
  errHtml()+'<div class="row"><button class="btn pri" type="submit" '+(ui.busy?'disabled':'')+'>'+t('Create campaign')+'</button><button class="btn" type="button" data-a="home">'+t('Cancel')+'</button></div></form>';
 return h;
}
function inviteView(){
 const c=camps.find(x=>x.id===ui.cid);if(!c)return '<p class="note" style="padding:24px 0">'+t('Setting up your campaign…')+'</p>';
 if(ui.waitCid===c.id)ui.waitCid=null;
 const link=c.joinCode?joinLink(c):'';
 return '<section class="sec newcamp"><h2>'+t('“{name}” is ready',{name:esc(c.name)})+'</h2><p class="note" style="margin:0">'+t('Now invite your players. Send them this link; they sign in and they’re in.')+'</p>'+
  (link?'<div class="row"><input class="f" id="ilink" readonly value="'+esc(link)+'" style="flex:1;min-width:220px" aria-label="'+t('Invite link')+'"><button class="btn pri" data-a="lcopy">'+t('Copy link')+'</button>'+(navigator.share?'<button class="btn" data-a="lshare">'+t('Share…')+'</button>':'')+'</div>':'<p class="note" style="margin:0">'+t('Making your invite link…')+'</p>')+
  '<p class="note" style="margin:0">'+t('Invites by email, the GM and house rules are in the campaign’s Settings.')+'</p>'+
  '<div class="row"><a class="btn pri" href="'+ledgerUrl(c.id)+'">'+t('Open the ledger →')+'</a><button class="btn" data-a="open" data-id="'+esc(c.id)+'">'+t('Settings')+'</button><button class="btn" data-a="home">'+t('My campaigns')+'</button></div></section>';
}
// Next session: the owner or GM sets a date, time and place; everyone sees it with a countdown and can add it to their calendar.
function pad2(n){return String(n).padStart(2,'0');}
function localInput(t){const d=new Date(t);return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+'T'+pad2(d.getHours())+':'+pad2(d.getMinutes());}
function nextSessionHtml(c,can){
 const ts=c.nextSession,on=sessionShown(ts);
 let h='<section class="sec"><div class="sec-head"><h2>'+t('Next session')+'</h2>'+(on?'<span class="cdtext" data-cd="'+ts+'">'+esc(sessionRel(ts))+'</span>':'')+'</div>';
 if(on)h+='<p style="margin:0"><b>'+esc(sessionSpan(ts,c.nextHours))+'</b>'+(c.nextWhere?' · '+placeHtml(c.nextWhere):'')+'</p><div class="row">'+calMenuHtml(c.name,ts,c.nextWhere,c.id,c.nextHours)+'</div>';
 else if(!can)h+='<p class="note" style="margin:0">'+t('Nothing scheduled yet. The owner or GM can set it.')+'</p>';
 if(can)h+='<form id="nsform" class="row" style="align-items:flex-end" novalidate><label class="field"><span class="lbl">'+t('Date and time')+'</span><input class="f" type="datetime-local" id="nsdate" value="'+(on?localInput(ts):'')+'"></label>'+sessionHoursSelect('nshours',c.nextHours)+
  '<label class="field" style="flex:1;min-width:180px"><span class="lbl">'+t('Where (optional)')+'</span><input class="f" id="nswhere" maxlength="80" data-place autocomplete="off" placeholder="'+t('e.g. Dan’s place, or Discord')+'" value="'+esc(on?c.nextWhere||'':'')+'"></label>'+
  '<button class="btn pri" type="submit">'+(on?t('Update'):t('Set'))+'</button>'+(on?'<button class="btn" type="button" data-a="nsclear">'+t('Clear')+'</button>':'')+'</form>'+
  '<p class="note" style="margin:0">'+t('Shows a countdown on the campaign’s card and in the ledger for everyone. Times are in each person’s own time zone.')+'</p>';
 return h+'</section>';
}
function campView(){
 const c=camps.find(x=>x.id===ui.cid);if(!c){if(ui.waitCid===ui.cid)return '<p class="note" style="padding:24px 0">'+t('Opening the campaign…')+'</p>';ui.view='home';return homeView();}
 if(ui.waitCid===c.id)ui.waitCid=null;
 const own=c.ownerUid===user.uid,names=c.names||{};
 let h='<div class="row"><button class="btn sm" data-a="home">'+t('← My campaigns')+'</button><a class="btn sm pri" href="'+ledgerUrl(c.id)+'">'+t('Open the ledger →')+'</a></div>';
 h+='<section class="sec"><div class="sec-head"><h2>'+(own?t('Campaign settings'):esc(c.name))+'</h2><span class="row" style="gap:6px">'+chipsFor(c,user.uid)+'</span></div>';
 if(own)h+='<form id="renform" class="row" style="align-items:flex-end" novalidate><label class="field" style="flex:1;min-width:220px"><span class="lbl">'+t('Campaign name')+'</span><input class="f" id="rname" maxlength="60" value="'+esc(c.name)+'" data-orig="'+esc(c.name)+'"></label><button class="btn" type="submit" id="renbtn" disabled>'+t('Rename')+'</button></form><label class="optrow"><input type="checkbox" data-ownedit'+(c.ownerEdits===true?' checked':'')+'><span><b>'+t('Let me edit every investigator')+'</b><br><span class="note">'+t('Change any investigator and delete Recent entries. Untick to play by the same rules as everyone else. You can still choose who plays each investigator.')+'</span></span></label>'+'<label class="optrow"><input type="checkbox" data-gmedit'+(c.gmEdits===true?' checked':'')+'><span><b>'+t('Let the GM edit every investigator')+'</b><br><span class="note">'+t('The GM can change anything on any investigator and delete Recent entries, not just use the session tools. They can’t choose who plays each investigator.')+'</span></span></label>'+
  '<div class="field"><span class="lbl">'+t('Campaign picture')+'</span><div class="row" style="align-items:center;gap:12px">'+(photoOk(c.photo)?'<img class="setimg" src="'+c.photo+'" alt="'+t('Campaign picture')+'" data-zoom'+(photoOk(c.photoFull)?' data-full="'+c.photoFull+'"':'')+'>':'<span class="setimg empty" aria-hidden="true"></span>')+'<label class="btn sm" for="cphoto" style="cursor:pointer">'+(photoOk(c.photo)?t('Change picture'):t('Add a picture'))+'</label><input type="file" id="cphoto" accept="image/*" hidden>'+(photoOk(c.photo)?'<button class="btn sm" data-a="cphotodel">'+t('Remove')+'</button>':'')+'</div><span class="note">'+t('Shows on the campaign’s card and next to its name in the ledger.')+'</span></div>';
 else if(photoOk(c.photo))h+='<img class="setimg wide" src="'+c.photo+'" alt="'+esc(c.name)+'" data-zoom'+(photoOk(c.photoFull)?' data-full="'+c.photoFull+'"':'')+'>';
 h+='</section>';
 if(own)h+=nextSessionHtml(c,true);
 // members
 h+='<section class="sec"><div class="sec-head"><h2>'+t('Members')+'</h2><span class="note">'+t('{n} of {max}',{n:(c.memberIds||[]).length,max:MAX_MEMBERS})+'</span></div><div class="list">'+(c.memberIds||[]).map(u=>{
  const nm=names[u]||t('Unknown');let act='';
  if(own){act+=c.gmUid===u?'<button class="btn sm" data-a="gm" data-u="">'+t('Remove GM')+'</button>':'<button class="btn sm" data-a="gm" data-u="'+esc(u)+'">'+t('Make GM')+'</button>';
   if(u!==c.ownerUid)act+=ui.kick===u?'<span class="note">'+t('Remove {name}?',{name:esc(nm)})+'</span><button class="btn sm dng" data-a="kickyes" data-u="'+esc(u)+'">'+t('Remove')+'</button><button class="btn sm" data-a="kickno">'+t('Cancel')+'</button>':'<button class="btn sm" data-a="kick" data-u="'+esc(u)+'">'+t('Remove')+'</button>';}
  return '<div class="item" style="flex-wrap:wrap"><div class="grow"><b>'+esc(nm)+'</b>'+(u===user.uid?' <span class="note">'+t('(you)')+'</span>':'')+'</div><span class="row" style="gap:6px">'+chipsFor(c,u)+act+'</span></div>';}).join('')+'</div>';
 if(own)h+='<p class="note" style="margin:0">'+t('The GM runs the GM tools. You can make yourself the GM, or hand it to a player.')+'</p>';
 h+='</section>';
 h+=houseHtml(c,own);
 if(own){
  const link=joinLink(c);
  h+='<section class="sec"><div class="sec-head"><h2>'+t('Invite players')+'</h2><span class="note">'+t('{n} of {max} spots used',{n:(c.memberIds||[]).length,max:MAX_MEMBERS})+'</span></div>';
  h+='<div><span class="lbl">'+t('Invite link')+'</span>'+(link?'<div class="row"><input class="f" id="ilink" readonly value="'+esc(link)+'" style="flex:1;min-width:220px" aria-label="'+t('Invite link')+'"><button class="btn pri" data-a="lcopy">'+t('Copy link')+'</button>'+(navigator.share?'<button class="btn" data-a="lshare">'+t('Share…')+'</button>':'')+'</div><p class="note" style="margin:6px 0 0">'+t('Anyone with this link can join after signing in. Share it in your group chat.')+'</p><div class="row" style="margin-top:8px;align-items:center"><button class="btn sm" data-a="lnew">'+t('Make a new link')+'</button><span class="note">'+t('The current link will stop working.')+'</span></div>'
   :'<div class="row"><button class="btn pri" data-a="lnew">'+t('Create invite link')+'</button></div>')+'</div>';
  h+='<form id="invform" class="row" style="align-items:flex-end" novalidate><label class="field" style="flex:1;min-width:220px"><span class="lbl">'+t('Or invite by email')+'</span><input class="f" id="iemail" type="email" autocapitalize="off" spellcheck="false" placeholder="friend@example.com"></label><button class="btn" type="submit" '+(ui.busy?'disabled':'')+'>'+t('Add invite')+'</button></form>'+errHtml()+
   '<p class="note" style="margin:0">'+t('They’ll see the invite on their My campaigns page when they sign in with this email address. We’ll also email them to let them know.')+'</p>';
  if(outbox.length)h+='<div><span class="lbl">'+t('Waiting to join')+'</span><div class="list">'+outbox.map(i=>'<div class="item"><div class="grow"><b>'+esc(i.toEmail)+'</b><span class="effect">'+t('Invited')+'</span></div><button class="btn sm" data-a="icancel" data-id="'+esc(i.id)+'">'+t('Cancel invite')+'</button></div>').join('')+'</div></div>';
  h+='</section>';
  h+='<section class="sec"><div class="sec-head"><h2>'+t('Delete campaign')+'</h2></div>'+(ui.confirmDel?'<p class="note" style="margin:0">'+t('Delete “{name}” for everyone? This can’t be undone.',{name:esc(c.name)})+'</p><div class="row"><button class="btn dng" data-a="delyes">'+t('Yes, delete it')+'</button><button class="btn" data-a="delno">'+t('Cancel')+'</button></div>':'<div class="row"><button class="btn dng" data-a="delask">'+t('Delete this campaign…')+'</button></div>')+'</section>';
 }else{
  h+='<section class="sec"><div class="sec-head"><h2>'+t('Leave campaign')+'</h2></div>'+(ui.confirmLeave?'<p class="note" style="margin:0">'+t('Leave “{name}”? You’ll need a new invite to come back.',{name:esc(c.name)})+'</p><div class="row"><button class="btn dng" data-a="leaveyes">'+t('Yes, leave')+'</button><button class="btn" data-a="leaveno">'+t('Cancel')+'</button></div>':'<div class="row"><button class="btn" data-a="leaveask">'+t('Leave this campaign…')+'</button></div>')+'</section>';
 }
 return h;
}

// ---------- auth ----------
const AUTH_MSG={'auth/invalid-email':t('That email address doesn’t look right.'),'auth/missing-password':t('Enter your password.'),'auth/weak-password':t('Use at least 6 characters for your password.'),
 'auth/email-already-in-use':t('There’s already an account with that email. Sign in instead.'),'auth/invalid-credential':t('Wrong email or password.'),'auth/wrong-password':t('Wrong email or password.'),'auth/user-not-found':t('Wrong email or password.'),
 'auth/too-many-requests':t('Too many tries. Wait a minute and try again.'),'auth/popup-closed-by-user':'','auth/cancelled-popup-request':'','auth/network-request-failed':t('Can’t reach the server. Check your connection.'),
 'auth/unauthorized-domain':t('This web address isn’t allowed to sign in yet (Firebase → Authentication → Settings → Authorized domains).'),'auth/operation-not-allowed':t('That sign-in method isn’t turned on in Firebase yet.')};
const authErr=e=>{const c=e&&e.code;return c in AUTH_MSG?AUTH_MSG[c]:t('Something went wrong ({code}). Try again.',{code:c||'unknown'});};
async function busy(fn){ui.busy=true;ui.err='';render();try{await fn();}catch(e){(window.quotaHit&&quotaHit(e),console.warn(e));ui.err=e&&e.code&&String(e.code).startsWith('auth/')?authErr(e):(e&&e.msg)||t('Couldn’t do that ({code}). Try again.',{code:(e&&e.code)||'error'});}ui.busy=false;render();}
async function google(){const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
 try{await auth.signInWithPopup(p);}catch(e){if(e&&(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'))await auth.signInWithRedirect(p);else throw e;}}
async function emailSubmit(){
 const v=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
 const em=v('em'),pw=document.getElementById('pw')?document.getElementById('pw').value:'';
 if(!em)throw {msg:t('Enter your email.')};
 if(ui.mode==='reset'){await auth.sendPasswordResetEmail(em);ui.mode='signin';toast(t('If that email has an account, a reset link is on its way.'));return;}
 if(!pw)throw {msg:t('Enter your password.')};
 if(ui.mode==='signup'){if(pw!==document.getElementById('pw2').value)throw {msg:t('The passwords don’t match.')};const cred=await auth.createUserWithEmailAndPassword(em,pw);try{await cred.user.sendEmailVerification();}catch(e){}}
 else await auth.signInWithEmailAndPassword(em,pw);
}

// ---------- username ----------
async function saveUsername(){
 const raw=(document.getElementById('un')||{}).value||'';const name=raw.trim();
 if(!/^[A-Za-z0-9_]{3,20}$/.test(name))throw {msg:t('Use 3–20 letters, numbers or underscores.')};
 const lower=name.toLowerCase();const uref=db.doc('usernames/'+lower);
 await db.runTransaction(async tx=>{const s=await tx.get(uref);if(s.exists&&s.data().uid!==user.uid)throw {msg:t('That username is taken. Try another.')};
  tx.set(uref,{uid:user.uid});tx.set(db.doc('users/'+user.uid),{username:name,usernameLower:lower,created:firebase.firestore.FieldValue.serverTimestamp()});});
 toast(t('Welcome, {name}.',{name}));
}

// ---------- campaigns ----------
function watchCampaigns(){if(campUnsub)campUnsub();
 campUnsub=db.collection('campaigns').where('memberIds','array-contains',user.uid).onSnapshot(qs=>{camps=[];qs.forEach(d=>camps.push({...d.data(),id:d.id}));camps.sort((a,b)=>String(a.name).localeCompare(String(b.name)));ui.campsLoaded=true;saveBC();render();maybeSaveLocal();},e=>{(window.quotaHit&&quotaHit(e),console.warn(e));toast(t('Couldn’t load your campaigns.'));});}
async function createCampaign(){
 const name=((document.getElementById('cname')||{}).value||'').trim();
 if(!name)throw {msg:t('Give the campaign a name.')};
 if(camps.filter(c=>c.ownerUid===user.uid).length>=MAX_OWNED)throw {msg:t('You can own up to {n} campaigns.',{n:MAX_OWNED})};
 const ref=ui.newId?db.collection('campaigns').doc(ui.newId):db.collection('campaigns').doc();
 await ref.set({name:name.slice(0,60),ownerUid:user.uid,memberIds:[user.uid],roles:{[user.uid]:'owner'},names:{[user.uid]:profile.username},created:firebase.firestore.FieldValue.serverTimestamp()});
 // the rules take these one at a time after the campaign exists
 await ref.update({joinCode:newCode()}).catch(()=>{});
 if((ui.newGM||'me')==='me')await ref.update({gmUid:user.uid}).catch(()=>{});
 if(ui.newPhoto)await Promise.all([storeImage(ui.newPhoto,'campaigns/'+ref.id+'/'+user.uid),ui.newPhotoFull?storeImage(ui.newPhotoFull,'campaigns/'+ref.id+'/'+user.uid):null]).then(([u,fu])=>{if(!isStoredImage(u))throw 0;return ref.update(isStoredImage(fu)?{photo:u,photoFull:fu}:{photo:u});}).catch(()=>toast(t('The picture didn’t save; add it again in Settings.')));
 ui.newPhoto=null;ui.newGM=null;ui.newId=null;ui.view='invite';ui.cid=ref.id;ui.waitCid=ref.id;window.scrollTo(0,0);
}

// Copies the device-only campaign into a new campaign on this account (owner and GM), then forgets the local copy.
function swapUid(v,uid){
 if(v===LOCAL_UID)return uid;
 if(Array.isArray(v))return v.map(x=>swapUid(x,uid));
 if(v&&typeof v==='object'){const o={};Object.keys(v).forEach(k=>{o[k===LOCAL_UID?uid:k]=swapUid(v[k],uid);});return o;}
 return v;
}
async function storeInline(v,folder){
 if(typeof v==='string'&&v.indexOf('data:image/jpeg')===0)return storeImage(v,folder);
 if(Array.isArray(v)){const out=[];for(const x of v)out.push(await storeInline(x,folder));return out;}
 if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v))o[k]=await storeInline(v[k],folder);return o;}
 return v;
}
function forgetLocal(){LocalFB.clear();try{Object.keys(localStorage).filter(k=>k.indexOf(LOCAL_CAMP)>=0).forEach(k=>localStorage.removeItem(k));}catch(e){}}
async function migrateLocal(){
 const d=LocalFB.dump();if(!d.camp)return;
 if(camps.filter(c=>c.ownerUid===user.uid).length>=MAX_OWNED)throw {msg:t('You own {n} campaigns, the most allowed. Delete one first, then save this one.',{n:MAX_OWNED})};
 ui.localBusy=true;render();
 try{
  const uid=user.uid,ref=db.collection('campaigns').doc(),folder='campaigns/'+ref.id+'/'+uid;
  await ref.set({name:String(d.camp.name||t('My campaign')).slice(0,60),ownerUid:uid,memberIds:[uid],roles:{[uid]:'owner'},names:{[uid]:profile.username},created:FV().serverTimestamp()});
  await ref.update({joinCode:newCode()}).catch(()=>{});
  await ref.update({gmUid:uid}).catch(()=>{});
  const ns={};['nextSession','nextWhere','nextHours'].forEach(k=>{if(d.camp[k]!=null)ns[k]=d.camp[k];});
  if(Object.keys(ns).length)await ref.update(ns).catch(()=>{});
  if(photoOk(d.camp.photo))await storeImage(d.camp.photo,folder).then(u=>ref.update({photo:u})).catch(()=>{});
  // Everything inside the campaign, with "local" swapped for this account and pictures moved to file storage.
  // Investigators first, so players/<uid> can point at one that already exists.
  const skip=/^(locks|grants)\//,rank=p=>p.indexOf('characters/')===0?0:p.indexOf('players/')===0?1:2;
  const docs=d.docs.filter(([p])=>!skip.test(p)).sort((a,b)=>rank(a[0])-rank(b[0]));
  let failed=0;
  for(const [p,data] of docs){
   const parts=p.split('/').map(x=>x===LOCAL_UID?uid:x);
   try{const v=swapUid(data,uid);if(parts[0]==='characters'&&v&&v.player==='You')v.player=v.ownerUid===uid?profile.username:'';await db.doc('campaigns/'+ref.id+'/'+parts.join('/')).set(await storeInline(v,folder));}catch(e){failed++;console.warn('Copying',p,e);}
  }
  if(failed&&failed===docs.length){await ref.delete().catch(()=>{});throw {msg:t('Couldn’t copy the campaign. It’s still saved on this device; try again.')};}
  forgetLocal();
  wantSave=false;try{sessionStorage.removeItem('apl-savelocal');}catch(e){}
  ui.view='invite';ui.cid=ref.id;ui.waitCid=ref.id;window.scrollTo(0,0);
  toast(failed?tn('Saved to your account, but {n} item didn’t copy.','Saved to your account, but {n} items didn’t copy.',failed):t('Saved to your account.'));
 }finally{ui.localBusy=false;}
}

// ---------- invites & members ----------
const FV=()=>firebase.firestore.FieldValue;
const myEmail=()=>String((user&&user.email)||'').toLowerCase();
function watchInbox(){if(inboxUnsub)inboxUnsub();inbox=[];if(!myEmail())return;
 inboxUnsub=db.collection('invites').where('toEmail','==',myEmail()).onSnapshot(qs=>{inbox=[];qs.forEach(d=>inbox.push({...d.data(),id:d.id}));render();},e=>(window.quotaHit&&quotaHit(e),console.warn(e)));}
// ---------- house rules (stored per campaign) ----------
let hr=null,hrCid=null,hrUnsub=null,hrT=null,hrErr='';
const GEAR_CATS=[t('Protection'),t('Useful items'),t('Tools and personal'),t('Outdoors'),t('Transport')];
const clean=t=>String(t||'').replace(/^House rule\.\s*/,'');
const rid=()=>Math.random().toString(36).slice(2,9);
// Last-seen house rules and pending invites per campaign, so Settings doesn't flash empty on reload.
const memo=(k,v)=>{try{if(v===undefined)return JSON.parse(localStorage.getItem('apl-memo-'+k)||'null');localStorage.setItem('apl-memo-'+k,JSON.stringify(v));}catch(e){return null;}};
function watchHouse(cid){if(hrCid===cid)return;if(hrUnsub){hrUnsub();hrUnsub=null;}hr=null;hrErr='';hrCid=cid;if(!cid)return;
 hr=memo('hr-'+cid)||null;
 hrUnsub=db.doc('campaigns/'+cid+'/settings/house').onSnapshot(sn=>{if(hrT||ui.hedit)return;const d=sn.exists?sn.data():{};hr={on:!!d.on,weapons:(d.weapons||[]).map(w=>({id:w.id||rid(),...w})),gear:(d.gear||[]).map(g=>({id:g.id||rid(),...g})),rules:d.rules||[],hidden:d.hidden||[]};memo('hr-'+cid,hr);render();},e=>{(window.quotaHit&&quotaHit(e),console.warn(e));hrErr=(e&&e.code)||'error';render();});}
function saveHouse(){clearTimeout(hrT);hrT=setTimeout(()=>{hrT=null;const cid=hrCid;if(!cid||!hr)return;
 memo('hr-'+cid,hr);db.doc('campaigns/'+cid+'/settings/house').set({on:!!hr.on,weapons:hr.weapons,gear:hr.gear,rules:hr.rules,hidden:hr.hidden||[]},{merge:true}).catch(e=>{(window.quotaHit&&quotaHit(e),console.warn(e));toast(t('Couldn’t save the house rules.'));});},350);}
function descOf(kind,x){
 if(kind==='weapon')return [x.s?t(x.s):'',x.d!==''&&x.d!=null?t('damage {n}',{n:x.d}):'',x.i&&x.i!=='–'?t('injury {n}',{n:x.i}):'',x.r?t('range {r}',{r:x.r}):'',x.a?tn('{n} shot','{n} shots',Number(x.a)):'',x.fr?t('free reloads'):'',x.c?'$'+x.c:t('costs nothing')].filter(Boolean).join(', ')+'.'+(clean(x.sp)&&clean(x.sp)!=='Free reloads.'?' '+t(clean(x.sp)):'');
 if(kind==='gear')return (x.cat?t(x.cat)+', ':'')+(x.c?'$'+x.c:t('costs nothing'))+'.'+(clean(x.note)?' '+t(clean(x.note)):'');
 return t(clean(x.note))||'';}
const LIST={weapon:'weapons',gear:'gear',rule:'rules'},KIND_LABEL={weapon:t('Weapon'),gear:t('Equipment'),rule:t('Rule')};
// A campaign's house rules are only what its owner adds (no ready-made suggestions; every group's differ).
// Rules ticked from the old suggestions (such as universal ammo) stay listed so they can be switched off or removed.
function customs(){
 return [...hr.rules.filter(r=>r.custom||r.id==='universalAmmo').map(x=>({kind:'rule',x})),...hr.weapons.map(x=>({kind:'weapon',x})),...hr.gear.map(x=>({kind:'gear',x}))];}
function houseHtml(c,own){
 if(!hr)return '<section class="sec"><div class="sec-head"><h2>'+t('House rules')+'</h2></div><p class="note" style="margin:0">'+(hrErr?t('Couldn’t load the house rules ({code}). Reload the page; if it keeps happening, the latest database rules may not be published yet.',{code:esc(hrErr)}):t('Loading…'))+'</p></section>';
 const cs=customs();
 let h='<section class="sec"><div class="sec-head"><h2>'+t('House rules')+'</h2>'+(own?'<label class="row note" style="gap:6px"><input type="checkbox" id="hr-on" data-hr="on"'+(hr.on?' checked':'')+'> '+t('Turned on')+'</label>':'<span class="chip'+(hr.on?' ok':'')+'">'+(hr.on?t('On'):'Off')+'</span>')+'</div>';
 if(!own){const rows=[...cs.filter(c=>!c.x.off&&c.x.n).map(c=>[t(c.x.n),(c.kind==='rule'?'':KIND_LABEL[c.kind]+': ')+descOf(c.kind,c.x)])];
  return h+(rows.length?'<div class="list">'+rows.map(([n,d])=>'<div class="item"><div class="grow"><b>'+esc(n)+'</b>'+(d?'<span class="effect">'+esc(d)+'</span>':'')+'</div></div>').join('')+'</div>':'<p class="note" style="margin:0">'+t('None.')+'</p>')+'</section>';}
 h+='<p class="note" style="margin:0">'+t('Write the house rules your group uses. While house rules are turned on, ticked ones apply to everyone in this campaign.')+'</p>';
 const row=(id,checked,data,name,desc,extra)=>'<div class="item" style="gap:10px;align-items:flex-start;flex-wrap:wrap"><input type="checkbox" id="'+id+'" '+data+(checked?' checked':'')+' style="margin-top:4px" aria-label="'+t('Use {name}',{name:esc(name||t('this rule'))})+'"><label class="grow" for="'+id+'" style="cursor:pointer"><b>'+esc(name||t('(no name yet)'))+'</b><span class="effect">'+esc(desc)+'</span></label>'+(extra||'')+'</div>';
 let list=[];
 const inp=(x,k,ph,type,w)=>'<label class="field"'+(w?' style="'+w+'"':'')+'><span class="lbl">'+ph+'</span><input class="f" id="hx-'+x.id+'-'+k+'" data-hx="'+x.id+'" data-k="'+k+'" type="'+(type||'text')+'" value="'+esc(x[k]==null?'':x[k])+'"'+(type==='number'?' min="0" step="any"':'')+'></label>';
 cs.forEach(({kind,x})=>{
  const editing=ui.hedit===x.id;
  const btns='<span class="row" style="gap:6px">'+(editing?'':'<button class="btn sm" data-a="hedit" data-id="'+esc(x.id)+'">'+t('Edit')+'</button>')+'<button class="btn sm" data-a="hdel" data-id="'+esc(x.id)+'" data-kind="'+kind+'">'+t('Remove')+'</button></span>';
  let form='';
  if(editing){
   form='<div style="flex-basis:100%;display:flex;flex-direction:column;gap:8px;padding-left:26px"><div class="wgrid">';
   if(kind==='rule')form+=inp(x,'n',t('Name'))+inp(x,'note',t('What it does'),'text','grid-column:1/-1');
   if(kind==='weapon')form+=inp(x,'n',t('Name'))+'<label class="field"><span class="lbl">'+t('Skill')+'</span><select class="f" id="hx-'+x.id+'-s" data-hx="'+x.id+'" data-k="s">'+['Ranged Combat','Melee Combat'].map(o=>'<option value="'+o+'"'+(x.s===o?' selected':'')+'>'+t(o)+'</option>').join('')+'</select></label>'+
    inp(x,'d',t('Damage'))+inp(x,'i',t('Injury rating'))+inp(x,'r',t('Range'))+inp(x,'a',t('Ammo'),'number')+inp(x,'c',t('Price $'),'number')+inp(x,'rc',t('Reload price $'),'number')+inp(x,'sp',t('Special rules'))+
    '<label class="row note" style="gap:6px;align-self:end"><input type="checkbox" id="hx-'+x.id+'-fr" data-hx="'+x.id+'" data-k="fr"'+(x.fr?' checked':'')+'> '+t('Free reloads')+'</label>';
   if(kind==='gear')form+='<label class="field"><span class="lbl">'+t('Category')+'</span><select class="f" id="hx-'+x.id+'-cat" data-hx="'+x.id+'" data-k="cat">'+GEAR_CATS.map(o=>'<option value="'+o+'"'+(x.cat===o?' selected':'')+'>'+t(o)+'</option>').join('')+'</select></label>'+inp(x,'n',t('Name'))+inp(x,'c',t('Price $'),'number')+inp(x,'note',t('What it does'),'text','grid-column:1/-1');
   form+='</div><div class="row"><button class="btn sm pri" data-a="hdone">'+t('Done')+'</button></div></div>';
  }
  list.push(row('hc-'+x.id,!x.off,'data-hc="'+esc(x.id)+'" data-kind="'+kind+'"',x.n?t(x.n):'',(kind==='rule'?'':KIND_LABEL[kind]+': ')+descOf(kind,x),btns+form));
 });
 h+=list.length?'<div class="list">'+list.join('')+'</div>':'<p class="note" style="margin:0">'+t('None.')+'</p>';
 h+='<div class="row"><span class="note">'+t('Write your own:')+'</span><button class="btn sm" data-a="hnew" data-kind="rule">'+t('+ Rule')+'</button><button class="btn sm" data-a="hnew" data-kind="weapon">'+t('+ Weapon')+'</button><button class="btn sm" data-a="hnew" data-kind="gear">'+t('+ Equipment')+'</button></div>';
 return h+'</section>';
}
const NUMK=['a','c','rc'];
function findCustom(id){for(const k of ['rules','weapons','gear']){const it=hr[k].find(x=>x.id===id);if(it)return it;}return null;}
function houseChange(el){if(!hr)return false;
 if(el.dataset.hr==='on'){hr.on=el.checked;saveHouse();return true;}
 if(el.dataset.hc){const it=findCustom(el.dataset.hc);if(it){if(el.checked)delete it.off;else it.off=true;saveHouse();}return true;}
 if(el.dataset.hx){const it=findCustom(el.dataset.hx);if(!it)return true;const k=el.dataset.k;
  it[k]=el.type==='checkbox'?el.checked:NUMK.includes(k)?Math.max(0,Number(el.value)||0):el.value.slice(0,300);saveHouse();return true;}
 return false;}
function watchOutbox(cid){if(outCid===cid)return;if(outUnsub){outUnsub();outUnsub=null;}outbox=[];outCid=cid;if(!cid)return;
 outbox=memo('out-'+cid)||[];
 outUnsub=db.collection('invites').where('cid','==',cid).where('fromUid','==',user.uid).onSnapshot(qs=>{outbox=[];qs.forEach(d=>outbox.push({...d.data(),id:d.id}));memo('out-'+cid,outbox);render();},e=>(window.quotaHit&&quotaHit(e),console.warn(e)));}
const joinLink=c=>c.joinCode?location.origin+location.pathname+'?join='+encodeURIComponent(c.id+'.'+c.joinCode)+'&n='+encodeURIComponent(c.name):'';
function newCode(){const a=new Uint8Array(15);crypto.getRandomValues(a);return Array.from(a,x=>'abcdefghijklmnopqrstuvwxyz0123456789'[x%36]).join('');}
async function sendInvite(){
 const c=camps.find(x=>x.id===ui.cid);if(!c)return;
 const em=((document.getElementById('iemail')||{}).value||'').trim().toLowerCase();
 if(!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(em)||em.length>120)throw {msg:t('That email address doesn’t look right.')};
 if(em===myEmail())throw {msg:t('That’s your own email.')};
 if(outbox.some(i=>i.toEmail===em))throw {msg:t('There’s already an invite waiting for {email}.',{email:em})};
 if((c.memberIds||[]).length+outbox.length>=MAX_MEMBERS)throw {msg:t('A campaign can have up to {n} members, counting invites.',{n:MAX_MEMBERS})};
 await db.doc('invites/'+c.id+'_'+em).set({cid:c.id,campaignName:c.name,fromUid:user.uid,fromName:profile.username,toEmail:em,created:FV().serverTimestamp(),...(photoOk(c.photo)?{photo:c.photo}:{})});
 ui.clear.add('iemail');toast(t('Invite saved for {email}. Let them know to sign in with that email.',{email:em}));
}
async function joinByLink(){
 const j=pendingJoin;if(!j)return;
 const b=db.batch();
 b.set(db.doc('joinreq/'+j.cid+'_'+user.uid),{cid:j.cid,code:j.code});
 b.update(db.doc('campaigns/'+j.cid),{memberIds:FV().arrayUnion(user.uid),['roles.'+user.uid]:'player',['names.'+user.uid]:profile.username});
 try{await b.commit();}catch(e){(window.quotaHit&&quotaHit(e),console.warn(e));throw {msg:e&&e.code==='not-found'?t('That campaign no longer exists.'):t('This invite link doesn’t work anymore. Ask for a new one.')};}
 setPendingJoin(null);location.href=ledgerUrl(j.cid);return;toast(t('You joined {name}.',{name:j.name||t('the campaign')}));
}
let pendingJoin=null;
function setPendingJoin(v){pendingJoin=v;try{v?sessionStorage.setItem('apl-join',JSON.stringify(v)):sessionStorage.removeItem('apl-join');}catch(e){}}
async function joinInvite(id){
 const inv=inbox.find(x=>x.id===id);if(!inv)return;
 const b=db.batch();
 b.update(db.doc('campaigns/'+inv.cid),{memberIds:FV().arrayUnion(user.uid),['roles.'+user.uid]:'player',['names.'+user.uid]:profile.username});
 b.delete(db.doc('invites/'+id));
 try{await b.commit();toast(t('You joined {name}.',{name:inv.campaignName}));}
 catch(e){(window.quotaHit&&quotaHit(e),console.warn(e));if(e&&e.code==='not-found'){await db.doc('invites/'+id).delete().catch(()=>{});toast(t('That campaign no longer exists.'));}else toast(t('Couldn’t join. Try again.'));}
}
// Firestore doesn't delete a campaign's contents with it, so clear each part first.
async function wipeCampaign(id){
 await dropFolder('campaigns/'+id);
 for(const col of ['characters','players','table','campaign','enemies','clues','gm','gmlog','history','settings','gallery']){
  try{const qs=await db.collection('campaigns/'+id+'/'+col).get();await Promise.all(qs.docs.map(d=>d.ref.delete()));}catch(e){console.warn('wipe',col,e);}
 }
}
async function regenLink(){const c=camps.find(x=>x.id===ui.cid);if(!c)return;await db.doc('campaigns/'+c.id).update({joinCode:newCode()});toast(c.joinCode?t('New link made. The old one no longer works.'):t('Invite link ready.'));}
function memberOut(c,u){const p={memberIds:FV().arrayRemove(u),['roles.'+u]:FV().delete(),['names.'+u]:FV().delete()};if(c.gmUid===u)p.gmUid=null;return db.doc('campaigns/'+c.id).update(p);}

// ---------- events ----------
app.addEventListener('submit',e=>{e.preventDefault();const id=e.target.id;
 if(id==='authform')busy(emailSubmit);
 else if(id==='unform')busy(saveUsername);
 else if(id==='newform')busy(createCampaign);
 else if(id==='nsform'){const hv=(document.getElementById('nshours')||{}).value;busy(async()=>{const v=(document.getElementById('nsdate')||{}).value,w=((document.getElementById('nswhere')||{}).value||'').trim().slice(0,80);const ts=v?new Date(v).getTime():NaN;
  if(!Number.isFinite(ts))throw {msg:t('Pick a date and time.')};if(ts<Date.now()-3600000)throw {msg:t('That time has already passed.')};
  await db.doc('campaigns/'+ui.cid).update({nextSession:ts,nextWhere:w,nextHours:sessionHoursValue(hv)===null?FV().delete():sessionHoursValue(hv)});toast(t('Next session set for {when}.',{when:sessionWhen(ts)}));});}
 else if(id==='invform')busy(sendInvite);
 else if(id==='renform')busy(async()=>{const n=document.getElementById('rname').value.trim();if(!n)throw {msg:t('Give the campaign a name.')};await db.doc('campaigns/'+ui.cid).update({name:n.slice(0,60)});const c0=camps.find(x=>x.id===ui.cid);if(c0)c0.name=n.slice(0,60);toast(t('Renamed.'));});
});
// Rename is only clickable when the name has actually been changed.
function syncRename(){const i=document.getElementById('rname'),b=document.getElementById('renbtn');if(i&&b){const v=i.value.trim();b.disabled=ui.busy||!v||v===i.dataset.orig;}}
app.addEventListener('input',e=>{if(e.target.id==='rname')syncRename();if(e.target.id==='cname'){if(ui.err){ui.err='';const er=app.querySelector('.err');if(er)er.remove();}const p=document.getElementById('nprevname');if(p)p.textContent=e.target.value.trim()||t('Your campaign');}});
app.addEventListener('change',e=>{const el=e.target;if(el.id==='acctlang'){I18N.set(el.value);return;}if(el.id==='avphoto'){const f=el.files&&el.files[0];el.value='';openCropper(f,{title:t('Position your photo'),shape:'circle',outW:160,outH:160,maxLen:18000,onError:toast,onSave:d=>{const old=profile.photo;profile={...profile,photo:d};render();storeImage(d,'users/'+user.uid).then(u=>db.doc('users/'+user.uid).update({photo:u})).then(()=>{toast(t('Photo saved.'));dropImage(old);},er=>{if(window.quotaHit&&quotaHit(er))return;toast(t('Couldn’t save the photo. Try again.'));});}});return;}if(el.id==='nphoto'){const f=el.files&&el.files[0];el.value='';openCropper(f,{title:t('Position the campaign picture'),shape:'wide',outW:1600,outH:900,maxLen:700000,full:{side:2400,maxLen:1200000},onError:toast,onSave:(d,full)=>{ui.newPhoto=d;ui.newPhotoFull=full;render();}});return;}if(el.name==='ngm'){ui.newGM=el.value;return;}if(el.id==='cphoto'){campPhoto(el.files&&el.files[0]);el.value='';return;}if(el.hasAttribute('data-gmedit')){const on=el.checked;db.doc('campaigns/'+ui.cid).update({gmEdits:on}).then(()=>toast(on?t('The GM can edit every investigator now.'):t('The GM is back to the session tools only.'))).catch(er=>{if(window.quotaHit&&quotaHit(er))return;el.checked=!on;toast(t('Couldn’t save that. Try again.'));});return;}if(el.hasAttribute('data-ownedit')){const on=el.checked;db.doc('campaigns/'+ui.cid).update({ownerEdits:on}).then(()=>toast(on?t('You can edit every investigator again.'):t('Other players’ investigators are locked to them now.'))).catch(er=>{if(window.quotaHit&&quotaHit(er))return;el.checked=!on;toast(t('Couldn’t save that. Try again.'));});return;}houseChange(el);});
window.addEventListener('acct-signout',()=>auth&&auth.signOut());
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;const a=b.dataset.a;if(a==='account')e.preventDefault();
 switch(a){
  case 'google':busy(google);break;
  case 'savecancel':wantSave=false;try{sessionStorage.removeItem('apl-savelocal');}catch(er){}break;
  case 'trylocal':LocalFB.create(t('My campaign'));location.href='play.html?c='+LOCAL_CAMP;break;
  case 'savelocal':busy(migrateLocal);break;
  case 'dellocal':ui.confirmLocalDel=true;render();break;
  case 'dellocalno':ui.confirmLocalDel=false;render();break;
  case 'dellocalyes':ui.confirmLocalDel=false;forgetLocal();toast(t('Deleted from this browser.'));render();break;
  case 'mode':ui.mode=b.dataset.m;ui.err='';render();break;
  case 'signout':auth.signOut();break;
  case 'newopen':ui.view='new';ui.newId=db.collection('campaigns').doc().id;ui.err='';ui.newPhoto=null;ui.newGM=null;ui.clear.add('cname');render();window.scrollTo(0,0);{const i=document.getElementById('cname');if(i)i.focus();}break;
  case 'nphotodel':ui.newPhoto=null;render();break;
  case 'newclose':ui.newOpen=false;ui.err='';render();break;
  case 'open':ui.view='camp';ui.cid=b.dataset.id;ui.confirmDel=false;ui.confirmLeave=false;ui.kick=null;ui.err='';render();window.scrollTo(0,0);break;
  case 'home':ui.view='home';ui.err='';render();break;
  case 'hnew':if(hr){const k=b.dataset.kind,id=rid();const base=k==='rule'?{id,n:'',note:'',custom:true}:k==='weapon'?{id,n:'',s:'Ranged Combat',d:'',i:'',r:'',a:0,c:0,rc:0,fr:false,sp:''}:{id,cat:t('Useful items'),n:'',c:0,note:''};hr[LIST[k]].push(base);ui.hedit=id;saveHouse();render();const f=document.getElementById('hx-'+id+'-n');if(f)f.focus();}break;
  case 'cphotodel':db.doc('campaigns/'+ui.cid).update({photo:FV().delete(),photoFull:FV().delete()}).then(()=>toast(t('Picture removed.'))).catch(er=>{if(window.quotaHit&&quotaHit(er))return;toast(t('Couldn’t remove it. Try again.'));});break;
  case 'hedit':ui.hedit=b.dataset.id;render();break;
  case 'hdone':ui.hedit=null;render();break;
  case 'hdel':if(hr){const k=LIST[b.dataset.kind];hr[k]=hr[k].filter(x=>x.id!==b.dataset.id);if(ui.hedit===b.dataset.id)ui.hedit=null;saveHouse();render();}break;
  case 'nsclear':db.doc('campaigns/'+ui.cid).update({nextSession:FV().delete(),nextWhere:FV().delete(),nextHours:FV().delete()}).then(()=>toast(t('Next session cleared.')),er=>{if(window.quotaHit&&quotaHit(er))return;toast(t('Couldn’t clear it. Try again.'));});break;
  case 'avphotodel':dropImage(profile.photo);profile={...profile,photo:''};render();db.doc('users/'+user.uid).update({photo:FV().delete()}).catch(er=>{if(window.quotaHit&&quotaHit(er))return;toast(t('Couldn’t remove it. Try again.'));});break;
  case 'avc':{const k='color',v=b.dataset.v;profile={...profile,[k]:v};render();db.doc('users/'+user.uid).update({[k]:v}).catch(er=>{if(window.quotaHit&&quotaHit(er))return;toast(t('Couldn’t save that. Try again.'));});break;}
  case 'account':ui.view='account';ui.delAsk=false;render();window.scrollTo(0,0);break;
  case 'remindtog':{const on=b.checked;savePrefs({noRemind:!on},on?t('Session reminders on.'):t('Session reminders off.'));break;}
  case 'clutog':{const on=b.checked;savePrefs({noCluePush:!on},on?t('Clue notifications on.'):t('Clue notifications off.'));break;}
  case 'turntog':{const on=b.checked;savePrefs({pushTurns:on},on?t('Turn notifications on.'):t('Turn notifications off.'));break;}
  case 'pushon':pushOn();break;
  case 'pushoff':pushOff();break;
  case 'pushtest':try{navigator.serviceWorker.ready.then(r=>r.showNotification('Arkham Horror RPG Ledger',{body:t('Notifications are working on this device.'),icon:'icon-192.png'}));}catch(e){toast(t('Couldn’t show a test here.'));}break;
  case 'acctdelask':ui.delAsk=true;render();break;
  case 'acctdelno':ui.delAsk=false;render();break;
  case 'acctreauth':try{sessionStorage.setItem('apl-del-after','1');}catch(e){}auth.signOut();break;
  case 'acctdelyes':deleteAccount();break;
  case 'delask':ui.confirmDel=true;render();break;
  case 'delno':ui.confirmDel=false;render();break;
  case 'ijoin':joinInvite(b.dataset.id);break;
  case 'ljoin':busy(joinByLink);break;
  case 'lskip':setPendingJoin(null);render();break;
  case 'lnew':busy(regenLink);break;
  case 'lcopy':{const el=document.getElementById('ilink');const v=el?el.value:'';(navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(()=>toast(t('Link copied.')),()=>{if(el){el.select();}toast(t('Select the link and copy it.'));});break;}
  case 'lshare':{const c=camps.find(x=>x.id===ui.cid);if(c&&navigator.share)navigator.share({title:t('Join {name}',{name:c.name}),text:t('Join my Arkham campaign “{name}”',{name:c.name}),url:joinLink(c)}).catch(()=>{});break;}
  case 'reverify':user.sendEmailVerification().then(()=>toast(t('Verification email sent.')),()=>toast(t('Couldn’t send it. Try again in a bit.')));break;
  case 'idecline':db.doc('invites/'+b.dataset.id).delete().then(()=>toast(t('Invite declined.')),()=>toast(t('Couldn’t do that.')));break;
  case 'icancel':db.doc('invites/'+b.dataset.id).delete().then(()=>toast(t('Invite cancelled.')),()=>toast(t('Couldn’t do that.')));break;
  case 'gm':{const c=camps.find(x=>x.id===ui.cid);if(!c)break;const u=b.dataset.u||null;db.doc('campaigns/'+c.id).update({gmUid:u}).then(()=>toast(u?t('{name} is now the GM.',{name:(c.names||{})[u]}):t('No GM for now.')),()=>toast(t('Couldn’t change the GM.')));break;}
  case 'kick':ui.kick=b.dataset.u;render();break;
  case 'kickno':ui.kick=null;render();break;
  case 'kickyes':{const c=camps.find(x=>x.id===ui.cid);ui.kick=null;if(c)memberOut(c,b.dataset.u).then(()=>toast(t('Removed from the campaign.')),()=>toast(t('Couldn’t remove them.')));render();break;}
  case 'leaveask':ui.confirmLeave=true;render();break;
  case 'leaveno':ui.confirmLeave=false;render();break;
  case 'leaveyes':{const c=camps.find(x=>x.id===ui.cid);ui.confirmLeave=false;ui.view='home';render();if(c)memberOut(c,user.uid).then(()=>toast(t('You left {name}.',{name:c.name})),()=>toast(t('Couldn’t leave. Try again.')));break;}
  case 'delyes':{const id=ui.cid;ui.view='home';ui.confirmDel=false;db.doc('campaigns/'+id).update({deleting:true}).catch(()=>{}).then(()=>Promise.all(outbox.filter(i=>i.cid===id).map(i=>db.doc('invites/'+i.id).delete()))).catch(()=>{}).then(()=>wipeCampaign(id)).then(()=>db.doc('campaigns/'+id).delete()).then(()=>toast(t('Campaign deleted.')),()=>toast(t('Couldn’t delete that.')));render();break;}
 }
});

// ---------- boot ----------
if(!cfgOk()){app.innerHTML='<p class="note" style="padding:24px 16px">'+t('Firebase isn’t set up for this page.')+'</p>';return;}
// A separate Firebase app name keeps these accounts apart from the main site's anonymous device sign-in.
// Sign in through this same site (arkhamrpg.web.app/__/auth/...) rather than firebaseapp.com.
// Browsers that block cross-site storage (Safari, newer Chrome) otherwise break the Google pop-up.
const cfg=Object.assign({},window.FIREBASE_CONFIG);
if(/\.web\.app$|\.firebaseapp\.com$/.test(location.hostname))cfg.authDomain=location.hostname;
fb=firebase.initializeApp(cfg,'beta');window.armAppCheck&&armAppCheck(fb);auth=fb.auth();db=fb.firestore();
try{if(new URLSearchParams(location.search).has('account'))ui.view='account';}catch(e){}
try{const st=new URLSearchParams(location.search).get('settings');if(st&&/^[A-Za-z0-9]{10,40}$/.test(st)){ui.view='camp';ui.cid=st;ui.waitCid=st;}}catch(e){}
try{const q=new URLSearchParams(location.search).get('join');const n=new URLSearchParams(location.search).get('n');
 if(q&&/^[A-Za-z0-9]+\.[a-z0-9]{10,40}$/.test(q)){const [cid,code]=q.split('.');setPendingJoin({cid,code,name:(n||'').slice(0,60)});}
 if(q)history.replaceState(null,'',location.pathname);
 if(!pendingJoin){const sj=JSON.parse(sessionStorage.getItem('apl-join')||'null');if(sj&&sj.cid&&sj.code)pendingJoin=sj;}}catch(e){}
// Contact links from pages without the form (help, privacy) come here with ?contact=1[&topic=…].
try{const sp=new URLSearchParams(location.search);if(sp.has('contact')){const tp=sp.get('topic')||'';history.replaceState(null,'',location.pathname);setTimeout(()=>window.openContact&&openContact(tp),300);}}catch(e){}
// "Start your own" from the sample party.
try{if(new URLSearchParams(location.search).has('try')){if(!hasLocal())LocalFB.create(t('My campaign'));location.replace('play.html?c='+LOCAL_CAMP);return;}}catch(e){}
// Came from "Save to an account" in a device-only campaign: remember it through sign-in, then copy it over.
try{if(new URLSearchParams(location.search).has('savelocal')){sessionStorage.setItem('apl-savelocal','1');history.replaceState(null,'',location.pathname);}wantSave=sessionStorage.getItem('apl-savelocal')==='1';}catch(e){}
if(wantSave)ui.mode='signup';
function maybeSaveLocal(){if(wantSave&&user&&profile&&watching&&ui.campsLoaded&&!ui.localBusy&&!banned&&hasLocal()){wantSave=false;try{sessionStorage.removeItem('apl-savelocal');}catch(e){}busy(migrateLocal);}}
auth.getRedirectResult().catch(e=>{ui.err=authErr(e);render();});
// Remember who was signed in and their campaigns, so a reload shows the page straight away.
const BC='apl-beta-cache';let bc=null,watching=false;
try{bc=JSON.parse(localStorage.getItem(BC)||'null');}catch(e){}
function saveBC(){try{if(user&&profile)localStorage.setItem(BC,JSON.stringify({uid:user.uid,email:user.email||'',profile,camps,adm:isAdm}));}catch(e){}}
if(bc&&bc.uid&&bc.profile){user={uid:bc.uid,email:bc.email,emailVerified:true,isAnonymous:false,providerData:[{providerId:'google.com'}],sendEmailVerification:async()=>{}};profile=bc.profile;camps=bc.camps||[];}
auth.onAuthStateChanged(u=>{
 if(profUnsub){profUnsub();profUnsub=null;}if(campUnsub){campUnsub();campUnsub=null;}if(inboxUnsub){inboxUnsub();inboxUnsub=null;}if(outUnsub){outUnsub();outUnsub=null;}outCid=null;inbox=[];outbox=[];
 const same=!!(u&&bc&&bc.uid===u.uid);
 user=u&&!u.isAnonymous?u:null;watching=false;
 if(!same){profile=undefined;camps=[];if(!ui.waitCid&&!(u&&ui.view==='account'))ui.view='home';}
 if(!user){try{localStorage.removeItem(BC);Object.keys(localStorage).filter(k=>k.startsWith('apl-memo-')).forEach(k=>localStorage.removeItem(k));}catch(e){}bc=null;}
 ui.err='';ui.busy=false;ui.campsLoaded=false;
 banned=false;isAdm=false;seenDone=false;
 if(user){const uid=user.uid;
  db.doc('bans/'+uid).get().then(s=>{banned=s.exists;render();}).catch(()=>{});
  db.doc('admins/'+uid).get().then(s=>{isAdm=s.exists;saveBC();render();}).catch(()=>{});
  try{if(sessionStorage.getItem('apl-del-after')){sessionStorage.removeItem('apl-del-after');ui.view='account';ui.delAsk=true;}}catch(e){}}
 if(user){profUnsub=db.doc('users/'+user.uid).onSnapshot(s=>{profile=s.exists?s.data():null;
  if(profile&&!seenDone&&!(profile.lastSeen>Date.now()-12*3600*1000)){seenDone=true;db.doc('users/'+user.uid).update({lastSeen:Date.now()}).catch(()=>{});saveTz();}if(profile&&!watching){watching=true;watchCampaigns();watchInbox();}saveBC();render();},e=>{(window.quotaHit&&quotaHit(e),console.warn(e));profile=null;render();});}
 render();
});
render();

/* Reorder campaign cards: press and hold a card (phones) or click and drag it (computers), then drop it where it
   should go. Cards only move within their own section. Other cards slide out of the way (FLIP animation). */
(function(){
 let st=null;
 const cards=g=>[...g.querySelectorAll(':scope > .camp[data-cid]')];
 const allIds=()=>[...document.querySelectorAll('.camps > .camp[data-cid]')].map(c=>c.dataset.cid);
 const reduce=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 // Move the placeholder, sliding every other card from its old spot to its new one.
 function flip(fn){
  const els=[...st.grid.children].filter(c=>c!==st.card),before=new Map(els.map(c=>[c,c.getBoundingClientRect()]));
  fn();
  if(reduce())return;
  els.forEach(c=>{const a=before.get(c),b=c.getBoundingClientRect();const dx=a.left-b.left,dy=a.top-b.top;if(!dx&&!dy)return;
   c.style.transition='none';c.style.transform='translate('+dx+'px,'+dy+'px)';c.getBoundingClientRect();
   c.style.transition='transform .22s cubic-bezier(.2,.7,.3,1)';c.style.transform='';c._moving=Date.now()+230;
   clearTimeout(c._ft);c._ft=setTimeout(()=>{c.style.transition='';},260);});
 }
 function begin(){
  if(!st||st.dragging)return;
  const r=st.card.getBoundingClientRect();
  st.dragging=true;ui.dragging=true;st.offX=st.x-r.left;st.offY=st.y-r.top;st.w=r.width;st.h=r.height;st.was=allIds().join();
  st.ph=document.createElement('div');st.ph.className='camp dragph';st.ph.style.height=r.height+'px';
  st.grid.insertBefore(st.ph,st.card);
  Object.assign(st.card.style,{width:r.width+'px',height:r.height+'px',left:r.left+'px',top:r.top+'px'});
  st.card.classList.add('dragging');document.body.classList.add('dragging-camp');
  try{navigator.vibrate&&navigator.vibrate(12);}catch(e){}
  try{localStorage.setItem('apl-drag-hint','1');}catch(e){}
  document.querySelectorAll('.draghint').forEach(h=>h.classList.add('gone'));
 }
 function move(x,y){
  const L=x-st.offX,T=y-st.offY;st.card.style.left=L+'px';st.card.style.top=T+'px';
  if(y<70)window.scrollBy(0,-14);else if(y>window.innerHeight-70)window.scrollBy(0,14);
  // the card under the middle of the one being dragged takes its place
  const cx=L+st.w/2,cy=T+st.h/2;
  const list=[...st.grid.children].filter(c=>c!==st.card&&(c.dataset.cid||c===st.ph));
  const now=Date.now(),over=list.find(c=>{if(c===st.ph||(c._moving&&c._moving>now))return false;const r=c.getBoundingClientRect();return cx>r.left&&cx<r.right&&cy>r.top&&cy<r.bottom;});
  if(!over)return;
  const ia=list.indexOf(st.ph),ib=list.indexOf(over);
  flip(()=>st.grid.insertBefore(st.ph,ib>ia?over.nextSibling:over));
 }
 function finish(){
  if(!st)return;clearTimeout(st.timer);const s=st;st=null;
  if(!s.dragging)return;
  const from=s.card.getBoundingClientRect(),to=s.ph.getBoundingClientRect();
  s.grid.insertBefore(s.card,s.ph);s.ph.remove();
  s.card.classList.remove('dragging');document.body.classList.remove('dragging-camp');
  ['width','height','left','top'].forEach(k=>s.card.style[k]='');
  if(!reduce()){ // glide into the gap
   s.card.style.transition='none';s.card.style.transform='translate('+(from.left-to.left)+'px,'+(from.top-to.top)+'px) scale(1.03)';s.card.getBoundingClientRect();
   s.card.style.transition='transform .2s cubic-bezier(.2,.7,.3,1)';s.card.style.transform='';setTimeout(()=>{s.card.style.transition='';},230);
  }
  const stop=e=>{e.preventDefault();e.stopPropagation();};window.addEventListener('click',stop,true);setTimeout(()=>window.removeEventListener('click',stop,true),400);
  ui.dragging=false;
  const ids=allIds();if(ids.join()!==s.was)saveMyOrder(ids);
  if(ui.renderAfterDrag){ui.renderAfterDrag=false;setTimeout(render,240);}
 }
 app.addEventListener('pointerdown',e=>{
  const card=e.target.closest('.camps > .camp[data-cid]');
  if(!card||e.button>0||e.target.closest('button,input,select,textarea'))return;
  if(cards(card.parentElement).length<2)return;
  st={card,grid:card.parentElement,id:e.pointerId,x:e.clientX,y:e.clientY,type:e.pointerType,dragging:false};
  if(e.pointerType!=='mouse'){card.classList.add('pressing');st.timer=setTimeout(()=>{card.classList.remove('pressing');begin();},380);}
 });
 window.addEventListener('pointermove',e=>{
  if(!st||e.pointerId!==st.id)return;
  if(!st.dragging){
   const d=Math.hypot(e.clientX-st.x,e.clientY-st.y);
   if(st.type==='mouse'){if(d<6)return;begin();}
   else{if(d>10){clearTimeout(st.timer);st.card.classList.remove('pressing');st=null;}return;}
  }
  e.preventDefault();move(e.clientX,e.clientY);
 });
 const up=()=>{if(st&&!st.dragging)st.card.classList.remove('pressing');finish();};
 window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
 // while a card is held, the finger moves the card instead of scrolling the page
 document.addEventListener('touchmove',e=>{if(st&&st.dragging)e.preventDefault();},{passive:false});
 app.addEventListener('contextmenu',e=>{if(st&&e.target.closest('.camps > .camp[data-cid]'))e.preventDefault();});
 app.addEventListener('dragstart',e=>{if(e.target.closest&&e.target.closest('.camps > .camp[data-cid]'))e.preventDefault();});
})();

})();
