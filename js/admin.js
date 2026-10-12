/* Arkham Horror RPG Ledger — site admin page: every user and campaign, bans, username resets and campaign deletion.
   Only accounts with an admins/{uid} document (made by hand in the Firebase console) can use it;
   the database rules enforce that, not just this page. */
(function(){
'use strict';
const app=document.getElementById('app'),whoEl=document.getElementById('who'),toastEl=document.getElementById('toast');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastT;function toast(m){toastEl.textContent=m;toastEl.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>toastEl.hidden=true,3200);}
const DAY=86400000;
let auth=null,db=null,me=null,authKnown=false,state='loading',users=[],camps=[],bans={},errs=[],fbs=[],loadedAt=0;
const ui={tab:'users',q:'',ask:null,rename:null,busy:false,sort:'new'};
try{const s=localStorage.getItem('apl-adm-sort');if(s)ui.sort=s;}catch(e){}

// ---------- helpers ----------
const ms=v=>v==null?0:typeof v==='number'?v:v.toMillis?v.toMillis():v.seconds?v.seconds*1000:0;
const ago=x=>{if(!x)return '—';const d=Math.floor((Date.now()-x)/DAY);return d<=0&&new Date(x).toDateString()===new Date().toDateString()?t('today {time}',{time:new Date(x).toLocaleTimeString(I18N.locale, {hour:'numeric',minute:'2-digit'})}):d<=1?t('Yesterday'):d<30?tn('{n} day ago','{n} days ago',d):new Date(x).toLocaleDateString(I18N.locale, {year:'numeric',month:'short',day:'numeric'});};
const nameOf=uid=>{const u=users.find(x=>x.id===uid);return u?u.username:t('(deleted account)');};
const photoOk=p=>window.imgOk(p);
const FV=()=>firebase.firestore.FieldValue;

// ---------- data ----------
async function load(quiet){
 if(!quiet){state='loading';render();}
 try{
  const [us,cs,bs]=await Promise.all([db.collection('users').get(),db.collection('campaigns').get(),db.collection('bans').get()]);
  try{const fs2=await db.collection('feedback').orderBy('t','desc').limit(200).get();fbs=fs2.docs.map(d=>({id:d.id,...d.data()}));}catch(e){fbs=[];}
  try{const es=await db.collection('errors').orderBy('t','desc').limit(200).get();errs=es.docs.map(d=>({id:d.id,...d.data()}));}catch(e){errs=[];}
  users=us.docs.map(d=>({id:d.id,...d.data()}));camps=cs.docs.map(d=>({id:d.id,...d.data()}));bans={};bs.docs.forEach(d=>bans[d.id]=d.data());
  loadedAt=Date.now();state='ready';
 }catch(e){console.warn(e);state=window.quotaHit&&quotaHit(e)?'ready':'error';}
 render();
}
async function wipe(cid){
 await dropFolder('campaigns/'+cid);
 for(const col of ['characters','players','table','campaign','enemies','clues','gm','gmlog','history','settings','gallery']){
  const qs=await db.collection('campaigns/'+cid+'/'+col).get();await Promise.all(qs.docs.map(d=>d.ref.delete()));}
}
async function deleteCampaign(cid){
 const iv=await db.collection('invites').where('cid','==',cid).get();await Promise.all(iv.docs.map(d=>d.ref.delete()));
 await wipe(cid);await db.doc('campaigns/'+cid).delete();camps=camps.filter(c=>c.id!==cid);
}
// Delete someone's account for good. The server function (adminDeleteUser in functions/index.js) does the work,
// since only it can remove a sign-in; it checks that you're an admin.
async function deleteUser(uid){
 const tok=await auth.currentUser.getIdToken();
 const r=await fetch('https://us-central1-'+window.FIREBASE_CONFIG.projectId+'.cloudfunctions.net/adminDeleteUser',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({data:{uid}})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||j.error)throw {msg:(j.error&&j.error.message)||t('Couldn’t delete that account. Try again.')};
 users=users.filter(x=>x.id!==uid);await load(true);
}
// Ban: block all their changes (the rules check bans/{uid}) and take them out of campaigns they've joined.
// Campaigns they own stay, so their players keep their sheets; the owner just can't change anything.
async function ban(uid){
 const u=users.find(x=>x.id===uid);
 await db.doc('bans/'+uid).set({at:Date.now(),by:me.uid,name:(u&&u.username)||''});
 for(const c of camps.filter(c=>c.ownerUid!==uid&&(c.memberIds||[]).includes(uid))){
  const p={memberIds:FV().arrayRemove(uid),['roles.'+uid]:FV().delete(),['names.'+uid]:FV().delete()};if(c.gmUid===uid)p.gmUid=null;
  await db.doc('campaigns/'+c.id).update(p);c.memberIds=(c.memberIds||[]).filter(x=>x!==uid);if(c.gmUid===uid)c.gmUid=null;
 }
 bans[uid]={at:Date.now()};
}
async function unban(uid){await db.doc('bans/'+uid).delete();delete bans[uid];}
async function renameUser(uid,name){
 const u=users.find(x=>x.id===uid);if(!u)return;
 if(!/^[A-Za-z0-9_]{3,20}$/.test(name))throw {msg:t('3–20 letters, numbers or underscores.')};
 const lower=name.toLowerCase();
 if(lower!==u.usernameLower){const tk0=await db.doc('usernames/'+lower).get();if(tk0.exists)throw {msg:t('That username is taken.')};}
 const b=db.batch();
 b.set(db.doc('usernames/'+lower),{uid});
 b.set(db.doc('users/'+uid),{username:name,usernameLower:lower},{merge:true});
 if(u.usernameLower&&u.usernameLower!==lower)b.delete(db.doc('usernames/'+u.usernameLower));
 await b.commit();
 // campaigns show members by name, so update it there too
 for(const c of camps.filter(c=>(c.memberIds||[]).includes(uid))){await db.doc('campaigns/'+c.id).update({['names.'+uid]:name}).catch(()=>{});(c.names=c.names||{})[uid]=name;}
 u.username=name;u.usernameLower=lower;
}

// ---------- rendering ----------
function render(){
 if(!authKnown){app.innerHTML='<p class="note" style="padding:24px 16px">'+t('Loading…')+'</p>';return;}
 if(!me){app.innerHTML='<section class="sec auth"><h2>'+t('Admin')+'</h2><p class="note" style="margin:0">'+t('Sign in on the {page} first.',{page:'<a href="./">'+t('main page')+'</a>'})+'</p></section>';return;}
 if(state==='denied'){app.innerHTML='<section class="sec auth"><h2>'+t('Admin')+'</h2><p class="note" style="margin:0">'+t('This page is only for the site’s admins.')+'</p><div class="row"><a class="btn" href="./">'+t('Back to the site')+'</a></div></section>';return;}
 if(state==='loading'){app.innerHTML='<p class="note" style="padding:24px 16px">'+t('Loading users and campaigns…')+'</p>';return;}
 if(state==='error'){app.innerHTML='<section class="sec"><h2>'+t('Couldn’t load')+'</h2><p class="note" style="margin:0">'+t('The database refused the request. If you just made yourself an admin, wait a minute for the new rules and try again.')+'</p><div class="row"><button class="btn" data-a="reload">'+t('Try again')+'</button></div></section>';return;}
 // Put the cursor back in a text box after redrawing; never refocus a dropdown (on iPhone that reopens its picker).
 const keep=document.activeElement&&document.activeElement.tagName==='INPUT'&&document.activeElement.id;
 const active=users.filter(u=>ms(u.lastSeen)>Date.now()-7*DAY).length;
 let h='<div class="stats">'+[[t('Users'),users.length],[t('Active this week'),active],[t('Campaigns'),camps.length],[t('Suspended'),Object.keys(bans).length]].map(([k,v])=>'<div class="stat"><span class="lbl">'+k+'</span><b>'+v+'</b></div>').join('')+'</div>';
 h+='<div class="row admbar" style="align-items:flex-end"><div class="tabs" role="tablist" style="flex:1">'+[['users',t('Users')],['camps',t('Campaigns')],['fb',t('Feedback')+(fbs.length?' ('+fbs.length+')':'')],['errs',t('Errors')+(errs.length?' ('+errs.length+')':'')]].map(([k,l])=>'<button class="tab" role="tab" aria-selected="'+(ui.tab===k)+'" data-a="tab" data-t="'+k+'">'+l+'</button>').join('')+'</div>'+
  '<label class="field admq" style="min-width:200px"><span class="lbl">'+t('Search')+'</span><input class="f" id="q" value="'+esc(ui.q)+'" placeholder="'+(ui.tab==='users'?t('Username'):ui.tab==='errs'||ui.tab==='fb'?t('Message, page or user'):t('Campaign or owner'))+'" autocomplete="off"></label>'+
  '<button class="btn sm" data-a="reload" title="'+esc(t('Loaded {time}',{time:new Date(loadedAt).toLocaleTimeString(I18N.locale)}))+'">'+t('Refresh')+'</button></div>';
 h+=ui.tab==='users'?usersHtml():ui.tab==='errs'?errsHtml():ui.tab==='fb'?fbHtml():campsHtml();
 app.innerHTML=h;
 if(keep){const el=document.getElementById(keep);if(el){el.focus();if(el.setSelectionRange){const n=el.value.length;el.setSelectionRange(n,n);}}}
}
// The row's "Actions" button and its menu (opening and closing is shared code in js/avatar.js).
// Delete goes last, set apart by a line, in red.
function actionsMenu(items,danger,label){return '<span class="placewrap admacts"><button type="button" class="btn sm" data-placemenu aria-haspopup="true" aria-expanded="false" aria-label="'+esc(label)+'">'+t('Actions')+'<span class="placecaret" aria-hidden="true">▾</span></button><span class="placemenu right admmenu" role="menu" hidden>'+items+(danger?(items?'<hr>':'')+danger:'')+'</span></span>';}
function usersHtml(){
 const q=ui.q.trim().toLowerCase();
 const nCamps=id=>camps.filter(c=>(c.memberIds||[]).includes(id)).length,byName=(a,b)=>String(a.username).localeCompare(b.username);
 const S={new:(a,b)=>ms(b.created)-ms(a.created)||byName(a,b),seen:(a,b)=>ms(b.lastSeen)-ms(a.lastSeen)||byName(a,b),name:byName,camps:(a,b)=>nCamps(b.id)-nCamps(a.id)||byName(a,b)};
 const list=users.filter(u=>!q||String(u.username||'').toLowerCase().includes(q)).sort(S[ui.sort]||S.new);
 const sortSel='<label class="row admsort" style="gap:8px;align-items:center"><span class="lbl">'+t('Sort by')+'</span><select class="f" id="usort" style="width:auto">'+[['new',t('Newest first')],['seen',t('Last seen')],['name',t('Name (A–Z)')],['camps',t('Most campaigns')]].map(([k,l])=>'<option value="'+k+'"'+(ui.sort===k?' selected':'')+'>'+l+'</option>').join('')+'</select></label>';
 if(!list.length)return sortSel+'<p class="note">'+t('No users match.')+'</p>';
 return sortSel+'<div class="list adm">'+list.map(u=>{
  const owns=camps.filter(c=>c.ownerUid===u.id).length,inn=camps.filter(c=>c.ownerUid!==u.id&&(c.memberIds||[]).includes(u.id)).length,b=bans[u.id],self=u.id===me.uid;
  let act='';
  if(ui.working&&ui.working.uid===u.id)act=workingHtml(ui.working);else
  if(ui.ask&&ui.ask.uid===u.id&&ui.ask.what==='ban')act='<span class="note">'+tn('Suspend {name}? They’ll be removed from {n} campaign they joined.','Suspend {name}? They’ll be removed from {n} campaigns they joined.',inn,{name:esc(u.username)})+'</span><button class="btn sm dng" data-a="banyes" data-u="'+esc(u.id)+'">'+t('Suspend')+'</button><button class="btn sm" data-a="no">'+t('Cancel')+'</button>';
  else if(ui.ask&&ui.ask.uid===u.id&&ui.ask.what==='del')act='<span class="note">'+t('Delete {name}’s account for good?',{name:esc(u.username)})+' '+t('Their sign-in, profile and username go.')+(owns?' '+tn('The {n} campaign they own goes too.','The {n} campaigns they own go too.',owns):'')+(inn?' '+tn('They’re taken out of {n} other campaign (their investigators stay).','They’re taken out of {n} other campaigns (their investigators stay).',inn):'')+' '+t('This can’t be undone.')+'</span><button class="btn sm dng" data-a="delyes" data-u="'+esc(u.id)+'">'+t('Delete account')+'</button><button class="btn sm" data-a="no">'+t('Cancel')+'</button>';
  else if(ui.rename===u.id)act='<form class="row" data-form="rename" data-u="'+esc(u.id)+'" style="gap:6px"><input class="f" id="rn-'+esc(u.id)+'" value="'+esc(u.username)+'" maxlength="20" style="width:160px" aria-label="'+t('New username')+'"><button class="btn sm pri" type="submit">'+t('Save')+'</button><button class="btn sm" type="button" data-a="no">'+t('Cancel')+'</button></form>';
  const id=esc(u.id),items=(self?'':b?'<button role="menuitem" data-a="unban" data-u="'+id+'">'+t('Unsuspend')+'</button>':'<button role="menuitem" data-a="ban" data-u="'+id+'">'+t('Suspend…')+'</button>')+
   '<button role="menuitem" data-a="rename" data-u="'+id+'">'+t('Change username')+'</button>',danger=self?'':'<button role="menuitem" class="dng" data-a="del" data-u="'+id+'">'+t('Delete account…')+'</button>';
  return '<div class="item"><div class="grow"><span class="row" style="gap:6px;align-items:center"><b>'+esc(u.username||t('(no username)'))+'</b>'+(self?'<span class="chip ok">'+t('You')+'</span>':'')+(b?'<span class="chip warn">'+t('Suspended')+'</span>':'')+'</span>'+
   '<span class="effect">'+t('Joined {when} · last seen {seen} · owns {owns} · in {inn}',{when:esc(ago(ms(u.created))),seen:esc(ago(ms(u.lastSeen))),owns,inn})+'</span></div>'+actionsMenu(items,danger,t('Actions for {name}',{name:u.username||t('this account')}))+(act?'<span class="row admact" style="gap:6px">'+act+'</span>':'')+'</div>';}).join('')+'</div>';
}
// Short browser name from the user agent, enough to spot a pattern.
function browserOf(ua){ua=String(ua||'');const os=/iPhone|iPad/.test(ua)?'iOS':/Android/.test(ua)?'Android':/Mac OS X/.test(ua)?'Mac':/Windows/.test(ua)?'Windows':/Linux/.test(ua)?'Linux':'';
 const br=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/CriOS|Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Browser';return (br==='Browser'?t('Browser'):br)+(os?' '+t('on {os}',{os}):'');}
function fbHtml(){
 const q=ui.q.trim().toLowerCase(),K={bug:t('Something’s broken'),idea:t('Idea'),other:t('Other')};
 const list=fbs.filter(f=>!q||[f.msg,f.page,nameOf(f.uid)].some(x=>String(x||'').toLowerCase().includes(q)));
 if(!list.length)return '<p class="note">'+(fbs.length?t('No feedback matches.'):t('No feedback yet.'))+'</p>';
 return '<div class="list adm">'+list.map(f=>'<div class="item"><div class="grow"><span class="row" style="gap:6px;align-items:center"><span class="chip'+(f.kind==='bug'?' warn':'')+'">'+esc(K[f.kind]||t('Other'))+'</span><b>'+esc(nameOf(f.uid))+'</b><span class="note">'+esc(ago(ms(f.t)))+'</span></span><p class="fbtext">'+esc(f.msg)+'</p><span class="effect">'+esc(f.page||'')+' · '+esc(browserOf(f.ua))+(f.v?' · '+esc(f.v):'')+'</span></div><button class="btn sm" data-a="fbdel" data-f="'+esc(f.id)+'">'+t('Done')+'</button></div>').join('')+'</div>';
}
function errsHtml(){
 const q=ui.q.trim().toLowerCase();
 const list=errs.filter(e=>!q||[e.msg,e.page,nameOf(e.uid)].some(x=>String(x||'').toLowerCase().includes(q)));
 let h='<div class="row" style="justify-content:space-between;align-items:center;gap:12px;flex-wrap:nowrap"><p class="note" style="margin:0;flex:1;min-width:0">'+t('Unexpected errors people hit on the site (newest first, up to 200). The same error from the same visit is only sent once.')+'</p>'+(errs.length?'<button class="btn sm" data-a="errclear" style="flex:none">'+t('Clear all')+'</button>':'')+'</div>';
 if(!list.length)return h+'<p class="note">'+(errs.length?t('No errors match.'):t('No errors reported.')+' \u{1F389}')+'</p>';
 return h+'<div class="list adm">'+list.map(e=>'<div class="item"><div class="grow"><b class="errmsg">'+esc(e.msg)+'</b><span class="effect">'+esc(ago(ms(e.t)))+' · '+esc(nameOf(e.uid))+' · '+esc(e.page||'')+' · '+esc(browserOf(e.ua))+(e.v?' · '+esc(e.v):'')+'</span>'+(e.stack?'<details><summary class="note">'+t('Details')+'</summary><pre class="errstack">'+esc(e.stack)+'</pre></details>':'')+'</div><button class="btn sm" data-a="errdel" data-e="'+esc(e.id)+'">'+t('Clear')+'</button></div>').join('')+'</div>';
}
function campsHtml(){
 const q=ui.q.trim().toLowerCase();
 const list=camps.filter(c=>!q||String(c.name||'').toLowerCase().includes(q)||String(nameOf(c.ownerUid)).toLowerCase().includes(q)).sort((a,b)=>ms(b.created)-ms(a.created));
 if(!list.length)return '<p class="note">'+t('No campaigns match.')+'</p>';
 return '<div class="list adm">'+list.map(c=>{
  const n=(c.memberIds||[]).length;
  const act=ui.working&&ui.working.cid===c.id?workingHtml(ui.working):ui.ask&&ui.ask.cid===c.id?'<span class="note">'+tn('Delete “{name}” for its {n} member? This can’t be undone.','Delete “{name}” for all {n} members? This can’t be undone.',n,{name:esc(c.name)})+'</span><button class="btn sm dng" data-a="cdelyes" data-c="'+esc(c.id)+'">'+t('Delete')+'</button><button class="btn sm" data-a="no">'+t('Cancel')+'</button>'
   :'';
  return '<div class="item">'+(photoOk(c.photo)?'<img class="admimg" src="'+c.photo+'" alt="">':'<span class="admimg" aria-hidden="true"></span>')+'<div class="grow"><b>'+esc(c.name)+'</b>'+(bans[c.ownerUid]?' <span class="chip warn">'+t('Owner suspended')+'</span>':'')+
   '<span class="effect">'+t('Owner {name}',{name:esc(nameOf(c.ownerUid))})+' · '+tn('{n} member','{n} members',n)+(c.gmUid?' · '+t('GM {name}',{name:esc(nameOf(c.gmUid))}):'')+' · '+t('made {when}',{when:esc(ago(ms(c.created)))})+'</span></div>'+actionsMenu('','<button role="menuitem" class="dng" data-a="cdel" data-c="'+esc(c.id)+'">'+t('Delete campaign…')+'</button>',t('Actions for {name}',{name:c.name}))+(act?'<span class="row admact" style="gap:6px">'+act+'</span>':'')+'</div>';}).join('')+'</div>';
}

// ---------- events ----------
// Runs an action. With "working", the row shows what's happening (with a spinner) until it's done.
async function run(fn,ok,working){if(ui.busy)return;ui.busy=true;if(working){ui.working=working;render();}try{await fn();ui.ask=null;ui.rename=null;if(ok)toast(ok);}catch(e){console.warn(e);if(!(window.quotaHit&&quotaHit(e)))toast(e&&e.msg?e.msg:t('That didn’t work. Try again.'));}ui.busy=false;ui.working=null;render();}
const workingHtml=w=>'<span class="working" role="status"><span class="spin" aria-hidden="true"></span>'+esc(w.label)+'</span>';
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;const a=b.dataset.a,u=b.dataset.u,c=b.dataset.c;
 if(a==='tab'){ui.tab=b.dataset.t;ui.ask=null;ui.rename=null;render();}
 else if(a==='reload')load();
 else if(a==='no'){ui.ask=null;ui.rename=null;render();}
 else if(a==='ban'){ui.ask={uid:u,what:'ban'};ui.rename=null;render();}
 else if(a==='del'){ui.ask={uid:u,what:'del'};ui.rename=null;render();}
 else if(a==='delyes')run(()=>deleteUser(u),t('Account deleted.'),{uid:u,label:t('Deleting the account… this can take up to a minute.')});
 else if(a==='banyes')run(()=>ban(u),t('Account suspended.'),{uid:u,label:t('Suspending…')});
 else if(a==='unban')run(()=>unban(u),t('Suspension lifted. They’ll need new invites to rejoin campaigns.'));
 else if(a==='rename'){ui.rename=u;ui.ask=null;render();const el=document.getElementById('rn-'+u);if(el){el.focus();el.select();}}
 else if(a==='fbdel'){const id=b.dataset.f;run(async()=>{await db.doc('feedback/'+id).delete();fbs=fbs.filter(x=>x.id!==id);},t('Marked as done.'));}
 else if(a==='errdel'){const id=b.dataset.e;run(async()=>{await db.doc('errors/'+id).delete();errs=errs.filter(x=>x.id!==id);});}
 else if(a==='errclear')run(async()=>{await Promise.all(errs.map(x=>db.doc('errors/'+x.id).delete().catch(()=>{})));errs=[];},t('Errors cleared.'));
 else if(a==='cdel'){ui.ask={cid:c};render();}
 else if(a==='cdelyes')run(()=>deleteCampaign(c),t('Campaign deleted.'),{cid:c,label:t('Deleting the campaign…')});
});
app.addEventListener('change',e=>{if(e.target.id==='usort'){ui.sort=e.target.value;try{localStorage.setItem('apl-adm-sort',ui.sort);}catch(er){}render();}});
app.addEventListener('input',e=>{if(e.target.id==='q'){ui.q=e.target.value;render();}});
app.addEventListener('submit',e=>{const f=e.target;if(f.dataset.form!=='rename')return;e.preventDefault();const u=f.dataset.u,el=document.getElementById('rn-'+u);run(()=>renameUser(u,el.value.trim()),t('Username changed.'));});

// ---------- boot ----------
const cfg0=window.FIREBASE_CONFIG;
if(!cfg0||!window.firebase){app.innerHTML='<p class="note" style="padding:24px 16px">'+t('Firebase isn’t set up for this page.')+'</p>';return;}
const cfg=Object.assign({},cfg0);if(/\.web\.app$|\.firebaseapp\.com$/.test(location.hostname))cfg.authDomain=location.hostname;
const fb=firebase.initializeApp(cfg,'beta');window.armAppCheck&&armAppCheck(fb);auth=fb.auth();db=fb.firestore();
auth.onAuthStateChanged(async u=>{
 authKnown=true;me=u&&!u.isAnonymous?u:null;
 if(!me){render();return;}
 try{const a=await db.doc('admins/'+me.uid).get();if(!a.exists){state='denied';render();return;}}catch(e){state='denied';render();return;}
 whoEl.innerHTML='<span class="nav"><a class="nav-l" href="./">'+t('‹ Back to the site')+'</a></span>';
 load();
});
render();
})();
