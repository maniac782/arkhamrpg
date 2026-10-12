/* Arkham Horror RPG Ledger — the site in other languages.
   Every piece of the site's own text is written in English in the code and passed through t() (or tn() when it depends
   on a number); js/lang/<code>.js holds each language's table, keyed by the English. Anything missing shows in English.
   What's saved stays in English (archetypes, knacks, gear, the Recent list), so a party can play in several languages:
   each person's page shows it in theirs. Not translated: what people type (names, notes, recaps, places).
   The language is the one picked in Settings or the footer (kept on this device, and in the account so it follows you),
   else the browser's own when we have it, else English. Only that language's table is loaded, before the page's scripts.
   scripts/i18n-keys.js lists every string; test/i18n.test.js checks each table has them all. */
(function(){
'use strict';
var LANGS=[['en','English'],['es','Español'],['ca','Català'],['fr','Français'],['pl','Polski'],['pt','Português']];
// for dates, times and numbers; English keeps the browser's own way of writing them
var LOCALE={en:undefined,es:'es-ES',ca:'ca-ES',fr:'fr-FR',pl:'pl-PL',pt:'pt-BR'};
var known=function(l){return LANGS.some(function(x){return x[0]===l;});};
var stored=null;try{stored=localStorage.getItem('apl-lang');}catch(e){}
var fromUrl=/[?&#]lang=([a-z]{2})\b/.exec(location.search+location.hash);
function fromBrowser(){var l=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'en'];
  for(var i=0;i<l.length;i++){var c=String(l[i]||'').slice(0,2).toLowerCase();if(known(c))return c;}return 'en';}
var lang=fromUrl&&known(fromUrl[1])?fromUrl[1]:stored&&known(stored)?stored:fromBrowser();
var T={},B=null,plural=null;
try{plural=new Intl.PluralRules(lang);}catch(e){}
function fill(s,v){return v?String(s).replace(/\{(\w+)\}/g,function(m,k){return v[k]!=null?v[k]:m;}):String(s);}

var I=window.I18N={
  lang:lang,langs:LANGS,locale:LOCALE[lang],
  chosen:!!(stored&&known(stored)),   // picked by the person on this device, not just the browser's default
  // called by js/lang/<code>.js with [English, translation] pairs (a plural's translation is {one, few, many, other})
  add:function(code,pairs){if(code!==lang)return;T={};(pairs||[]).forEach(function(p){T[p[0]]=p[1];});},
  // is there a translation for this exact English? (for saved text that may be ours or typed by someone)
  has:function(s){return typeof T[s]==='string';},
  // the English behind a translation shown in a box someone just edited (a knack or item name), else the text as typed
  back:function(s){if(!s||lang==='en')return s;if(!B){B={};for(var k in T)if(typeof T[k]==='string'&&!(T[k] in B))B[T[k]]=k.replace(/\|[^|]*$/,'');}return B[s]||s;},
  name:function(code){var x=LANGS.filter(function(y){return y[0]===code;})[0];return x?x[1]:code;},
  // switch: remember it here, let the page save it to the account (window.aplSaveLang), then reload in that language
  set:function(code){if(!known(code))return;try{localStorage.setItem('apl-lang',code);}catch(e){}
    var go=function(){var u=location.href.replace(/([?&])lang=[a-z]{2}&?/,'$1').replace(/[?&]$/,'');location.replace(u);};
    var save=window.aplSaveLang?window.aplSaveLang(code):null;
    if(save&&save.then){var t0=setTimeout(go,1500);save.then(function(){clearTimeout(t0);go();},function(){clearTimeout(t0);go();});}else go();},
  // a language picker (the footer's, and Settings')
  picker:function(id,cls){return '<select id="'+id+'" class="'+(cls||'')+'" aria-label="'+t('Language')+'">'+LANGS.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===lang?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select>';},
  // translate the page's own HTML: elements marked data-t (their contents), and data-t-title / -placeholder / -aria-label
  apply:function(root){
    root=root||document;
    root.querySelectorAll('[data-t]').forEach(function(el){var k=el.getAttribute('data-t')||el.innerHTML.trim();el.setAttribute('data-t',k);if(T[k])el.innerHTML=T[k];});
    ['title','placeholder','aria-label'].forEach(function(a){root.querySelectorAll('[data-t-'+a+']').forEach(function(el){var k=el.getAttribute('data-t-'+a)||el.getAttribute(a)||'';el.setAttribute('data-t-'+a,k);el.setAttribute(a,t(k));});});
  }
};
// t("Plays"), t("{n} or more", {n:7}): the text in this language, with {names} filled in. A key may end in "|context"
// when one English word needs different words elsewhere ("Won|total" heads a count); English drops the "|…".
var plain=function(s){return String(s).replace(/\|[^|]*$/,'');};
var t=window.t=function(s,v){var r=T[s];return fill(typeof r==='string'?r:plain(s),v);};
// tk('Heavy Blow'): marks English that's kept as it is (it's saved, or compared) but shown elsewhere with t().
window.tk=function(s){return s;};
// tn('{n} play', '{n} plays', count, {...}): the right form for the count (Polish has three). The table keeps the
// plural (other) English as the key, with {one, few, many, other} as needed by the language.
window.tn=function(one,other,n,v){v=v||{};if(v.n==null)v.n=n;var r=T[other],s;
  if(r&&typeof r==='object'){var c=plural?plural.select(n):'other';s=r[c]||r.other;}
  else s=typeof r==='string'?r:plain(n===1?one:other);
  // the count and its word stay on one line ("3 plays", not "3" at the end of one line and "plays" on the next)
  return fill(String(s).replace(/\{n\} /g,'{n} '),v);};
// numbers and dates the local way (English: the browser's own)
window.fmtNum=function(n,o){try{return Number(n).toLocaleString(LOCALE[lang],o);}catch(e){return String(n);}};

// Pages that don't set their own (the ledger, admin) save a new choice to the signed-in account's settings.
if(!window.aplSaveLang)window.aplSaveLang=function(code){try{var a=window.firebase&&firebase.apps.filter(function(x){return x.name==='beta';})[0],u=a&&a.auth().currentUser;
  if(!u||u.isAnonymous)return null;return a.firestore().doc('prefs/'+u.uid).set({lang:code},{merge:true});}catch(e){return null;}};
document.documentElement.lang=lang==='pt'?'pt-BR':lang;
if(lang!=='en')document.write('<script src="js/lang/'+lang+'.js"><\/script>');
document.addEventListener('DOMContentLoaded',function(){
  I.apply(document);
  // the footer's language picker, on every page
  var foot=document.querySelector('.foot');
  if(foot&&!document.getElementById('langpick')){var s=document.createElement('label');s.className='langpick';
    s.innerHTML='<span class="sr">'+t('Language')+'</span>'+I.picker('langpick','');foot.insertBefore(s,document.getElementById('ver'));
    s.querySelector('select').addEventListener('change',function(e){I.set(e.target.value);});}
});
})();
