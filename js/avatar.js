/* Arkham Horror RPG Ledger — the little round account icon: an uploaded photo, or the username's first letter on a colour chosen on the account page. */
window.AVATAR_COLORS={slate:'#56606f',crimson:'#a3322a',rust:'#b0582c',forest:'#2f6b4f',teal:'#1f6f78',navy:'#2d4a8a',violet:'#6a3d8f',rose:'#9b3b63',brass:'#8a6417'};
window.acctIcon=function(name,prof){
  prof=prof||{};
  if(window.imgOk&&window.imgOk(prof.photo))return '<img class="av" src="'+prof.photo+'" alt="">';
  var c=window.AVATAR_COLORS[prof.color]||window.AVATAR_COLORS.slate;
  var ic=String(name||'?').charAt(0).toUpperCase();
  return '<span class="av" aria-hidden="true" style="background:'+c+'">'+String(ic).replace(/[&<>"']/g,'')+'</span>';
};

/* The account menu in the top-right corner: your icon (and name on wider screens) opens a small menu with
   your account, the admin page for admins, and Sign out. Pages listen for the 'acct-signout' event. */
(function(){
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  window.acctMenuHtml=function(name,prof,opt){
    opt=opt||{};var open=!!window.__acctOpen;
    return '<span class="acctwrap"><button class="acctbtn" type="button" data-acct="toggle" aria-haspopup="menu" aria-expanded="'+open+'" title="Your account">'+window.acctIcon(name,prof)+'<b class="acctname">'+esc(name)+'</b><span class="caret" aria-hidden="true">▾</span></button>'+
      '<div class="acctmenu" role="menu"'+(open?'':' hidden')+'><div class="acctmenu-head">'+window.acctIcon(name,prof)+'<span><b>'+esc(name)+'</b>'+(opt.email?'<span class="note">'+esc(opt.email)+'</span>':'')+'</span></div>'+
      '<a role="menuitem" href="./?account=1" data-a="account">Your account</a>'+(opt.admin?'<a role="menuitem" href="admin.html">Admin</a>':'')+
      (window.isInstalledApp&&window.isInstalledApp()?'':'<button role="menuitem" type="button" data-acct="install">Install app</button>')+'<button role="menuitem" type="button" data-acct="feedback">Send feedback</button>'+'<button role="menuitem" type="button" data-acct="signout">Sign out</button>'+(document.getElementById('ver')?'<span class="acctver">Arkham Horror RPG Ledger '+esc(document.getElementById('ver').textContent)+'</span>':'')+'</div></span>';
  };
  function setOpen(v){window.__acctOpen=v;document.querySelectorAll('.acctwrap').forEach(function(w){var m=w.querySelector('.acctmenu'),b=w.querySelector('.acctbtn');if(m)m.hidden=!v;if(b)b.setAttribute('aria-expanded',String(v));});}
  document.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('[data-acct]');
    if(t&&t.dataset.acct==='toggle'){e.stopPropagation();setOpen(!window.__acctOpen);return;}
    if(t&&t.dataset.acct==='signout'){setOpen(false);window.dispatchEvent(new CustomEvent('acct-signout'));return;}
    if(t&&t.dataset.acct==='feedback'){setOpen(false);openFeedback();return;}
    if(t&&t.dataset.acct==='install'){setOpen(false);window.openInstall();return;}
    if(window.__acctOpen&&!(e.target.closest&&e.target.closest('.acctmenu')))setOpen(false);
    else if(window.__acctOpen&&e.target.closest('.acctmenu a'))setOpen(false);
  },true);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&window.__acctOpen){setOpen(false);var b=document.querySelector('.acctbtn');if(b)b.focus();}});
})();

