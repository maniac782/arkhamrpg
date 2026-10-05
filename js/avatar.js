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
  // A pre-filled email to the site owner with the page and version, so beta testers can report things in one click.
  function feedbackHref(){var v=document.getElementById('ver');return 'mailto:maniac78@gmail.com?subject='+encodeURIComponent('Arkham Ledger feedback'+(v?' ('+v.textContent+')':''))+'&body='+encodeURIComponent('\n\n\u2014\nPage: '+location.pathname+location.search.replace(/join=[^&]*/,'join=\u2026')+'\nBrowser: '+navigator.userAgent);}
  window.acctMenuHtml=function(name,prof,opt){
    opt=opt||{};var open=!!window.__acctOpen;
    return '<span class="acctwrap"><button class="acctbtn" type="button" data-acct="toggle" aria-haspopup="menu" aria-expanded="'+open+'" title="Your account">'+window.acctIcon(name,prof)+'<b class="acctname">'+esc(name)+'</b><span class="caret" aria-hidden="true">▾</span></button>'+
      '<div class="acctmenu" role="menu"'+(open?'':' hidden')+'><div class="acctmenu-head">'+window.acctIcon(name,prof)+'<span><b>'+esc(name)+'</b>'+(opt.email?'<span class="note">'+esc(opt.email)+'</span>':'')+'</span></div>'+
      '<a role="menuitem" href="./?account=1" data-a="account">Your account</a>'+(opt.admin?'<a role="menuitem" href="admin.html">Admin</a>':'')+
      '<a role="menuitem" href="'+feedbackHref()+'" data-acct="feedback">Send feedback</a>'+'<button role="menuitem" type="button" data-acct="signout">Sign out</button>'+(document.getElementById('ver')?'<span class="acctver">Arkham Ledger '+esc(document.getElementById('ver').textContent)+'</span>':'')+'</div></span>';
  };
  function setOpen(v){window.__acctOpen=v;document.querySelectorAll('.acctwrap').forEach(function(w){var m=w.querySelector('.acctmenu'),b=w.querySelector('.acctbtn');if(m)m.hidden=!v;if(b)b.setAttribute('aria-expanded',String(v));});}
  document.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('[data-acct]');
    if(t&&t.dataset.acct==='toggle'){e.stopPropagation();setOpen(!window.__acctOpen);return;}
    if(t&&t.dataset.acct==='signout'){setOpen(false);window.dispatchEvent(new CustomEvent('acct-signout'));return;}
    if(window.__acctOpen&&!(e.target.closest&&e.target.closest('.acctmenu')))setOpen(false);
    else if(window.__acctOpen&&e.target.closest('.acctmenu a'))setOpen(false);
  },true);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&window.__acctOpen){setOpen(false);var b=document.querySelector('.acctbtn');if(b)b.focus();}});
})();
