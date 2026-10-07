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
const ago=t=>{if(!t)return '—';const d=Math.floor((Date.now()-t)/DAY);return d<=0&&new Date(t).toDateString()===new Date().toDateString()?'today '+new Date(t).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):d<=0?'Yesterday':d===1?'Yesterday':d<30?d+' days ago':new Date(t).toLocaleDateString([], {year:'numeric',month:'short',day:'numeric'});};
const nameOf=uid=>{const u=users.find(x=>x.id===uid);return u?u.username:'(deleted account)';};
const photoOk=p=>window.imgOk(p);
const FV=()=>firebase.firestore.FieldValue;

// ---------- data ----------
async function load(){
 state='loading';render();
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
 for(const col of ['characters','players','table','campaign','enemies','clues','gm','gmlog','history','settings']){
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
 if(!r.ok||j.error)throw {msg:(j.error&&j.error.message)||'Couldn\u2019t delete that account. Try again.'};
 await load();
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
 if(!/^[A-Za-z0-9_]{3,20}$/.test(name))throw {msg:'3–20 letters, numbers or underscores.'};
 const lower=name.toLowerCase();
 if(lower!==u.usernameLower){const t=await db.doc('usernames/'+lower).get();if(t.exists)throw {msg:'That username is taken.'};}
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
 if(!authKnown){app.innerHTML='<p class="note" style="padding:24px 16px">Loading\u2026</p>';return;}
 if(!me){app.innerHTML='<section class="sec auth"><h2>Admin</h2><p class="note" style="margin:0">Sign in on the <a href="./">main page</a> first.</p></section>';return;}
 if(state==='denied'){app.innerHTML='<section class="sec auth"><h2>Admin</h2><p class="note" style="margin:0">This page is only for the site’s admins.</p><div class="row"><a class="btn" href="./">Back to the site</a></div></section>';return;}
 if(state==='loading'){app.innerHTML='<p class="note" style="padding:24px 16px">Loading users and campaigns…</p>';return;}
 if(state==='error'){app.innerHTML='<section class="sec"><h2>Couldn’t load</h2><p class="note" style="margin:0">The database refused the request. If you just made yourself an admin, wait a minute for the new rules and try again.</p><div class="row"><button class="btn" data-a="reload">Try again</button></div></section>';return;}
 const keep=document.activeElement&&document.activeElement.id;
 const active=users.filter(u=>ms(u.lastSeen)>Date.now()-7*DAY).length;
 let h='<div class="stats">'+[['Users',users.length],['Active this week',active],['Campaigns',camps.length],['Suspended',Object.keys(bans).length]].map(([k,v])=>'<div class="stat"><span class="lbl">'+k+'</span><b>'+v+'</b></div>').join('')+'</div>';
 h+='<div class="row admbar" style="align-items:flex-end"><div class="tabs" role="tablist" style="flex:1">'+[['users','Users'],['camps','Campaigns'],['fb','Feedback'+(fbs.length?' ('+fbs.length+')':'')],['errs','Errors'+(errs.length?' ('+errs.length+')':'')]].map(([k,l])=>'<button class="tab" role="tab" aria-selected="'+(ui.tab===k)+'" data-a="tab" data-t="'+k+'">'+l+'</button>').join('')+'</div>'+
  '<label class="field admq" style="min-width:200px"><span class="lbl">Search</span><input class="f" id="q" value="'+esc(ui.q)+'" placeholder="'+(ui.tab==='users'?'Username':ui.tab==='errs'||ui.tab==='fb'?'Message, page or user':'Campaign or owner')+'" autocomplete="off"></label>'+
  '<button class="btn sm" data-a="reload" title="Loaded '+esc(new Date(loadedAt).toLocaleTimeString())+'">Refresh</button></div>';
 h+=ui.tab==='users'?usersHtml():ui.tab==='errs'?errsHtml():ui.tab==='fb'?fbHtml():campsHtml();
 app.innerHTML=h;
 if(keep){const el=document.getElementById(keep);if(el){el.focus();if(el.setSelectionRange){const n=el.value.length;el.setSelectionRange(n,n);}}}
}
function usersHtml(){
 const q=ui.q.trim().toLowerCase();
 const nCamps=id=>camps.filter(c=>(c.memberIds||[]).includes(id)).length,byName=(a,b)=>String(a.username).localeCompare(b.username);
 const S={new:(a,b)=>ms(b.created)-ms(a.created)||byName(a,b),seen:(a,b)=>ms(b.lastSeen)-ms(a.lastSeen)||byName(a,b),name:byName,camps:(a,b)=>nCamps(b.id)-nCamps(a.id)||byName(a,b)};
 const list=users.filter(u=>!q||String(u.username||'').toLowerCase().includes(q)).sort(S[ui.sort]||S.new);
 const sortSel='<div class="row admsort" style="gap:8px;align-items:center"><span class="lbl">Sort</span>'+[['new','Newest'],['seen','Last seen'],['name','A\u2013Z'],['camps','Most campaigns']].map(([k,l])=>'<button class="btn sm'+(ui.sort===k?' on':'')+'" data-a="sort" data-s="'+k+'" aria-pressed="'+(ui.sort===k)+'">'+l+'</button>').join('')+'</div>';
 if(!list.length)return sortSel+'<p class="note">No users match.</p>';
 return sortSel+'<div class="list adm">'+list.map(u=>{
  const owns=camps.filter(c=>c.ownerUid===u.id).length,inn=camps.filter(c=>c.ownerUid!==u.id&&(c.memberIds||[]).includes(u.id)).length,b=bans[u.id],self=u.id===me.uid;
  let act='';
  if(ui.ask&&ui.ask.uid===u.id&&ui.ask.what==='ban')act='<span class="note">Suspend '+esc(u.username)+'? They’ll be removed from '+inn+' campaign'+(inn===1?'':'s')+' they joined.</span><button class="btn sm dng" data-a="banyes" data-u="'+esc(u.id)+'">Suspend</button><button class="btn sm" data-a="no">Cancel</button>';
  else if(ui.ask&&ui.ask.uid===u.id&&ui.ask.what==='del')act='<span class="note">Delete '+esc(u.username)+'\u2019s account for good? Their sign-in, profile and username go'+(owns?', along with the '+owns+' campaign'+(owns===1?'':'s')+' they own':'')+(inn?', and they\u2019re taken out of '+inn+' other'+(inn===1?'':'s')+' (their investigators stay)':'')+'. This can\u2019t be undone.</span><button class="btn sm dng" data-a="delyes" data-u="'+esc(u.id)+'">Delete account</button><button class="btn sm" data-a="no">Cancel</button>';
  else if(ui.rename===u.id)act='<form class="row" data-form="rename" data-u="'+esc(u.id)+'" style="gap:6px"><input class="f" id="rn-'+esc(u.id)+'" value="'+esc(u.username)+'" maxlength="20" style="width:160px" aria-label="New username"><button class="btn sm pri" type="submit">Save</button><button class="btn sm" type="button" data-a="no">Cancel</button></form>';
  else act=(self?'<span class="chip ok">You</span>':(b?'<button class="btn sm" data-a="unban" data-u="'+esc(u.id)+'">Unsuspend</button>':'<button class="btn sm" data-a="ban" data-u="'+esc(u.id)+'">Suspend</button>'))+'<button class="btn sm" data-a="rename" data-u="'+esc(u.id)+'">Change username</button>'+(self?'':'<button class="btn sm dng" data-a="del" data-u="'+esc(u.id)+'">Delete account\u2026</button>');
  return '<div class="item"><div class="grow"><b>'+esc(u.username||'(no username)')+'</b>'+(b?' <span class="chip warn">Suspended</span>':'')+
   '<span class="effect">Joined '+esc(ago(ms(u.created)))+' · last seen '+esc(ago(ms(u.lastSeen)))+' · owns '+owns+' · in '+inn+'</span></div><span class="row" style="gap:6px">'+act+'</span></div>';}).join('')+'</div>';
}
// Short browser name from the user agent, enough to spot a pattern.
function browserOf(ua){ua=String(ua||'');const os=/iPhone|iPad/.test(ua)?'iOS':/Android/.test(ua)?'Android':/Mac OS X/.test(ua)?'Mac':/Windows/.test(ua)?'Windows':/Linux/.test(ua)?'Linux':'';
 const br=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/CriOS|Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Browser';return br+(os?' on '+os:'');}
function fbHtml(){
 const q=ui.q.trim().toLowerCase(),K={bug:'Something\u2019s broken',idea:'Idea',other:'Other'};
 const list=fbs.filter(f=>!q||[f.msg,f.page,nameOf(f.uid)].some(x=>String(x||'').toLowerCase().includes(q)));
 if(!list.length)return '<p class="note">'+(fbs.length?'No feedback matches.':'No feedback yet.')+'</p>';
 return '<div class="list adm">'+list.map(f=>'<div class="item"><div class="grow"><span class="row" style="gap:6px;align-items:center"><span class="chip'+(f.kind==='bug'?' warn':'')+'">'+esc(K[f.kind]||'Other')+'</span><b>'+esc(nameOf(f.uid))+'</b><span class="note">'+esc(ago(ms(f.t)))+'</span></span><p class="fbtext">'+esc(f.msg)+'</p><span class="effect">'+esc(f.page||'')+' \u00b7 '+esc(browserOf(f.ua))+(f.v?' \u00b7 '+esc(f.v):'')+'</span></div><button class="btn sm" data-a="fbdel" data-f="'+esc(f.id)+'">Done</button></div>').join('')+'</div>';
}
function errsHtml(){
 const q=ui.q.trim().toLowerCase();
 const list=errs.filter(e=>!q||[e.msg,e.page,nameOf(e.uid)].some(x=>String(x||'').toLowerCase().includes(q)));
 let h='<p class="note" style="margin:0">Unexpected errors people hit on the site (newest first, up to 200). The same error from the same visit is only sent once. '+(errs.length?'<button class="btn sm" data-a="errclear">Clear all</button>':'')+'</p>';
 if(!list.length)return h+'<p class="note">'+(errs.length?'No errors match.':'No errors reported. \u{1F389}')+'</p>';
 return h+'<div class="list adm">'+list.map(e=>'<div class="item"><div class="grow"><b class="errmsg">'+esc(e.msg)+'</b><span class="effect">'+esc(ago(ms(e.t)))+' \u00b7 '+esc(nameOf(e.uid))+' \u00b7 '+esc(e.page||'')+' \u00b7 '+esc(browserOf(e.ua))+(e.v?' \u00b7 '+esc(e.v):'')+'</span>'+(e.stack?'<details><summary class="note">Details</summary><pre class="errstack">'+esc(e.stack)+'</pre></details>':'')+'</div><button class="btn sm" data-a="errdel" data-e="'+esc(e.id)+'">Clear</button></div>').join('')+'</div>';
}
function campsHtml(){
 const q=ui.q.trim().toLowerCase();
 const list=camps.filter(c=>!q||String(c.name||'').toLowerCase().includes(q)||String(nameOf(c.ownerUid)).toLowerCase().includes(q)).sort((a,b)=>ms(b.created)-ms(a.created));
 if(!list.length)return '<p class="note">No campaigns match.</p>';
 return '<div class="list adm">'+list.map(c=>{
  const n=(c.memberIds||[]).length;
  const act=ui.ask&&ui.ask.cid===c.id?'<span class="note">Delete “'+esc(c.name)+'” for all '+n+' member'+(n===1?'':'s')+'? This can’t be undone.</span><button class="btn sm dng" data-a="cdelyes" data-c="'+esc(c.id)+'">Delete</button><button class="btn sm" data-a="no">Cancel</button>'
   :'<button class="btn sm" data-a="cdel" data-c="'+esc(c.id)+'">Delete…</button>';
  return '<div class="item">'+(photoOk(c.photo)?'<img class="admimg" src="'+c.photo+'" alt="">':'<span class="admimg" aria-hidden="true"></span>')+'<div class="grow"><b>'+esc(c.name)+'</b>'+(bans[c.ownerUid]?' <span class="chip warn">Owner suspended</span>':'')+
   '<span class="effect">Owner '+esc(nameOf(c.ownerUid))+' · '+n+' member'+(n===1?'':'s')+(c.gmUid?' · GM '+esc(nameOf(c.gmUid)):'')+' · made '+esc(ago(ms(c.created)))+'</span></div><span class="row" style="gap:6px">'+act+'</span></div>';}).join('')+'</div>';
}

// ---------- events ----------
async function run(fn,ok){if(ui.busy)return;ui.busy=true;try{await fn();ui.ask=null;ui.rename=null;if(ok)toast(ok);}catch(e){console.warn(e);if(!(window.quotaHit&&quotaHit(e)))toast(e&&e.msg?e.msg:'That didn’t work. Try again.');}ui.busy=false;render();}
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;const a=b.dataset.a,u=b.dataset.u,c=b.dataset.c;
 if(a==='tab'){ui.tab=b.dataset.t;ui.ask=null;ui.rename=null;render();}
 else if(a==='reload')load();
 else if(a==='no'){ui.ask=null;ui.rename=null;render();}
 else if(a==='ban'){ui.ask={uid:u,what:'ban'};ui.rename=null;render();}
 else if(a==='sort'){ui.sort=b.dataset.s;try{localStorage.setItem('apl-adm-sort',ui.sort);}catch(er){}render();}
 else if(a==='del'){ui.ask={uid:u,what:'del'};ui.rename=null;render();}
 else if(a==='delyes')run(()=>deleteUser(u),'Account deleted.');
 else if(a==='banyes')run(()=>ban(u),'Account suspended.');
 else if(a==='unban')run(()=>unban(u),'Suspension lifted. They’ll need new invites to rejoin campaigns.');
 else if(a==='rename'){ui.rename=u;ui.ask=null;render();const el=document.getElementById('rn-'+u);if(el){el.focus();el.select();}}
 else if(a==='fbdel'){const id=b.dataset.f;run(async()=>{await db.doc('feedback/'+id).delete();fbs=fbs.filter(x=>x.id!==id);},'Marked as done.');}
 else if(a==='errdel'){const id=b.dataset.e;run(async()=>{await db.doc('errors/'+id).delete();errs=errs.filter(x=>x.id!==id);});}
 else if(a==='errclear')run(async()=>{await Promise.all(errs.map(x=>db.doc('errors/'+x.id).delete().catch(()=>{})));errs=[];},'Errors cleared.');
 else if(a==='cdel'){ui.ask={cid:c};render();}
 else if(a==='cdelyes')run(()=>deleteCampaign(c),'Campaign deleted.');
});
app.addEventListener('input',e=>{if(e.target.id==='q'){ui.q=e.target.value;render();}});
app.addEventListener('submit',e=>{const f=e.target;if(f.dataset.form!=='rename')return;e.preventDefault();const u=f.dataset.u,el=document.getElementById('rn-'+u);run(()=>renameUser(u,el.value.trim()),'Username changed.');});

// ---------- boot ----------
const cfg0=window.FIREBASE_CONFIG;
if(!cfg0||!window.firebase){app.innerHTML='<p class="note" style="padding:24px 16px">Firebase isn’t set up for this page.</p>';return;}
const cfg=Object.assign({},cfg0);if(/\.web\.app$|\.firebaseapp\.com$/.test(location.hostname))cfg.authDomain=location.hostname;
const fb=firebase.initializeApp(cfg,'beta');window.armAppCheck&&armAppCheck(fb);auth=fb.auth();db=fb.firestore();
auth.onAuthStateChanged(async u=>{
 authKnown=true;me=u&&!u.isAnonymous?u:null;
 if(!me){render();return;}
 try{const a=await db.doc('admins/'+me.uid).get();if(!a.exists){state='denied';render();return;}}catch(e){state='denied';render();return;}
 whoEl.innerHTML='<span class="nav"><a class="nav-l" href="./">‹ Back to the site</a></span>';
 load();
});
render();
})();