/* Send feedback: a small form that saves to the database (feedback collection); the site owner reads it on the admin page. */
(function(){
  function app(){var fb=window.firebase;if(!fb||!fb.apps||!fb.apps.length)return null;return fb.apps.filter(function(a){return a.name==='beta';})[0]||fb.apps[0];}
  function note(m){var t=document.getElementById('toast');if(!t)return alert(m);t.textContent=m;t.hidden=false;clearTimeout(note.t);note.t=setTimeout(function(){t.hidden=true;},3200);}
  window.openFeedback=function(){
    if(document.querySelector('.fb-bg'))return;
    var bg=document.createElement('div');bg.className='crop-bg fb-bg';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');bg.setAttribute('aria-label','Send feedback');
    var kinds=[['bug','Bug','What happened? What were you trying to do?'],['idea','Idea','What would make the site better for your group?'],['other','Other','What\u2019s on your mind?']];
    bg.innerHTML='<form class="crop fbform" novalidate>'+
      '<div class="fbhead"><div><h2>Send feedback</h2><p class="note">Bugs, ideas, anything. It goes straight to the person who runs the site.</p></div><button class="fbx" type="button" data-f="cancel" aria-label="Close">\u00d7</button></div>'+
      '<div class="fbkinds" role="radiogroup" aria-label="What kind of feedback">'+kinds.map(function(k,i){return '<label class="fbkind"><input type="radio" name="fbk" value="'+k[0]+'"'+(i===0?' checked':'')+'><span>'+k[1]+'</span></label>';}).join('')+'</div>'+
      '<div class="fbbox"><textarea id="fbmsg" rows="6" maxlength="2000" aria-label="Message" placeholder="'+kinds[0][2]+'"></textarea><span class="fbcount" id="fbcount">0 / 2000</span></div>'+
      '<p class="err" id="fberr" hidden></p>'+
      '<div class="fbfoot"><span class="note">Includes the page you\u2019re on, your browser and the site version.</span><div class="row"><button class="btn" type="button" data-f="cancel">Cancel</button><button class="btn pri" type="submit">Send</button></div></div></form>';
    document.body.appendChild(bg);
    var form=bg.querySelector('form'),ta=bg.querySelector('#fbmsg'),er=bg.querySelector('#fberr'),cnt=bg.querySelector('#fbcount');ta.focus();
    ta.addEventListener('input',function(){er.hidden=true;cnt.textContent=ta.value.length+' / 2000';});
    form.addEventListener('change',function(e){if(e.target.name==='fbk'){var k=kinds.filter(function(x){return x[0]===e.target.value;})[0];if(k)ta.placeholder=k[2];ta.focus();}});
    var close=function(){bg.remove();document.removeEventListener('keydown',esc);};
    var esc=function(e){if(e.key==='Escape')close();};document.addEventListener('keydown',esc);
    bg.addEventListener('click',function(e){if(e.target===bg||e.target.closest('[data-f=cancel]'))close();});
    form.addEventListener('submit',function(e){e.preventDefault();
      var msg=ta.value.trim();if(!msg){er.textContent='Write a message first.';er.hidden=false;return;}
      var a=app(),u=a&&a.auth&&a.auth().currentUser;if(!u){er.textContent='Sign in first, then try again.';er.hidden=false;return;}
      var v=document.getElementById('ver'),kind=(form.querySelector('input[name=fbk]:checked')||{}).value||'other',btn=form.querySelector('[type=submit]');btn.disabled=true;
      a.firestore().collection('feedback').add({kind:kind,msg:msg.slice(0,2000),page:(location.pathname+location.search.replace(/join=[^&]*/,'join=\u2026')).slice(0,300),
        ua:String(navigator.userAgent||'').slice(0,300),v:v?v.textContent.slice(0,20):'',t:Date.now(),uid:u.uid})
       .then(function(){close();note('Thanks! Your feedback was sent.');},function(e2){btn.disabled=false;er.textContent=(e2&&e2.code==='resource-exhausted')?'The site has hit its daily limit. Try again tomorrow.':'Couldn\u2019t send that. Try again in a moment.';er.hidden=false;});
    });
  };
})();

/* Contact: a form anyone can use, signed in or not. It saves the message to the database (contact collection) and the
   server function contactEmail emails it to the site owner, with Reply going to the address given here. It uses its own
   Firebase app ("contact") so it works the same on every page, including the no-account campaign. */
