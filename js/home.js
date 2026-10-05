/* Arkham Ledger — sign-in, My campaigns, invites and campaign Settings (members, roles, house rules). */
(function(){
'use strict';
const app=document.getElementById('app'),whoEl=document.getElementById('who'),toastEl=document.getElementById('toast');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastT;function toast(m){toastEl.textContent=m;toastEl.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>toastEl.hidden=true,3200);}
const MAX_OWNED=10;
// state
let fb=null,auth=null,db=null,user=null,profile=undefined,camps=[],campUnsub=null,profUnsub=null,inbox=[],outbox=[],inboxUnsub=null,outUnsub=null,outCid=null;
let banned=false,isAdm=false,seenDone=false;
const ui={importing:'',confirmImport:false,mode:'signin',err:'',busy:false,view:'home',cid:null,confirmDel:false,confirmLeave:false,kick:null,newOpen:false,clear:new Set()};

function cfgOk(){const c=window.FIREBASE_CONFIG;return c&&c.projectId&&!String(c.projectId).startsWith('PASTE')&&window.firebase;}

// ---------- rendering ----------
function render(){
 const a=document.activeElement,keep=a&&a.id&&app.contains(a)?{id:a.id,s:a.selectionStart,e:a.selectionEnd}:null;
 // keep whatever people have typed when the page redraws
 const vals={};app.querySelectorAll('input[id],textarea[id]').forEach(el=>{if(el.type!=='file')vals[el.id]=el.value;});
 if(!user){whoEl.innerHTML='';app.innerHTML=authView();}
 else if(profile===undefined){whoEl.innerHTML='';app.innerHTML='<p class="note" style="padding:24px 16px">Loading your account…</p>';}
 else if(!profile){whoEl.innerHTML=signOutHtml();app.innerHTML=usernameView();}
 else{const oc=ui.view==='camp'&&camps.find(x=>x.id===ui.cid);watchOutbox(oc&&oc.ownerUid===user.uid?oc.id:null);watchHouse(oc?oc.id:null);whoEl.innerHTML='<span class="nav">'+acctMenuHtml(profile.username,profile,{email:(auth&&auth.currentUser&&auth.currentUser.email)||user.email||'',admin:isAdm})+'</span>';app.innerHTML=banned?bannedView():ui.view==='camp'?campView():ui.view==='account'?accountView():ui.view==='new'?newView():ui.view==='invite'?inviteView():homeView();}
 Object.keys(vals).forEach(id=>{const el=document.getElementById(id);if(el&&app.contains(el)&&!ui.clear.has(id))el.value=vals[id];});ui.clear.clear();
 syncRename();
 // Keep the address in step with the page, so reloading a campaign's Settings stays there.
 if(user&&profile){const want=ui.view==='camp'&&ui.cid?'?settings='+encodeURIComponent(ui.cid):'';if(location.search!==want&&!/[?&]join=/.test(location.search)){try{history.replaceState(null,'',location.pathname+want);}catch(e){}}}
 if(keep){const el=document.getElementById(keep.id);if(el){el.focus();try{if(keep.s!=null)el.setSelectionRange(keep.s,keep.e);}catch(e){}}}
}
function bannedView(){return '<section class="sec auth"><h2>Account suspended</h2><p class="note" style="margin:0">This account has been suspended, so it can\u2019t create or change anything. If you think this is a mistake, email <a href="mailto:maniac78@gmail.com?subject=Arkham%20Ledger%20account">maniac78@gmail.com</a>.</p></section>';}
function provName(){const p=(auth&&auth.currentUser&&auth.currentUser.providerData[0])||{};return p.providerId==='google.com'?'Google':p.providerId==='password'?'Email and password':'—';}
function freshLogin(){const u=auth&&auth.currentUser;if(!u)return false;const t=Date.parse(u.metadata&&u.metadata.lastSignInTime||'');return !!t&&Date.now()-t<5*60*1000;}
function accountView(){
 const own=camps.filter(c=>c.ownerUid===user.uid),inn=camps.filter(c=>c.ownerUid!==user.uid);
 let h='<div class="row"><button class="btn sm" data-a="home">\u2190 My campaigns</button></div>';
 h+='<section class="sec"><h2>Your account</h2><div class="list">'+
  [['Username',profile.username],['Email',(auth.currentUser&&auth.currentUser.email)||user.email||'—'],['Signed in with',provName()]].map(([k,v])=>'<div class="item"><div class="grow"><span class="lbl">'+k+'</span><b>'+esc(v)+'</b></div></div>').join('')+'</div></section>';
 const curC=AVATAR_COLORS[profile.color]?profile.color:'slate';
 h+='<section class="sec"><div class="sec-head"><h2>Your icon</h2><span class="row" style="gap:8px;align-items:center"><span class="avbig">'+acctIcon(profile.username,profile)+'</span><b>'+esc(profile.username)+'</b></span></div>'+
  '<div class="field"><span class="lbl">Photo</span><div class="row" style="gap:8px;align-items:center"><label class="btn sm" for="avphoto" style="cursor:pointer">'+(profile.photo?'Change photo':'Upload a photo')+'</label><input type="file" id="avphoto" accept="image/*" hidden>'+(profile.photo?'<button class="btn sm" data-a="avphotodel">Remove photo</button>':'')+'</div><span class="note">'+(profile.photo?'Your photo is showing. Remove it to use your first letter on a colour instead.':'Or show your first letter on the colour you pick below.')+'</span></div>'+
  '<div class="field"><span class="lbl">Colour</span><div class="swatches">'+Object.keys(AVATAR_COLORS).map(k=>'<button class="swatch'+(k===curC?' on':'')+'" data-a="avc" data-v="'+k+'" style="background:'+AVATAR_COLORS[k]+'" aria-label="'+k+'" aria-pressed="'+(k===curC)+'"></button>').join('')+'</div></div>'+'</section>';
 h+='<section class="sec"><h2>Delete my account</h2>';
 if(ui.delBusy)return h+'<p class="note" style="margin:0">Deleting your account\u2026 keep this page open.</p></section>';
 h+='<p class="note" style="margin:0">This removes your username and sign-in for good.'+(own.length?' Campaigns you own are deleted for everyone: <b>'+own.map(c=>esc(c.name)).join(', ')+'</b>.':'')+(inn.length?' You\u2019ll leave '+inn.map(c=>'<b>'+esc(c.name)+'</b>').join(', ')+'; investigators you played there stay with those campaigns.':'')+' This can\u2019t be undone.</p>';
 if(!ui.delAsk)h+='<div class="row"><button class="btn dng" data-a="acctdelask">Delete my account\u2026</button></div>';
 else if(!freshLogin())h+='<p class="note" style="margin:0">For your security, sign in again first. You\u2019ll come straight back here.</p><div class="row"><button class="btn pri" data-a="acctreauth">Sign in again</button><button class="btn" data-a="acctdelno">Cancel</button></div>';
 else h+='<div class="row"><button class="btn dng" data-a="acctdelyes">Yes, delete everything</button><button class="btn" data-a="acctdelno">Cancel</button></div>';
 return h+'</section>';
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
  const b=db.batch();if(profile&&profile.usernameLower)b.delete(db.doc('usernames/'+profile.usernameLower));b.delete(db.doc('users/'+uid));await b.commit();
  try{Object.keys(localStorage).filter(k=>/^apl-(beta-cache|memo-|cache-v1-|creator-v1)/.test(k)).forEach(k=>localStorage.removeItem(k));}catch(e){}
  try{await u.delete();}catch(e){await auth.signOut().catch(()=>{});}
  ui.delBusy=false;ui.delAsk=false;ui.view='home';toast('Your account was deleted.');
 }catch(e){console.warn(e);ui.delBusy=false;if(window.quotaHit&&quotaHit(e))return render();toast('Couldn\u2019t finish deleting. Try again.');render();}
}
const signOutHtml=()=>'<button class="nav-l" data-a="signout">Sign out</button>';
const errHtml=()=>ui.err?'<p class="err" role="alert">'+esc(ui.err)+'</p>':'';
function field(id,label,type,extra){return '<label class="field wide"><span class="lbl">'+label+'</span><input class="f" id="'+id+'" type="'+type+'" '+(extra||'')+'></label>';}

