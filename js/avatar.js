/* Arkham Ledger — the little round account icon: an uploaded photo, or the username's first letter on a colour chosen on the account page. */
window.AVATAR_COLORS={slate:'#56606f',crimson:'#a3322a',rust:'#b0582c',forest:'#2f6b4f',teal:'#1f6f78',navy:'#2d4a8a',violet:'#6a3d8f',rose:'#9b3b63',brass:'#8a6417'};
window.acctIcon=function(name,prof){
  prof=prof||{};
  if(typeof prof.photo==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(prof.photo))return '<img class="av" src="'+prof.photo+'" alt="">';
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
      '<button role="menuitem" type="button" data-acct="feedback">Send feedback</button>'+'<button role="menuitem" type="button" data-acct="signout">Sign out</button>'+(document.getElementById('ver')?'<span class="acctver">Arkham Ledger '+esc(document.getElementById('ver').textContent)+'</span>':'')+'</div></span>';
  };
  function setOpen(v){window.__acctOpen=v;document.querySelectorAll('.acctwrap').forEach(function(w){var m=w.querySelector('.acctmenu'),b=w.querySelector('.acctbtn');if(m)m.hidden=!v;if(b)b.setAttribute('aria-expanded',String(v));});}
  document.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('[data-acct]');
    if(t&&t.dataset.acct==='toggle'){e.stopPropagation();setOpen(!window.__acctOpen);return;}
    if(t&&t.dataset.acct==='signout'){setOpen(false);window.dispatchEvent(new CustomEvent('acct-signout'));return;}
    if(t&&t.dataset.acct==='feedback'){setOpen(false);openFeedback();return;}
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
    bg.innerHTML='<form class="crop fbform" novalidate><h2>Send feedback</h2>'+
      '<div class="fbkinds" role="radiogroup" aria-label="What kind of feedback">'+[['bug','Something\u2019s broken'],['idea','Idea'],['other','Other']].map(function(k,i){return '<label><input type="radio" name="fbk" value="'+k[0]+'"'+(i===0?' checked':'')+'> '+k[1]+'</label>';}).join('')+'</div>'+
      '<label class="field" style="width:100%"><span class="lbl">Message</span><textarea class="f" id="fbmsg" rows="5" maxlength="2000" placeholder="What happened, or what would make the site better?"></textarea></label>'+
      '<p class="note" style="margin:0;width:100%">The page you\u2019re on, your browser and the site version are included so it\u2019s easier to look into.</p>'+
      '<p class="err" id="fberr" hidden></p>'+
      '<div class="row" style="justify-content:flex-end;width:100%"><button class="btn" type="button" data-f="cancel">Cancel</button><button class="btn pri" type="submit">Send</button></div></form>';
    document.body.appendChild(bg);
    var form=bg.querySelector('form'),ta=bg.querySelector('#fbmsg'),er=bg.querySelector('#fberr');ta.focus();ta.addEventListener('input',function(){er.hidden=true;});
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
  window.sessionWhen=function(t){return new Date(t).toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});};
  window.sessionIcs=function(name,t,where){
    var f=function(x){return new Date(x).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');},e=function(s){return String(s||'').replace(/([,;\\])/g,'\\$1').replace(/\n/g,'\\n');};
    var ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Arkham Ledger//EN','BEGIN:VEVENT','UID:'+t+'-'+encodeURIComponent(name).slice(0,40)+'@arkhamrpg.web.app','DTSTAMP:'+f(Date.now()),'DTSTART:'+f(t),'DTEND:'+f(t+4*HOUR),
      'SUMMARY:'+e(name+' — Arkham Horror'),(where?'LOCATION:'+e(where):''),'DESCRIPTION:'+e('Open the ledger: '+location.origin+'/'),'END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\r\n');
    return 'data:text/calendar;charset=utf-8,'+encodeURIComponent(ics);
  };
  // Keep every countdown on the page current without redrawing anything else.
  setInterval(function(){document.querySelectorAll('[data-cd]').forEach(function(el){var t=Number(el.getAttribute('data-cd'));if(window.sessionShown(t)){if(el.hasAttribute('data-cdb'))el.innerHTML=window.sessionRelHtml(t);else el.textContent=window.sessionRel(t);}else el.remove();});},30000);
})();