(function(){
  var TOPICS=[['general','General'],['bug','Something’s broken'],['content','Game content / publisher'],['privacy','Privacy or my data']];
  function note(m){var t=document.getElementById('toast');if(!t)return;t.textContent=m;t.hidden=false;clearTimeout(note.t);note.t=setTimeout(function(){t.hidden=true;},3600);}
  function store(){
    var fb=window.firebase,cfg=window.FIREBASE_CONFIG;if(!fb||!fb.initializeApp||!cfg||!fb.firestore)return null;
    var a=null;try{a=(fb.apps||[]).filter(function(x){return x.name==='contact';})[0];}catch(e){}
    if(!a){var c={};for(var k in cfg)c[k]=cfg[k];a=fb.initializeApp(c,'contact');if(window.armAppCheck)window.armAppCheck(a);}
    return a.firestore();
  }
  function me(){try{var b=JSON.parse(localStorage.getItem('apl-beta-cache')||'null');return b&&b.uid?{email:b.email||'',name:(b.profile&&b.profile.username)||''}:{};}catch(e){return {};}}
  window.openContact=function(topic){
    if(document.querySelector('.fb-bg'))return;
    var who=me(),e=function(x){return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
    var bg=document.createElement('div');bg.className='crop-bg fb-bg';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');bg.setAttribute('aria-label','Contact');
    bg.innerHTML='<form class="crop fbform" novalidate>'+
      '<div class="fbhead"><div><h2>Contact</h2><p class="note">Questions, problems, or anything else. It goes straight to the person who runs the site, and replies come to your email.</p></div><button class="fbx" type="button" data-f="cancel" aria-label="Close">×</button></div>'+
      '<div class="ctrow"><label class="field"><span class="lbl">Your email</span><input class="f" id="ctemail" type="email" maxlength="120" autocomplete="email" required value="'+e(who.email)+'"></label>'+
      '<label class="field"><span class="lbl">Name (optional)</span><input class="f" id="ctname" maxlength="60" autocomplete="name" value="'+e(who.name)+'"></label></div>'+
      '<label class="field"><span class="lbl">About</span><select class="f" id="cttopic">'+TOPICS.map(function(t){return '<option value="'+t[0]+'"'+(t[0]===topic?' selected':'')+'>'+t[1]+'</option>';}).join('')+'</select></label>'+
      '<div class="fbbox"><textarea id="ctmsg" rows="6" maxlength="3000" aria-label="Message" placeholder="Your message"></textarea><span class="fbcount" id="ctcount">0 / 3000</span></div>'+
      '<p class="err" id="cterr" hidden></p>'+
      '<div class="fbfoot"><span class="note">Your email is only used to reply.</span><div class="row"><button class="btn" type="button" data-f="cancel">Cancel</button><button class="btn pri" type="submit">Send</button></div></div></form>';
    document.body.appendChild(bg);
    var form=bg.querySelector('form'),ta=bg.querySelector('#ctmsg'),em=bg.querySelector('#ctemail'),er=bg.querySelector('#cterr'),cnt=bg.querySelector('#ctcount');
    (em.value?ta:em).focus();
    ta.addEventListener('input',function(){er.hidden=true;cnt.textContent=ta.value.length+' / 3000';});
    var close=function(){bg.remove();document.removeEventListener('keydown',escK);};
    var escK=function(ev){if(ev.key==='Escape')close();};document.addEventListener('keydown',escK);
    bg.addEventListener('click',function(ev){if(ev.target===bg||ev.target.closest('[data-f=cancel]'))close();});
    form.addEventListener('submit',function(ev){ev.preventDefault();
      var email=em.value.trim(),msg=ta.value.trim(),name=bg.querySelector('#ctname').value.trim(),tp=bg.querySelector('#cttopic').value;
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){er.textContent='Enter your email so we can reply.';er.hidden=false;em.focus();return;}
      if(!msg){er.textContent='Write a message first.';er.hidden=false;ta.focus();return;}
      var db=store();if(!db){er.textContent='Couldn’t connect. Check your connection and try again.';er.hidden=false;return;}
      var v=document.getElementById('ver'),btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Sending…';
      db.collection('contact').add({email:email.slice(0,120),name:name.slice(0,60),topic:tp,msg:msg.slice(0,3000),page:location.pathname.slice(0,300),
        ua:String(navigator.userAgent||'').slice(0,300),v:v?v.textContent.slice(0,20):'',t:Date.now()})
       .then(function(){close();note('Thanks! Your message was sent. Replies come to '+email+'.');},
        function(){btn.disabled=false;btn.textContent='Send';er.textContent='Couldn’t send that. Try again in a moment.';er.hidden=false;});
    });
  };
  // Contact links: open the form here when this page can, otherwise go to the home page, which opens it.
  document.addEventListener('click',function(ev){var a=ev.target.closest&&ev.target.closest('a[data-contact]');if(!a||!window.firebase||!window.FIREBASE_CONFIG)return;ev.preventDefault();window.openContact();});
})();