function introHtml(){
 const step=(n,t,d)=>'<li><span class="stepn">'+n+'</span><span><b>'+t+'</b><span class="note">'+d+'</span></span></li>';
 const inv=(typeof pendingJoin!=='undefined'&&pendingJoin)?'<p class="invited">You\u2019ve been invited to join <b>'+esc(pendingJoin.name||'a campaign')+'</b>. Sign in or create an account and you\u2019ll be asked to join.</p>':'';
 return '<section class="intro">'+inv+'<h2>Live character sheets for the Arkham Horror Roleplaying Game</h2>'+
  '<p>Everyone\u2019s investigator stays in sync at the table: spend a die, take an injury or earn XP and the whole group sees it. The GM gets scenes, enemies, clues and session recaps.</p>'+
  '<ol class="steps">'+step(1,'Sign in','With Google or an email and password.')+step(2,'Start a campaign or join one','Start your own and invite your group, or open an invite link a friend sent you.')+step(3,'Build your investigator','Step by step, following the corebook\u2019s character creation.')+'</ol>'+
  '<p class="note">Free, no ads. A fan project, not affiliated with Fantasy Flight Games. <a href="help.html">How it works</a></p></section>';
}
function authView(){
 const up=ui.mode==='signup',reset=ui.mode==='reset';
 let h='<section class="sec auth"><h2>'+(reset?'Reset your password':up?'Create an account':'Sign in')+'</h2>';
 if(!reset)h+='<button class="btn gbtn" data-a="google" '+(ui.busy?'disabled':'')+'><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z"/></svg>Continue with Google</button><div class="or">or with email</div>';
 h+='<form id="authform" style="display:flex;flex-direction:column;gap:10px" novalidate>'+field('em','Email','email','autocomplete="email" required')+
  (reset?'':field('pw','Password','password','autocomplete="'+(up?'new-password':'current-password')+'" minlength="6" required'))+
  (up?field('pw2','Confirm password','password','autocomplete="new-password" required'):'')+errHtml()+
  '<button class="btn pri wide" type="submit" '+(ui.busy?'disabled':'')+'>'+(reset?'Send reset email':up?'Create account':'Sign in')+'</button></form>';
 h+='<div class="row" style="justify-content:space-between">'+(reset?'<button class="btn sm" data-a="mode" data-m="signin">Back to sign in</button>':
  (up?'<span class="note">Already have an account?</span><button class="btn sm" data-a="mode" data-m="signin">Sign in</button>':'<button class="btn sm" data-a="mode" data-m="reset">Forgot password?</button><button class="btn sm" data-a="mode" data-m="signup">Create an account</button>'))+'</div>';
 h+='<p class="note" style="margin:0;font-size:11px;text-align:center">Protected by reCAPTCHA. Google\u2019s <a href="https://policies.google.com/privacy" rel="noopener">Privacy Policy</a> and <a href="https://policies.google.com/terms" rel="noopener">Terms</a> apply. See our <a href="privacy.html">privacy policy</a>.</p>';
 h+='</section>';
 return '<div class="welcome">'+introHtml()+h+'</div>';
}
function usernameView(){
 return '<section class="sec auth"><h2>Pick a username</h2><p class="note" style="margin:0">It\u2019s the name other players see in your campaigns. 3–20 letters, numbers or underscores. Your email is never shown to other players.</p>'+
  '<form id="unform" style="display:flex;flex-direction:column;gap:10px" novalidate>'+field('un','Username','text','autocomplete="username" maxlength="20" autocapitalize="off" spellcheck="false" required')+errHtml()+
  '<button class="btn pri wide" type="submit" '+(ui.busy?'disabled':'')+'>Save username</button></form></section>';
}
const MAX_MEMBERS=12;
function chipsFor(c,u){const r=(c.roles||{})[u];let h='';if(r==='owner')h+='<span class="chip ok">Owner</span>';if(c.gmUid&&c.gmUid===u)h+='<span class="chip warn">GM</span>';if(r!=='owner'&&c.gmUid!==u)h+='<span class="chip">Player</span>';return h;}
const photoOk=p=>typeof p==='string'&&/^data:image\/jpeg;base64,/.test(p);
// Shrink a chosen picture to a small JPEG (wide 16:9 crop) and save it on the campaign.
function campPhoto(f){const cid=ui.cid;openCropper(f,{title:'Position the campaign picture',shape:'wide',outW:800,outH:450,maxLen:140000,onError:toast,onSave:d=>db.doc('campaigns/'+cid).update({photo:d}).then(()=>toast('Picture saved.'),er=>{if(window.quotaHit&&quotaHit(er))return;toast('Couldn\u2019t save the picture. Try again.');})});}
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
  '<span class="invby">'+acctIcon(by.username,u||{})+'<span><b>'+esc(by.username||'Someone')+'</b> invited you to join</span></span>'+
  '<div class="row invbtns"><button class="btn pri" data-a="ijoin" data-id="'+esc(i.id)+'">Join campaign</button><button class="btn" data-a="idecline" data-id="'+esc(i.id)+'">Decline</button></div></div>';
}
function campCard(c){const n=(c.memberIds||[]).length;return '<div class="camp hasimg"><a class="campmain" href="'+ledgerUrl(c.id)+'">'+bannerHtml(c,c.photo)+(sessionShown(c.nextSession)?'<span class="cdbadge" title="'+esc(sessionWhen(c.nextSession))+'">Next session <b data-cd="'+c.nextSession+'">'+esc(sessionRel(c.nextSession))+'</b></span>':'')+'<h3>'+esc(c.name)+'</h3><span class="row" style="gap:6px">'+chipsFor(c,user.uid)+'<span class="note">'+n+' member'+(n===1?'':'s')+'</span></span></a><div class="row" style="justify-content:flex-end"><button class="btn sm" data-a="open" data-id="'+esc(c.id)+'">'+(c.ownerUid===user.uid?'Settings':'Members')+'</button></div></div>';}
const ledgerUrl=id=>'play.html?c='+encodeURIComponent(id);
function homeView(){
 const owned=camps.filter(c=>c.ownerUid===user.uid),member=camps.filter(c=>c.ownerUid!==user.uid);
 let h='';
 if(pendingJoin&&!camps.some(c=>c.id===pendingJoin.cid))h+='<section class="sec"><div class="sec-head"><h2>You\u2019re invited</h2></div><div class="camps"><div class="camp hasimg invcard">'+bannerHtml({id:pendingJoin.cid,name:pendingJoin.name||'?'},null)+'<h3>'+esc(pendingJoin.name||'A campaign')+'</h3><span class="note">You opened an invite link. Join to see the party and make your investigator.</span>'+errHtml()+'<div class="row invbtns"><button class="btn pri" data-a="ljoin" '+(ui.busy?'disabled':'')+'>Join campaign</button><button class="btn" data-a="lskip">Not now</button></div></div></div></section>';
 if(user.email&&!user.emailVerified&&!user.providerData.some(x=>x.providerId==='google.com'))h+='<section class="sec"><p class="note" style="margin:0">Verify your email to see invites sent to <b>'+esc(user.email)+'</b>. Check your inbox for the link, then reload. <button class="btn sm" data-a="reverify">Send it again</button></p></section>';
 if(inbox.length)h+='<section class="sec"><div class="sec-head"><h2>You\u2019re invited</h2></div><div class="camps">'+inbox.map(inviteCard).join('')+'</div></section>';
 h+='<section class="sec"><div class="sec-head"><h2>Campaigns you own</h2>'+(owned.length?'<span class="note">'+owned.length+' of '+MAX_OWNED+'</span>':'')+'</div>';
 const tile=owned.length<MAX_OWNED?'<button class="camp newtile" data-a="newopen"><span class="plus" aria-hidden="true">+</span><b>New campaign</b><span class="note">'+(owned.length?'Start another and invite your group.':'Start a campaign and invite your group.')+'</span></button>':'';
 h+='<div class="camps">'+owned.map(campCard).join('')+tile+'</div>'+(owned.length>=MAX_OWNED?'<p class="note" style="margin:0">You own '+MAX_OWNED+' campaigns, the most allowed. Delete one to start another.</p>':'');
 h+='</section><section class="sec"><div class="sec-head"><h2>Campaigns you’re in</h2></div>'+
  (member.length?'<div class="camps">'+member.map(campCard).join('')+'</div>':'<p class="note" style="margin:0">None yet. When a friend invites you, it’ll show up here.</p>')+'</section>';
 return h;
}
function newView(){
 const nm=((document.getElementById('cname')||{}).value||'').trim(),gm=ui.newGM||'me';
 let h='<div class="row"><button class="btn sm" data-a="home">\u2190 My campaigns</button></div>';
 h+='<form id="newform" class="sec newcamp" novalidate><h2>New campaign</h2>'+
  '<div class="newgrid"><div class="newfields">'+
  '<label class="field"><span class="lbl">Campaign name</span><input class="f" id="cname" maxlength="60" placeholder="e.g. The Dunwich Legacy" required autocomplete="off"></label>'+
  '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lbl" style="padding:0">Who will run the game?</legend>'+
   '<label class="optrow"><input type="radio" name="ngm" value="me"'+(gm==='me'?' checked':'')+'><span><b>I\u2019ll be the GM</b><br><span class="note">You get the GM tab: scenes, enemies, clues and XP.</span></span></label>'+
   '<label class="optrow"><input type="radio" name="ngm" value="later"'+(gm==='later'?' checked':'')+'><span><b>Someone else</b><br><span class="note">Pick them in Settings once they\u2019ve joined.</span></span></label></fieldset>'+
  '<div class="field"><span class="lbl">Picture (optional)</span><div class="row" style="gap:8px;align-items:center"><label class="btn sm" for="nphoto" style="cursor:pointer">'+(ui.newPhoto?'Change picture':'Add a picture')+'</label><input type="file" id="nphoto" accept="image/*" hidden>'+(ui.newPhoto?'<button class="btn sm" type="button" data-a="nphotodel">Remove</button>':'')+'</div></div>'+
  '</div><div class="newprev"><span class="lbl">Preview</span><div class="camp hasimg" aria-hidden="true">'+bannerHtml({id:ui.newId||'new',name:nm||'Your campaign'},ui.newPhoto)+'<h3 id="nprevname">'+esc(nm||'Your campaign')+'</h3><span class="row" style="gap:6px"><span class="chip ok">Owner</span><span class="note">1 member</span></span></div></div></div>'+
  errHtml()+'<div class="row"><button class="btn pri" type="submit" '+(ui.busy?'disabled':'')+'>Create campaign</button><button class="btn" type="button" data-a="home">Cancel</button></div></form>';
 return h;
}
function inviteView(){
 const c=camps.find(x=>x.id===ui.cid);if(!c)return '<p class="note" style="padding:24px 0">Setting up your campaign\u2026</p>';
 if(ui.waitCid===c.id)ui.waitCid=null;
 const link=c.joinCode?joinLink(c):'';
 return '<section class="sec newcamp"><h2>\u201c'+esc(c.name)+'\u201d is ready</h2><p class="note" style="margin:0">Now invite your players. Send them this link; they sign in and they\u2019re in.</p>'+
  (link?'<div class="row"><input class="f" id="ilink" readonly value="'+esc(link)+'" style="flex:1;min-width:220px" aria-label="Invite link"><button class="btn pri" data-a="lcopy">Copy link</button>'+(navigator.share?'<button class="btn" data-a="lshare">Share\u2026</button>':'')+'</div>':'<p class="note" style="margin:0">Making your invite link\u2026</p>')+
  '<p class="note" style="margin:0">Invites by email, the GM and house rules are in the campaign\u2019s Settings.</p>'+
  '<div class="row"><a class="btn pri" href="'+ledgerUrl(c.id)+'">Open the ledger \u2192</a><button class="btn" data-a="open" data-id="'+esc(c.id)+'">Settings</button><button class="btn" data-a="home">My campaigns</button></div></section>';
}
// Next session: the owner or GM sets a date, time and place; everyone sees it with a countdown and can add it to their calendar.
function pad2(n){return String(n).padStart(2,'0');}
function localInput(t){const d=new Date(t);return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+'T'+pad2(d.getHours())+':'+pad2(d.getMinutes());}
function nextSessionHtml(c,can){
 const t=c.nextSession,on=sessionShown(t);
 let h='<section class="sec"><div class="sec-head"><h2>Next session</h2>'+(on?'<span class="chip ok cdchip" data-cd="'+t+'">'+esc(sessionRel(t))+'</span>':'')+'</div>';
 if(on)h+='<p style="margin:0"><b>'+esc(sessionWhen(t))+'</b>'+(c.nextWhere?' \u00b7 '+esc(c.nextWhere):'')+'</p><div class="row"><a class="btn sm" href="'+sessionIcs(c.name,t,c.nextWhere)+'" download="'+esc((c.name||'session').replace(/[^\w -]+/g,''))+'.ics">Add to calendar</a>'+(mapsHref(c.nextWhere)?'<a class="btn sm" href="'+esc(mapsHref(c.nextWhere))+'" target="_blank" rel="noopener">Directions</a>':'')+'</div>';
 else if(!can)h+='<p class="note" style="margin:0">Nothing scheduled yet. The owner or GM can set it.</p>';
 if(can)h+='<form id="nsform" class="row" style="align-items:flex-end" novalidate><label class="field"><span class="lbl">Date and time</span><input class="f" type="datetime-local" id="nsdate" value="'+(on?localInput(t):'')+'"></label>'+
  '<label class="field" style="flex:1;min-width:180px"><span class="lbl">Where (optional)</span><input class="f" id="nswhere" maxlength="80" data-place autocomplete="off" placeholder="e.g. Dan\u2019s place, or Discord" value="'+esc(on?c.nextWhere||'':'')+'"></label>'+
  '<button class="btn pri" type="submit">'+(on?'Update':'Set')+'</button>'+(on?'<button class="btn" type="button" data-a="nsclear">Clear</button>':'')+'</form>'+
  '<p class="note" style="margin:0">Shows a countdown on the campaign\u2019s card and in the ledger for everyone. Times are in each person\u2019s own time zone.</p>';
 return h+'</section>';
}
function campView(){
 const c=camps.find(x=>x.id===ui.cid);if(!c){if(ui.waitCid===ui.cid)return '<p class="note" style="padding:24px 0">Opening the campaign\u2026</p>';ui.view='home';return homeView();}
 if(ui.waitCid===c.id)ui.waitCid=null;
 const own=c.ownerUid===user.uid,names=c.names||{};
 let h='<div class="row"><button class="btn sm" data-a="home">\u2190 My campaigns</button><a class="btn sm pri" href="'+ledgerUrl(c.id)+'">Open the ledger \u2192</a></div>';
 h+='<section class="sec"><div class="sec-head"><h2>'+(own?'Campaign settings':esc(c.name))+'</h2><span class="row" style="gap:6px">'+chipsFor(c,user.uid)+'</span></div>';
 if(own)h+='<form id="renform" class="row" style="align-items:flex-end" novalidate><label class="field" style="flex:1;min-width:220px"><span class="lbl">Campaign name</span><input class="f" id="rname" maxlength="60" value="'+esc(c.name)+'" data-orig="'+esc(c.name)+'"></label><button class="btn" type="submit" id="renbtn" disabled>Rename</button></form><label class="optrow"><input type="checkbox" data-ownedit'+(c.ownerEdits===true?' checked':'')+'><span><b>Let me edit every investigator</b><br><span class="note">Change any investigator and delete Recent entries. Untick to play by the same rules as everyone else. You can still choose who plays each investigator.</span></span></label>'+
  '<div class="field"><span class="lbl">Campaign picture</span><div class="row" style="align-items:center;gap:12px">'+(photoOk(c.photo)?'<img class="setimg" src="'+c.photo+'" alt="Campaign picture">':'<span class="setimg empty" aria-hidden="true"></span>')+'<label class="btn sm" for="cphoto" style="cursor:pointer">'+(photoOk(c.photo)?'Change picture':'Add a picture')+'</label><input type="file" id="cphoto" accept="image/*" hidden>'+(photoOk(c.photo)?'<button class="btn sm" data-a="cphotodel">Remove</button>':'')+'</div><span class="note">Shows on the campaign\u2019s card and next to its name in the ledger.</span></div>';
 else if(photoOk(c.photo))h+='<img class="setimg wide" src="'+c.photo+'" alt="">';
 h+='</section>';
 if(own)h+=nextSessionHtml(c,true);
 // members
 h+='<section class="sec"><div class="sec-head"><h2>Members</h2><span class="note">'+(c.memberIds||[]).length+' of '+MAX_MEMBERS+'</span></div><div class="list">'+(c.memberIds||[]).map(u=>{
  const nm=names[u]||'Unknown';let act='';
  if(own){act+=c.gmUid===u?'<button class="btn sm" data-a="gm" data-u="">Remove GM</button>':'<button class="btn sm" data-a="gm" data-u="'+esc(u)+'">Make GM</button>';
   if(u!==c.ownerUid)act+=ui.kick===u?'<span class="note">Remove '+esc(nm)+'?</span><button class="btn sm dng" data-a="kickyes" data-u="'+esc(u)+'">Remove</button><button class="btn sm" data-a="kickno">Cancel</button>':'<button class="btn sm" data-a="kick" data-u="'+esc(u)+'">Remove</button>';}
  return '<div class="item" style="flex-wrap:wrap"><div class="grow"><b>'+esc(nm)+'</b>'+(u===user.uid?' <span class="note">(you)</span>':'')+'</div><span class="row" style="gap:6px">'+chipsFor(c,u)+act+'</span></div>';}).join('')+'</div>';
 if(own)h+='<p class="note" style="margin:0">The GM runs the GM tools. You can make yourself the GM, or hand it to a player.</p>';
 h+='</section>';
 h+=houseHtml(c,own);
 if(own){
  const link=joinLink(c);
  h+='<section class="sec"><div class="sec-head"><h2>Invite players</h2><span class="note">'+(c.memberIds||[]).length+' of '+MAX_MEMBERS+' spots used</span></div>';
  h+='<div><span class="lbl">Invite link</span>'+(link?'<div class="row"><input class="f" id="ilink" readonly value="'+esc(link)+'" style="flex:1;min-width:220px" aria-label="Invite link"><button class="btn pri" data-a="lcopy">Copy link</button>'+(navigator.share?'<button class="btn" data-a="lshare">Share…</button>':'')+'</div><p class="note" style="margin:6px 0 0">Anyone with this link can join after signing in. Share it in your group chat.</p><div class="row" style="margin-top:8px;align-items:center"><button class="btn sm" data-a="lnew">Make a new link</button><span class="note">The current link will stop working.</span></div>'
   :'<div class="row"><button class="btn pri" data-a="lnew">Create invite link</button></div>')+'</div>';
  h+='<form id="invform" class="row" style="align-items:flex-end" novalidate><label class="field" style="flex:1;min-width:220px"><span class="lbl">Or invite by email</span><input class="f" id="iemail" type="email" autocapitalize="off" spellcheck="false" placeholder="friend@example.com"></label><button class="btn" type="submit" '+(ui.busy?'disabled':'')+'>Add invite</button></form>'+errHtml()+
   '<p class="note" style="margin:0">They\u2019ll see the invite on their My campaigns page when they sign in with this email address. The site doesn\u2019t send an email, so tell them you\u2019ve invited them.</p>';
  if(outbox.length)h+='<div><span class="lbl">Waiting to join</span><div class="list">'+outbox.map(i=>'<div class="item"><div class="grow"><b>'+esc(i.toEmail)+'</b><span class="effect">Invited</span></div><button class="btn sm" data-a="icancel" data-id="'+esc(i.id)+'">Cancel invite</button></div>').join('')+'</div></div>';
  h+='</section>';
  h+='<section class="sec"><div class="sec-head"><h2>Delete campaign</h2></div>'+(ui.confirmDel?'<p class="note" style="margin:0">Delete “'+esc(c.name)+'” for everyone? This can’t be undone.</p><div class="row"><button class="btn dng" data-a="delyes">Yes, delete it</button><button class="btn" data-a="delno">Cancel</button></div>':'<div class="row"><button class="btn dng" data-a="delask">Delete this campaign…</button></div>')+'</section>';
 }else{
  h+='<section class="sec"><div class="sec-head"><h2>Leave campaign</h2></div>'+(ui.confirmLeave?'<p class="note" style="margin:0">Leave “'+esc(c.name)+'”? You’ll need a new invite to come back.</p><div class="row"><button class="btn dng" data-a="leaveyes">Yes, leave</button><button class="btn" data-a="leaveno">Cancel</button></div>':'<div class="row"><button class="btn" data-a="leaveask">Leave this campaign…</button></div>')+'</section>';
 }
 return h;
}