/* Next session: countdown text, a live-updating label, and an "Add to calendar" (.ics) link. */
(function(){
  var HOUR=3600000,DAY=24*HOUR,LIVE=5*HOUR;
  // Is the session still worth showing? (upcoming, or started less than 5 hours ago)
  window.sessionShown=function(t){return typeof t==='number'&&t+LIVE>Date.now();};
  window.sessionRel=function(t){
    var d=t-Date.now();
    if(d<=0)return 'Happening now';
    var days=Math.floor(d/DAY),hrs=Math.floor((d%DAY)/HOUR),mins=Math.max(1,Math.ceil((d%HOUR)/60000));
    if(d>=2*DAY-HOUR)return 'in '+Math.round(d/DAY)+' days';
    if(days===1)return 'in 1 day'+(hrs?' '+hrs+' hr':'');
    if(hrs)return 'in '+hrs+' hr '+(mins===60?0:mins)+' min';
    return 'in '+mins+' min';
  };
  // Countdown with only the amount bold: "in <b>18 days</b>".
  window.sessionRelHtml=function(t){var s=window.sessionRel(t);return /^in /.test(s)?'in <b>'+s.slice(3)+'</b>':'<b>'+s+'</b>';};
  // Directions for a place that looks like an address (has a number or a comma), e.g. not "Discord".
  window.mapsHref=function(where){where=String(where||'').trim();if(!where||!/[0-9,]/.test(where)||/^https?:/i.test(where))return '';return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(where);};
  // Food near the session's place, as a Google Maps search (same rule as Directions: only for real addresses).
  window.foodHref=function(where){if(!window.mapsHref(where))return '';return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('restaurants near '+String(where).trim());};
  // The session's place as text, or for a real address a tappable link with a small menu: Directions and Food nearby.
  window.placeHtml=function(where){
    var e=function(x){return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
    var d=window.mapsHref(where);if(!d)return e(where);
    return '<span class="placewrap"><button type="button" class="placelink" data-placemenu aria-haspopup="true" aria-expanded="false">'+e(where)+'<span class="placecaret" aria-hidden="true">\u25be</span></button>'+
      '<span class="placemenu" role="menu" hidden><a role="menuitem" href="'+e(d)+'" target="_blank" rel="noopener">Directions</a><a role="menuitem" href="'+e(window.foodHref(where))+'" target="_blank" rel="noopener">Food nearby</a></span></span>';
  };
  document.addEventListener('click',function(ev){
    var b=ev.target.closest&&ev.target.closest('[data-placemenu]');
    document.querySelectorAll('.placemenu').forEach(function(m){if(!b||m!==b.nextElementSibling){m.hidden=true;if(m.previousElementSibling)m.previousElementSibling.setAttribute('aria-expanded','false');}});
    if(b){ev.preventDefault();var m=b.nextElementSibling;m.hidden=!m.hidden;b.setAttribute('aria-expanded',String(!m.hidden));
      // Keep the menu on screen: flip it to the other side of its button if it would run off an edge.
      if(!m.hidden){m.style.left='';m.style.right='';var r=m.getBoundingClientRect();if(r.left<8){m.style.left='0';m.style.right='auto';}else if(r.right>window.innerWidth-8){m.style.left='auto';m.style.right='0';}}}
  });
  document.addEventListener('keydown',function(ev){if(ev.key==='Escape')document.querySelectorAll('.placemenu').forEach(function(m){m.hidden=true;});});
  window.sessionWhen=function(t){return new Date(t).toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});};
  // Expected session length in hours for calendar events (owner/GM may choose 1-12; calendars assume 4 when it's not set).
  window.sessionHours=function(h){h=Number(h);return h>=1&&h<=12?h:4;};
  // "Fri, Oct 23, 6:00 – 10:00 PM": start and expected end.
  window.sessionSpan=function(t,h){h=Number(h);if(!(h>=1&&h<=12))return window.sessionWhen(t);var end=t+h*HOUR;
    try{var fmt=new Intl.DateTimeFormat([], {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});if(fmt.formatRange)return fmt.formatRange(new Date(t),new Date(end));}catch(e){}
    return window.sessionWhen(t)+' \u2013 '+new Date(end).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});};
  // The Length dropdown used where the owner or GM sets the next session.
  window.sessionHoursSelect=function(id,h){h=Number(h);var o='<option value="">Not set</option>';for(var i=1;i<=8;i++)o+='<option value="'+i+'"'+(i===h?' selected':'')+'>'+i+' hour'+(i===1?'':'s')+'</option>';return '<label class="field"><span class="lbl">Length (optional)</span><select class="f" id="'+id+'">'+o+'</select></label>';};
  // What to save for the Length dropdown: a number of hours, or null when left as "Not set".
  window.sessionHoursValue=function(v){v=Number(v);return v>=1&&v<=12?v:null;};
  window.sessionIcs=function(name,t,where,hours){
    var f=function(x){return new Date(x).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');},e=function(s){return String(s||'').replace(/([,;\\])/g,'\\$1').replace(/\n/g,'\\n');};
    var ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Arkham Horror RPG Ledger//EN','BEGIN:VEVENT','UID:'+t+'-'+encodeURIComponent(name).slice(0,40)+'@arkhamrpg.web.app','DTSTAMP:'+f(Date.now()),'DTSTART:'+f(t),'DTEND:'+f(t+window.sessionHours(hours)*HOUR),
      'SUMMARY:'+e(name+' — Arkham Horror RPG'),(where?'LOCATION:'+e(where):''),'DESCRIPTION:'+e('Open the ledger: '+location.origin+'/'),'END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\r\n');
    return 'data:text/calendar;charset=utf-8,'+encodeURIComponent(ics);
  };
  // "Add to calendar" with a menu: Google Calendar, Apple Calendar (a real link that iPhones and Macs open in Calendar),
  // Outlook, or the file itself.
  window.calMenuHtml=function(name,t,where,cid,hours){
    var e=function(x){return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
    var f=function(x){return new Date(x).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');},iso=function(x){return new Date(x).toISOString().replace(/\.\d{3}/,'');};
    var title=(name||'Session')+' \u2014 Arkham Horror RPG',end=t+window.sessionHours(hours)*HOUR,link=location.origin+'/play.html?c='+encodeURIComponent(cid||''),details='Open the ledger: '+link;
    var g='https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(title)+'&dates='+f(t)+'/'+f(end)+'&details='+encodeURIComponent(details)+(where?'&location='+encodeURIComponent(where):'');
    var o='https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject='+encodeURIComponent(title)+'&startdt='+encodeURIComponent(iso(t))+'&enddt='+encodeURIComponent(iso(end))+'&body='+encodeURIComponent(details)+(where?'&location='+encodeURIComponent(where):'');
    var a=cid?'/cal/'+encodeURIComponent(cid)+'.ics':'';
    var fileName=String(name||'session').replace(/[^\w -]+/g,'')+'.ics';
    return '<span class="placewrap"><button type="button" class="btn sm" data-placemenu aria-haspopup="true" aria-expanded="false">Add to calendar<span class="placecaret" aria-hidden="true">\u25be</span></button>'+
      '<span class="placemenu right" role="menu" hidden>'+
      '<a role="menuitem" href="'+e(g)+'" target="_blank" rel="noopener">Google Calendar</a>'+
      (a?'<a role="menuitem" href="'+e(a)+'">Apple Calendar (iPhone, Mac)</a>':'')+
      '<a role="menuitem" href="'+e(o)+'" target="_blank" rel="noopener">Outlook</a>'+
      '<a role="menuitem" href="'+window.sessionIcs(name,t,where,hours)+'" download="'+e(fileName)+'">Download file (.ics)</a></span></span>';
  };
  // Keep every countdown on the page current without redrawing anything else.
  setInterval(function(){document.querySelectorAll('[data-cd]').forEach(function(el){var t=Number(el.getAttribute('data-cd'));if(window.sessionShown(t)){if(el.hasAttribute('data-cdb'))el.innerHTML=window.sessionRelHtml(t);else el.textContent=window.sessionRel(t);}else el.remove();});},30000);
})();

/* Address suggestions for "Where" boxes (inputs with data-place): as you type, up to five matching places from
   Google Places (Autocomplete, Places API (New)). Only what's typed is sent. Off when window.PLACES_KEY is empty. */
(function(){
  var box=null,items=[],sel=-1,timer=0,seq=0,cur=null,picking=false,token='';
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function newToken(){token=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2);}
  function close(){if(box){box.remove();box=null;}items=[];sel=-1;}
  function place(){if(!box||!cur)return;var r=cur.getBoundingClientRect();box.style.left=(r.left+window.scrollX)+'px';box.style.top=(r.bottom+window.scrollY+4)+'px';box.style.width=Math.max(r.width,260)+'px';}
  function show(list){
    close();if(!list.length||!cur||document.activeElement!==cur)return;items=list;
    box=document.createElement('div');box.className='placebox';box.setAttribute('role','listbox');
    box.innerHTML=list.map(function(t,i){return '<div class="placeopt" role="option" data-i="'+i+'"><b>'+esc(t.main)+'</b>'+(t.sub?' <span class="placesub">'+esc(t.sub)+'</span>':'')+'</div>';}).join('')+'<div class="placeattr">powered by Google</div>';
    document.body.appendChild(box);place();
    box.addEventListener('mousedown',function(e){var o=e.target.closest('.placeopt');if(!o)return;e.preventDefault();pick(Number(o.dataset.i));});
  }
  function hi(){if(!box)return;box.querySelectorAll('.placeopt').forEach(function(o,i){o.classList.toggle('on',i===sel);});}
  function pick(i){if(!cur||!items[i])return;cur.value=items[i].full.slice(0,Number(cur.maxLength)>0?cur.maxLength:200);close();token='';picking=true;cur.dispatchEvent(new Event('input',{bubbles:true}));picking=false;}
  function search(q){
    var my=++seq;if(!token)newToken();
    fetch('https://places.googleapis.com/v1/places:autocomplete',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':window.PLACES_KEY,'X-Goog-FieldMask':'suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'},
      body:JSON.stringify({input:q,sessionToken:token,languageCode:'en'})})
    .then(function(r){return r.ok?r.json():{};}).then(function(j){
      if(my!==seq)return;var seen={},out=[];
      (j.suggestions||[]).forEach(function(s){var p=s.placePrediction;if(!p||!p.text)return;var full=p.text.text,sf=p.structuredFormat||{};
        if(seen[full])return;seen[full]=1;out.push({full:full,main:(sf.mainText&&sf.mainText.text)||full,sub:(sf.secondaryText&&sf.secondaryText.text)||''});});
      show(out.slice(0,5));
    }).catch(function(){});
  }
  document.addEventListener('input',function(e){
    var el=e.target;if(!window.PLACES_KEY||!el.matches||!el.matches('input[data-place]'))return;
    if(picking)return;
    cur=el;clearTimeout(timer);var q=el.value.trim();
    if(q.length<4||!/[a-z]/i.test(q)){close();return;}
    timer=setTimeout(function(){search(q);},400);
  });
  document.addEventListener('keydown',function(e){
    if(!box||!cur||e.target!==cur)return;
    if(e.key==='ArrowDown'){e.preventDefault();sel=Math.min(items.length-1,sel+1);hi();}
    else if(e.key==='ArrowUp'){e.preventDefault();sel=Math.max(0,sel-1);hi();}
    else if(e.key==='Enter'&&sel>=0){e.preventDefault();pick(sel);}
    else if(e.key==='Escape'){close();}
  },true);
  document.addEventListener('focusout',function(e){if(e.target===cur)setTimeout(close,150);});
  window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
})();