// ---------- auth ----------
const AUTH_MSG={'auth/invalid-email':'That email address doesn’t look right.','auth/missing-password':'Enter your password.','auth/weak-password':'Use at least 6 characters for your password.',
 'auth/email-already-in-use':'There’s already an account with that email. Sign in instead.','auth/invalid-credential':'Wrong email or password.','auth/wrong-password':'Wrong email or password.','auth/user-not-found':'Wrong email or password.',
 'auth/too-many-requests':'Too many tries. Wait a minute and try again.','auth/popup-closed-by-user':'','auth/cancelled-popup-request':'','auth/network-request-failed':'Can’t reach the server. Check your connection.',
 'auth/unauthorized-domain':'This web address isn’t allowed to sign in yet (Firebase → Authentication → Settings → Authorized domains).','auth/operation-not-allowed':'That sign-in method isn’t turned on in Firebase yet.'};
const authErr=e=>{const c=e&&e.code;return c in AUTH_MSG?AUTH_MSG[c]:'Something went wrong ('+(c||'unknown')+'). Try again.';};
async function busy(fn){ui.busy=true;ui.err='';render();try{await fn();}catch(e){(window.quotaHit&&quotaHit(e),console.warn(e));ui.err=e&&e.code&&String(e.code).startsWith('auth/')?authErr(e):(e&&e.msg)||('Couldn’t do that ('+((e&&e.code)||'error')+'). Try again.');}ui.busy=false;render();}
async function google(){const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
 try{await auth.signInWithPopup(p);}catch(e){if(e&&(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'))await auth.signInWithRedirect(p);else throw e;}}
async function emailSubmit(){
 const v=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
 const em=v('em'),pw=document.getElementById('pw')?document.getElementById('pw').value:'';
 if(!em)throw {msg:'Enter your email.'};
 if(ui.mode==='reset'){await auth.sendPasswordResetEmail(em);ui.mode='signin';toast('If that email has an account, a reset link is on its way.');return;}
 if(!pw)throw {msg:'Enter your password.'};
 if(ui.mode==='signup'){if(pw!==document.getElementById('pw2').value)throw {msg:'The passwords don’t match.'};const cred=await auth.createUserWithEmailAndPassword(em,pw);try{await cred.user.sendEmailVerification();}catch(e){}}
 else await auth.signInWithEmailAndPassword(em,pw);
}

// ---------- username ----------
async function saveUsername(){
 const raw=(document.getElementById('un')||{}).value||'';const name=raw.trim();
 if(!/^[A-Za-z0-9_]{3,20}$/.test(name))throw {msg:'Use 3–20 letters, numbers or underscores.'};
 const lower=name.toLowerCase();const uref=db.doc('usernames/'+lower);
 await db.runTransaction(async t=>{const s=await t.get(uref);if(s.exists&&s.data().uid!==user.uid)throw {msg:'That username is taken. Try another.'};
  t.set(uref,{uid:user.uid});t.set(db.doc('users/'+user.uid),{username:name,usernameLower:lower,created:firebase.firestore.FieldValue.serverTimestamp()});});
 toast('Welcome, '+name+'.');
}

// ---------- campaigns ----------
function watchCampaigns(){if(campUnsub)campUnsub();
 campUnsub=db.collection('campaigns').where('memberIds','array-contains',user.uid).onSnapshot(qs=>{camps=[];qs.forEach(d=>camps.push({...d.data(),id:d.id}));camps.sort((a,b)=>String(a.name).localeCompare(String(b.name)));saveBC();render();},e=>{(window.quotaHit&&quotaHit(e),console.warn(e));toast('Couldn’t load your campaigns.');});}
async function createCampaign(){
 const name=((document.getElementById('cname')||{}).value||'').trim();
 if(!name)throw {msg:'Give the campaign a name.'};
 if(camps.filter(c=>c.ownerUid===user.uid).length>=MAX_OWNED)throw {msg:'You can own up to '+MAX_OWNED+' campaigns.'};
 const ref=ui.newId?db.collection('campaigns').doc(ui.newId):db.collection('campaigns').doc();
 await ref.set({name:name.slice(0,60),ownerUid:user.uid,memberIds:[user.uid],roles:{[user.uid]:'owner'},names:{[user.uid]:profile.username},created:firebase.firestore.FieldValue.serverTimestamp()});
 // the rules take these one at a time after the campaign exists
 await ref.update({joinCode:newCode()}).catch(()=>{});
 if((ui.newGM||'me')==='me')await ref.update({gmUid:user.uid}).catch(()=>{});
 if(ui.newPhoto)await ref.update({photo:ui.newPhoto}).catch(()=>toast('The picture didn\u2019t save; add it again in Settings.'));
 ui.newPhoto=null;ui.newGM=null;ui.newId=null;ui.view='invite';ui.cid=ref.id;ui.waitCid=ref.id;window.scrollTo(0,0);
}

// ---------- invites & members ----------
const FV=()=>firebase.firestore.FieldValue;
const myEmail=()=>String((user&&user.email)||'').toLowerCase();
function watchInbox(){if(inboxUnsub)inboxUnsub();inbox=[];if(!myEmail())return;
 inboxUnsub=db.collection('invites').where('toEmail','==',myEmail()).onSnapshot(qs=>{inbox=[];qs.forEach(d=>inbox.push({...d.data(),id:d.id}));render();},e=>(window.quotaHit&&quotaHit(e),console.warn(e)));}
// ---------- house rules (stored per campaign) ----------
let hr=null,hrCid=null,hrUnsub=null,hrT=null,hrErr='';
const UA={id:'universalAmmo',n:'Universal ammo',note:'Reloads are shared: any gun can use any gun’s extra reloads.'};
const GEAR_CATS=['Protection','Useful items','Tools and personal','Outdoors','Transport'];
// Ready-made house rules the owner can switch on one by one.
const clean=t=>String(t||'').replace(/^House rule\.\s*/,'');
const rid=()=>Math.random().toString(36).slice(2,9);
// Last-seen house rules and pending invites per campaign, so Settings doesn't flash empty on reload.
const memo=(k,v)=>{try{if(v===undefined)return JSON.parse(localStorage.getItem('apl-memo-'+k)||'null');localStorage.setItem('apl-memo-'+k,JSON.stringify(v));}catch(e){return null;}};
function watchHouse(cid){if(hrCid===cid)return;if(hrUnsub){hrUnsub();hrUnsub=null;}hr=null;hrErr='';hrCid=cid;if(!cid)return;
 hr=memo('hr-'+cid)||null;
 hrUnsub=db.doc('campaigns/'+cid+'/settings/house').onSnapshot(sn=>{if(hrT||ui.hedit)return;const d=sn.exists?sn.data():{};hr={on:!!d.on,weapons:(d.weapons||[]).map(w=>({id:w.id||rid(),...w})),gear:(d.gear||[]).map(g=>({id:g.id||rid(),...g})),rules:d.rules||[],hidden:d.hidden||[]};memo('hr-'+cid,hr);render();},e=>{(window.quotaHit&&quotaHit(e),console.warn(e));hrErr=(e&&e.code)||'error';render();});}
function saveHouse(){clearTimeout(hrT);hrT=setTimeout(()=>{hrT=null;const cid=hrCid;if(!cid||!hr)return;
 memo('hr-'+cid,hr);db.doc('campaigns/'+cid+'/settings/house').set({on:!!hr.on,weapons:hr.weapons,gear:hr.gear,rules:hr.rules,hidden:hr.hidden||[]},{merge:true}).catch(e=>{(window.quotaHit&&quotaHit(e),console.warn(e));toast('Couldn’t save the house rules.');});},350);}
function descOf(kind,x){
 if(kind==='weapon')return [x.s,x.d!==''&&x.d!=null?'damage '+x.d:'',x.i&&x.i!=='–'?'injury '+x.i:'',x.r?'range '+x.r:'',x.a?x.a+' shots':'',x.fr?'free reloads':'',x.c?'$'+x.c:'costs nothing'].filter(Boolean).join(', ')+'.'+(clean(x.sp)&&clean(x.sp)!=='Free reloads.'?' '+clean(x.sp):'');
 if(kind==='gear')return (x.cat?x.cat+', ':'')+(x.c?'$'+x.c:'costs nothing')+'.'+(clean(x.note)?' '+clean(x.note):'');
 return clean(x.note)||'';}
function presets(){const o=window.HOUSE_RULES||{};
 return [{kind:'rule',item:UA,name:UA.n,desc:'Reloads are shared: any gun can use any other gun’s extra reloads, instead of each gun keeping its own.'}]
  .concat((o.weapons||[]).map(w=>({kind:'weapon',item:w,name:w.n,desc:'Weapon: '+descOf('weapon',w)})))
  .concat((o.gear||[]).map(g=>({kind:'gear',item:g,name:g.n,desc:'Equipment: '+descOf('gear',g)})));}
function shownPresets(){const hd=(hr&&hr.hidden)||[];return presets().map((p,i)=>({...p,i})).filter(p=>!hd.includes(p.name));}
// Suggestions the owner removed outright (an edited suggestion lives on as their own rule).
function goneOnly(){const have=[...hr.weapons,...hr.gear].map(x=>x.n);return ((hr&&hr.hidden)||[]).filter(n=>!have.includes(n));}
function presetOn(p){return p.kind==='rule'?hr.rules.some(r=>r.id===p.item.id):(p.kind==='weapon'?hr.weapons:hr.gear).some(x=>x.n===p.item.n);}
function setPreset(p,on){if(p.kind==='rule'){hr.rules=hr.rules.filter(r=>r.id!==p.item.id);if(on)hr.rules.push(p.item);}
 else{const k=p.kind==='weapon'?'weapons':'gear';hr[k]=hr[k].filter(x=>x.n!==p.item.n);if(on)hr[k].push({id:rid(),...p.item});}saveHouse();render();}
const LIST={weapon:'weapons',gear:'gear',rule:'rules'},KIND_LABEL={weapon:'Weapon',gear:'Equipment',rule:'Rule'};
// The owner's own house rules: weapons/equipment not in the presets, plus custom rule text.
function customs(){const pn=shownPresets().map(p=>p.name);
 return [...hr.rules.filter(r=>r.custom).map(x=>({kind:'rule',x})),...hr.weapons.filter(w=>!pn.includes(w.n)).map(x=>({kind:'weapon',x})),...hr.gear.filter(g=>!pn.includes(g.n)).map(x=>({kind:'gear',x}))];}
function houseHtml(c,own){
 if(!hr)return '<section class="sec"><div class="sec-head"><h2>House rules</h2></div><p class="note" style="margin:0">'+(hrErr?'Couldn’t load the house rules ('+esc(hrErr)+'). Reload the page; if it keeps happening, the latest database rules may not be published yet.':'Loading…')+'</p></section>';
 const ps=shownPresets(),cs=customs(),nHidden=goneOnly().length;
 let h='<section class="sec"><div class="sec-head"><h2>House rules</h2>'+(own?'<label class="row note" style="gap:6px"><input type="checkbox" id="hr-on" data-hr="on"'+(hr.on?' checked':'')+'> Turned on</label>':'<span class="chip'+(hr.on?' ok':'')+'">'+(hr.on?'On':'Off')+'</span>')+'</div>';
 if(!own){const rows=[...ps.filter(presetOn).map(p=>[p.name,p.desc]),...cs.filter(c=>!c.x.off&&c.x.n).map(c=>[c.x.n,(c.kind==='rule'?'':KIND_LABEL[c.kind]+': ')+descOf(c.kind,c.x)])];
  return h+(rows.length?'<div class="list">'+rows.map(([n,d])=>'<div class="item"><div class="grow"><b>'+esc(n)+'</b>'+(d?'<span class="effect">'+esc(d)+'</span>':'')+'</div></div>').join('')+'</div>':'<p class="note" style="margin:0">None.</p>')+'</section>';}
 h+='<p class="note" style="margin:0">Tick the house rules your group uses. You can write your own too. While house rules are turned on, ticked ones apply to everyone in this campaign.</p>';
 const row=(id,checked,data,name,desc,extra)=>'<div class="item" style="gap:10px;align-items:flex-start;flex-wrap:wrap"><input type="checkbox" id="'+id+'" '+data+(checked?' checked':'')+' style="margin-top:4px" aria-label="Use '+esc(name||'this rule')+'"><label class="grow" for="'+id+'" style="cursor:pointer"><b>'+esc(name||'(no name yet)')+'</b><span class="effect">'+esc(desc)+'</span></label>'+(extra||'')+'</div>';
 let list=ps.map(p=>row('hp-'+p.i,presetOn(p),'data-hp="'+p.i+'"',p.name,p.desc,'<span class="row" style="gap:6px">'+(p.kind==='rule'?'':'<button class="btn sm" data-a="hpedit" data-i="'+p.i+'">Edit</button>')+'<button class="btn sm" data-a="hphide" data-i="'+p.i+'">Remove</button></span>'));
 const inp=(x,k,ph,type,w)=>'<label class="field"'+(w?' style="'+w+'"':'')+'><span class="lbl">'+ph+'</span><input class="f" id="hx-'+x.id+'-'+k+'" data-hx="'+x.id+'" data-k="'+k+'" type="'+(type||'text')+'" value="'+esc(x[k]==null?'':x[k])+'"'+(type==='number'?' min="0" step="any"':'')+'></label>';
 cs.forEach(({kind,x})=>{
  const editing=ui.hedit===x.id;
  const btns='<span class="row" style="gap:6px">'+(editing?'':'<button class="btn sm" data-a="hedit" data-id="'+esc(x.id)+'">Edit</button>')+'<button class="btn sm" data-a="hdel" data-id="'+esc(x.id)+'" data-kind="'+kind+'">Remove</button></span>';
  let form='';
  if(editing){
   form='<div style="flex-basis:100%;display:flex;flex-direction:column;gap:8px;padding-left:26px"><div class="wgrid">';
   if(kind==='rule')form+=inp(x,'n','Name')+inp(x,'note','What it does','text','grid-column:1/-1');
   if(kind==='weapon')form+=inp(x,'n','Name')+'<label class="field"><span class="lbl">Skill</span><select class="f" id="hx-'+x.id+'-s" data-hx="'+x.id+'" data-k="s">'+['Ranged Combat','Melee Combat'].map(o=>'<option'+(x.s===o?' selected':'')+'>'+o+'</option>').join('')+'</select></label>'+
    inp(x,'d','Damage')+inp(x,'i','Injury rating')+inp(x,'r','Range')+inp(x,'a','Ammo','number')+inp(x,'c','Price $','number')+inp(x,'rc','Reload price $','number')+inp(x,'sp','Special rules')+
    '<label class="row note" style="gap:6px;align-self:end"><input type="checkbox" id="hx-'+x.id+'-fr" data-hx="'+x.id+'" data-k="fr"'+(x.fr?' checked':'')+'> Free reloads</label>';
   if(kind==='gear')form+='<label class="field"><span class="lbl">Category</span><select class="f" id="hx-'+x.id+'-cat" data-hx="'+x.id+'" data-k="cat">'+GEAR_CATS.map(o=>'<option'+(x.cat===o?' selected':'')+'>'+o+'</option>').join('')+'</select></label>'+inp(x,'n','Name')+inp(x,'c','Price $','number')+inp(x,'note','What it does','text','grid-column:1/-1');
   form+='</div><div class="row"><button class="btn sm pri" data-a="hdone">Done</button></div></div>';
  }
  list.push(row('hc-'+x.id,!x.off,'data-hc="'+esc(x.id)+'" data-kind="'+kind+'"',x.n,(kind==='rule'?'':KIND_LABEL[kind]+': ')+descOf(kind,x),btns+form));
 });
 h+='<div class="list">'+list.join('')+'</div>';
 h+='<div class="row"><span class="note">Write your own:</span><button class="btn sm" data-a="hnew" data-kind="rule">+ Rule</button><button class="btn sm" data-a="hnew" data-kind="weapon">+ Weapon</button><button class="btn sm" data-a="hnew" data-kind="gear">+ Equipment</button></div>';
 if(nHidden)h+='<p class="note" style="margin:0">'+nHidden+' suggested rule'+(nHidden>1?'s':'')+' removed. <button class="btn sm" data-a="hprestore">Bring '+(nHidden>1?'them':'it')+' back</button></p>';
 return h+'</section>';
}
const NUMK=['a','c','rc'];
function findCustom(id){for(const k of ['rules','weapons','gear']){const it=hr[k].find(x=>x.id===id);if(it)return it;}return null;}
function houseChange(el){if(!hr)return false;
 if(el.dataset.hr==='on'){hr.on=el.checked;saveHouse();return true;}
 if(el.dataset.hp!=null){const p=presets()[Number(el.dataset.hp)];if(p)setPreset(p,el.checked);return true;}
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
 if(!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(em)||em.length>120)throw {msg:'That email address doesn’t look right.'};
 if(em===myEmail())throw {msg:'That’s your own email.'};
 if(outbox.some(i=>i.toEmail===em))throw {msg:'There’s already an invite waiting for '+em+'.'};
 if((c.memberIds||[]).length+outbox.length>=MAX_MEMBERS)throw {msg:'A campaign can have up to '+MAX_MEMBERS+' members, counting invites.'};
 await db.doc('invites/'+c.id+'_'+em).set({cid:c.id,campaignName:c.name,fromUid:user.uid,fromName:profile.username,toEmail:em,created:FV().serverTimestamp(),...(photoOk(c.photo)?{photo:c.photo}:{})});
 ui.clear.add('iemail');toast('Invite saved for '+em+'. Let them know to sign in with that email.');
}
async function joinByLink(){
 const j=pendingJoin;if(!j)return;
 const b=db.batch();
 b.set(db.doc('joinreq/'+j.cid+'_'+user.uid),{cid:j.cid,code:j.code});
 b.update(db.doc('campaigns/'+j.cid),{memberIds:FV().arrayUnion(user.uid),['roles.'+user.uid]:'player',['names.'+user.uid]:profile.username});
 try{await b.commit();}catch(e){(window.quotaHit&&quotaHit(e),console.warn(e));throw {msg:e&&e.code==='not-found'?'That campaign no longer exists.':'This invite link doesn’t work anymore. Ask for a new one.'};}
 setPendingJoin(null);location.href=ledgerUrl(j.cid);return;toast('You joined '+(j.name||'the campaign')+'.');
}
let pendingJoin=null;
function setPendingJoin(v){pendingJoin=v;try{v?sessionStorage.setItem('apl-join',JSON.stringify(v)):sessionStorage.removeItem('apl-join');}catch(e){}}
async function joinInvite(id){
 const inv=inbox.find(x=>x.id===id);if(!inv)return;
 const b=db.batch();
 b.update(db.doc('campaigns/'+inv.cid),{memberIds:FV().arrayUnion(user.uid),['roles.'+user.uid]:'player',['names.'+user.uid]:profile.username});
 b.delete(db.doc('invites/'+id));
 try{await b.commit();toast('You joined '+inv.campaignName+'.');}
 catch(e){(window.quotaHit&&quotaHit(e),console.warn(e));if(e&&e.code==='not-found'){await db.doc('invites/'+id).delete().catch(()=>{});toast('That campaign no longer exists.');}else toast('Couldn’t join. Try again.');}
}
// Firestore doesn't delete a campaign's contents with it, so clear each part first.
async function wipeCampaign(id){
 for(const col of ['characters','players','table','campaign','enemies','clues','gm','gmlog','history','settings']){
  try{const qs=await db.collection('campaigns/'+id+'/'+col).get();await Promise.all(qs.docs.map(d=>d.ref.delete()));}catch(e){console.warn('wipe',col,e);}
 }
}
async function regenLink(){const c=camps.find(x=>x.id===ui.cid);if(!c)return;await db.doc('campaigns/'+c.id).update({joinCode:newCode()});toast(c.joinCode?'New link made. The old one no longer works.':'Invite link ready.');}
function memberOut(c,u){const p={memberIds:FV().arrayRemove(u),['roles.'+u]:FV().delete(),['names.'+u]:FV().delete()};if(c.gmUid===u)p.gmUid=null;return db.doc('campaigns/'+c.id).update(p);}

// ---------- events ----------
app.addEventListener('submit',e=>{e.preventDefault();const id=e.target.id;
 if(id==='authform')busy(emailSubmit);
 else if(id==='unform')busy(saveUsername);
 else if(id==='newform')busy(createCampaign);
 else if(id==='nsform')busy(async()=>{const v=(document.getElementById('nsdate')||{}).value,w=((document.getElementById('nswhere')||{}).value||'').trim().slice(0,80);const t=v?new Date(v).getTime():NaN;
  if(!Number.isFinite(t))throw {msg:'Pick a date and time.'};if(t<Date.now()-3600000)throw {msg:'That time has already passed.'};
  await db.doc('campaigns/'+ui.cid).update({nextSession:t,nextWhere:w});toast('Next session set for '+sessionWhen(t)+'.');});
 else if(id==='invform')busy(sendInvite);
 else if(id==='renform')busy(async()=>{const n=document.getElementById('rname').value.trim();if(!n)throw {msg:'Give the campaign a name.'};await db.doc('campaigns/'+ui.cid).update({name:n.slice(0,60)});const c0=camps.find(x=>x.id===ui.cid);if(c0)c0.name=n.slice(0,60);toast('Renamed.');});
});
// Rename is only clickable when the name has actually been changed.
function syncRename(){const i=document.getElementById('rname'),b=document.getElementById('renbtn');if(i&&b){const v=i.value.trim();b.disabled=ui.busy||!v||v===i.dataset.orig;}}
app.addEventListener('input',e=>{if(e.target.id==='rname')syncRename();if(e.target.id==='cname'){if(ui.err){ui.err='';const er=app.querySelector('.err');if(er)er.remove();}const p=document.getElementById('nprevname');if(p)p.textContent=e.target.value.trim()||'Your campaign';}});
app.addEventListener('change',e=>{const t=e.target;if(t.id==='avphoto'){const f=t.files&&t.files[0];t.value='';openCropper(f,{title:'Position your photo',shape:'circle',outW:160,outH:160,maxLen:18000,onError:toast,onSave:d=>{profile={...profile,photo:d};render();db.doc('users/'+user.uid).update({photo:d}).then(()=>toast('Photo saved.'),er=>{if(window.quotaHit&&quotaHit(er))return;toast('Couldn\u2019t save the photo. Try again.');});}});return;}if(t.id==='nphoto'){const f=t.files&&t.files[0];t.value='';openCropper(f,{title:'Position the campaign picture',shape:'wide',outW:800,outH:450,maxLen:140000,onError:toast,onSave:d=>{ui.newPhoto=d;render();}});return;}if(t.name==='ngm'){ui.newGM=t.value;return;}if(t.id==='cphoto'){campPhoto(t.files&&t.files[0]);t.value='';return;}if(t.hasAttribute('data-ownedit')){const on=t.checked;db.doc('campaigns/'+ui.cid).update({ownerEdits:on}).then(()=>toast(on?'You can edit every investigator again.':'Other players\u2019 investigators are locked to them now.')).catch(er=>{if(window.quotaHit&&quotaHit(er))return;t.checked=!on;toast('Couldn\u2019t save that. Try again.');});return;}houseChange(t);});
window.addEventListener('acct-signout',()=>auth&&auth.signOut());
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;const a=b.dataset.a;if(a==='account')e.preventDefault();
 switch(a){
  case 'google':busy(google);break;
  case 'mode':ui.mode=b.dataset.m;ui.err='';render();break;
  case 'signout':auth.signOut();break;
  case 'newopen':ui.view='new';ui.newId=db.collection('campaigns').doc().id;ui.err='';ui.newPhoto=null;ui.newGM=null;ui.clear.add('cname');render();window.scrollTo(0,0);{const i=document.getElementById('cname');if(i)i.focus();}break;
  case 'nphotodel':ui.newPhoto=null;render();break;
  case 'newclose':ui.newOpen=false;ui.err='';render();break;
  case 'open':ui.view='camp';ui.cid=b.dataset.id;ui.confirmDel=false;ui.confirmLeave=false;ui.kick=null;ui.err='';render();window.scrollTo(0,0);break;
  case 'home':ui.view='home';ui.err='';render();break;
  case 'hnew':if(hr){const k=b.dataset.kind,id=rid();const base=k==='rule'?{id,n:'',note:'',custom:true}:k==='weapon'?{id,n:'',s:'Ranged Combat',d:'',i:'',r:'',a:0,c:0,rc:0,fr:false,sp:''}:{id,cat:'Useful items',n:'',c:0,note:''};hr[LIST[k]].push(base);ui.hedit=id;saveHouse();render();const f=document.getElementById('hx-'+id+'-n');if(f)f.focus();}break;
  case 'hphide':if(hr){const p=presets()[Number(b.dataset.i)];if(p){hr.hidden=[...(hr.hidden||[]).filter(n=>n!==p.name),p.name];setPreset(p,false);}}break;
  case 'hpedit':if(hr){const p=presets()[Number(b.dataset.i)];if(!p||p.kind==='rule')break;const k=LIST[p.kind];let it=hr[k].find(x=>x.n===p.name);if(!it){it={id:rid(),...JSON.parse(JSON.stringify(p.item)),off:true};hr[k].push(it);}hr.hidden=[...(hr.hidden||[]).filter(n=>n!==p.name),p.name];ui.hedit=it.id;saveHouse();render();}break;
  case 'cphotodel':db.doc('campaigns/'+ui.cid).update({photo:FV().delete()}).then(()=>toast('Picture removed.')).catch(er=>{if(window.quotaHit&&quotaHit(er))return;toast('Couldn\u2019t remove it. Try again.');});break;
  case 'hprestore':if(hr){const g=goneOnly();hr.hidden=(hr.hidden||[]).filter(n=>!g.includes(n));saveHouse();render();}break;
  case 'hedit':ui.hedit=b.dataset.id;render();break;
  case 'hdone':ui.hedit=null;render();break;
  case 'hdel':if(hr){const k=LIST[b.dataset.kind];hr[k]=hr[k].filter(x=>x.id!==b.dataset.id);if(ui.hedit===b.dataset.id)ui.hedit=null;saveHouse();render();}break;
  case 'nsclear':db.doc('campaigns/'+ui.cid).update({nextSession:FV().delete(),nextWhere:FV().delete()}).then(()=>toast('Next session cleared.'),er=>{if(window.quotaHit&&quotaHit(er))return;toast('Couldn\u2019t clear it. Try again.');});break;
  case 'avphotodel':profile={...profile,photo:''};render();db.doc('users/'+user.uid).update({photo:FV().delete()}).catch(er=>{if(window.quotaHit&&quotaHit(er))return;toast('Couldn\u2019t remove it. Try again.');});break;
  case 'avc':{const k='color',v=b.dataset.v;profile={...profile,[k]:v};render();db.doc('users/'+user.uid).update({[k]:v}).catch(er=>{if(window.quotaHit&&quotaHit(er))return;toast('Couldn\u2019t save that. Try again.');});break;}
  case 'account':ui.view='account';ui.delAsk=false;render();window.scrollTo(0,0);break;
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
  case 'lcopy':{const el=document.getElementById('ilink');const v=el?el.value:'';(navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(()=>toast('Link copied.'),()=>{if(el){el.select();}toast('Select the link and copy it.');});break;}
  case 'lshare':{const c=camps.find(x=>x.id===ui.cid);if(c&&navigator.share)navigator.share({title:'Join '+c.name,text:'Join my Arkham campaign “'+c.name+'”',url:joinLink(c)}).catch(()=>{});break;}
  case 'reverify':user.sendEmailVerification().then(()=>toast('Verification email sent.'),()=>toast('Couldn’t send it. Try again in a bit.'));break;
  case 'idecline':db.doc('invites/'+b.dataset.id).delete().then(()=>toast('Invite declined.'),()=>toast('Couldn\u2019t do that.'));break;
  case 'icancel':db.doc('invites/'+b.dataset.id).delete().then(()=>toast('Invite cancelled.'),()=>toast('Couldn\u2019t do that.'));break;
  case 'gm':{const c=camps.find(x=>x.id===ui.cid);if(!c)break;const u=b.dataset.u||null;db.doc('campaigns/'+c.id).update({gmUid:u}).then(()=>toast(u?(c.names||{})[u]+' is now the GM.':'No GM for now.'),()=>toast('Couldn\u2019t change the GM.'));break;}
  case 'kick':ui.kick=b.dataset.u;render();break;
  case 'kickno':ui.kick=null;render();break;
  case 'kickyes':{const c=camps.find(x=>x.id===ui.cid);ui.kick=null;if(c)memberOut(c,b.dataset.u).then(()=>toast('Removed from the campaign.'),()=>toast('Couldn\u2019t remove them.'));render();break;}
  case 'leaveask':ui.confirmLeave=true;render();break;
  case 'leaveno':ui.confirmLeave=false;render();break;
  case 'leaveyes':{const c=camps.find(x=>x.id===ui.cid);ui.confirmLeave=false;ui.view='home';render();if(c)memberOut(c,user.uid).then(()=>toast('You left '+c.name+'.'),()=>toast('Couldn\u2019t leave. Try again.'));break;}
  case 'delyes':{const id=ui.cid;ui.view='home';ui.confirmDel=false;db.doc('campaigns/'+id).update({deleting:true}).catch(()=>{}).then(()=>Promise.all(outbox.filter(i=>i.cid===id).map(i=>db.doc('invites/'+i.id).delete()))).catch(()=>{}).then(()=>wipeCampaign(id)).then(()=>db.doc('campaigns/'+id).delete()).then(()=>toast('Campaign deleted.'),()=>toast('Couldn’t delete that.'));render();break;}
 }
});

// ---------- boot ----------
if(!cfgOk()){app.innerHTML='<p class="note" style="padding:24px 16px">Firebase isn’t set up for this page.</p>';return;}
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
 ui.err='';ui.busy=false;
 banned=false;isAdm=false;seenDone=false;
 if(user){const uid=user.uid;
  db.doc('bans/'+uid).get().then(s=>{banned=s.exists;render();}).catch(()=>{});
  db.doc('admins/'+uid).get().then(s=>{isAdm=s.exists;saveBC();render();}).catch(()=>{});
  try{if(sessionStorage.getItem('apl-del-after')){sessionStorage.removeItem('apl-del-after');ui.view='account';ui.delAsk=true;}}catch(e){}}
 if(user){profUnsub=db.doc('users/'+user.uid).onSnapshot(s=>{profile=s.exists?s.data():null;
  if(profile&&!seenDone&&!(profile.lastSeen>Date.now()-12*3600*1000)){seenDone=true;db.doc('users/'+user.uid).update({lastSeen:Date.now()}).catch(()=>{});}if(profile&&!watching){watching=true;watchCampaigns();watchInbox();}saveBC();render();},e=>{(window.quotaHit&&quotaHit(e),console.warn(e));profile=null;render();});}
 render();
});
render();
})();