/* Install as an app. Chrome, Edge and Android offer a one-tap install prompt (kept from beforeinstallprompt);
   iPhones and iPads need Share > Add to Home Screen, so those get short instructions instead. */
(function(){
  var deferred=null;
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;});
  window.addEventListener('appinstalled',function(){deferred=null;});
  window.isInstalledApp=function(){try{return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;}catch(e){return false;}};
  function steps(){
    var ua=navigator.userAgent||'';window.__instIOS=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1),android=/Android/.test(ua);
    var ios=window.__instIOS;
    if(ios)return ['Tap the <b>Share</b> button (the square with an arrow) in Safari\u2019s toolbar.','Scroll down and tap <b>Add to Home Screen</b>.','Tap <b>Add</b>. Arkham Horror RPG Ledger appears on your home screen and opens full-screen.'];
    if(android)return ['Tap the browser\u2019s <b>\u22ee</b> menu (top right in Chrome).','Tap <b>Install app</b> or <b>Add to Home screen</b>.','Confirm, and open Arkham Horror RPG Ledger from your home screen.'];
    return ['In Chrome or Edge, click the <b>install</b> icon at the right end of the address bar (a screen with a down arrow), or open the browser menu and choose <b>Install Arkham Horror RPG Ledger</b>.','Open it from your Start menu, Dock or desktop like any other app. (Safari on a Mac: <b>File \u203a Add to Dock</b>.)'];
  }
  window.openInstall=function(){
    if(deferred){var d=deferred;deferred=null;d.prompt();return;}
    if(document.querySelector('.inst-bg'))return;
    var bg=document.createElement('div');bg.className='crop-bg inst-bg';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');bg.setAttribute('aria-label','Install Arkham Horror RPG Ledger');
    bg.innerHTML='<div class="crop fbform instbox"><div class="fbhead"><div><h2>Install Arkham Horror RPG Ledger</h2><p class="note">Put the ledger on your home screen. It opens full-screen like an app, with its own icon.</p></div><button class="fbx" type="button" data-i="close" aria-label="Close">\u00d7</button></div>'+
      '<ol class="inststeps">'+steps().map(function(x){return '<li>'+x+'</li>';}).join('')+'</ol>'+
      (window.__instIOS?'<p class="note" style="margin:0">You\u2019ll sign in once more inside the app; after that it remembers you.</p>':'')+
      '<div class="row" style="justify-content:flex-end"><button class="btn pri" type="button" data-i="close">Got it</button></div></div>';
    document.body.appendChild(bg);
    var close=function(){bg.remove();document.removeEventListener('keydown',esc);};var esc=function(e){if(e.key==='Escape')close();};document.addEventListener('keydown',esc);
    bg.addEventListener('click',function(e){if(e.target===bg||e.target.closest('[data-i=close]'))close();});
  };
})();

/* A tapped notification asks an already-open page to show its link (see firebase-messaging-sw.js). */
(function(){
  if(!('serviceWorker' in navigator))return;
  navigator.serviceWorker.addEventListener('message',function(e){
    var link=e.data&&e.data.openLink;if(typeof link!=='string')return;
    try{var u=new URL(link,location.origin);if(u.origin!==location.origin)return;
      if(u.pathname===location.pathname&&u.search===location.search&&u.hash){location.hash=u.hash;}else location.href=u.href;}catch(err){}
  });
})();
