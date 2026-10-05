/* Paste your Firebase web app settings here (Firebase console > Project settings > Your apps). */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCzibyyquTc6L_S1mTQyVvkxVIJR2qv4j4",
  authDomain: "arkham-ledger.firebaseapp.com",
  projectId: "arkham-ledger",
  storageBucket: "arkham-ledger.firebasestorage.app",
  messagingSenderId: "789653165049",
  appId: "1:789653165049:web:23629583d7d0a3fc8de328"
};

/* Bot protection (Firebase App Check with reCAPTCHA Enterprise).
   Paste the reCAPTCHA Enterprise site key here. Left empty, App Check stays off. */
window.APP_CHECK_KEY = "6Ld_M9otAAAAAPKV4kSfUhxdn4oH6Z1NclhUdc-Y";
/* Google Places key for address suggestions in "Where" boxes. Limit it in Google Cloud to this site's
   addresses and to Places API (New) only, with a daily request cap. Left empty, suggestions stay off. */
window.PLACES_KEY = "AIzaSyAFmIarmHdwN6nMf0TNFexVr9Ab4BvdOnQ";
window.armAppCheck = function(app){
  if(!window.APP_CHECK_KEY||!app||!app.appCheck||!window.firebase||!firebase.appCheck)return;
  try{app.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(window.APP_CHECK_KEY),true);}catch(e){console.warn('App Check',e);}
};

/* Daily free-tier limit: when Firebase says the quota is used up, show a banner
   explaining that saving and syncing stop until the limit resets (midnight Pacific). */
window.quotaHit = function(e){
  if(!e||e.code!=='resource-exhausted')return false;
  if(document.getElementById('quota'))return true;
  var at='';
  try{
    var p={};new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour12:false,hour:'numeric',minute:'numeric',second:'numeric'}).formatToParts(new Date()).forEach(function(x){p[x.type]=+x.value;});
    var left=((24-(p.hour%24))*3600-p.minute*60-p.second)*1000;
    at=new Date(Date.now()+left).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
  }catch(_){}
  var d=document.createElement('div');d.id='quota';d.className='quota';d.setAttribute('role','alert');
  d.innerHTML='<b>The ledger has hit its daily limit.</b> Changes won’t save or sync until it resets'+(at?' at about '+at:' at midnight Pacific time')+'. What you see now may be out of date, so keep track on paper until then. Nothing already saved is lost.';
  var top=document.querySelector('.top');if(top)top.insertBefore(d,top.firstChild);else document.body.insertBefore(d,document.body.firstChild);
  return true;
};
window.addEventListener('unhandledrejection',function(ev){window.quotaHit(ev.reason);});

/* Beta error reporting: unexpected errors on any page are written (quietly, a few per visit at most) to the
   database's `errors` collection, which only admins can read on the admin page. Nothing is sent for people
   who aren't signed in. */
(function(){
  var sent=0,seen={};
  function report(msg,stack){
    try{
      msg=String(msg||'').slice(0,500);
      if(!msg||msg==='Script error.'||/ResizeObserver loop|resource-exhausted|Failed to fetch|NetworkError|network-request-failed/i.test(msg))return;
      if(seen[msg]||sent>=5)return;seen[msg]=1;
      var fb=window.firebase;if(!fb||!fb.apps||!fb.apps.length)return;
      var app=fb.apps.filter(function(a){return a.name==='beta';})[0]||fb.apps[0];
      var u=app.auth&&app.auth().currentUser;if(!u)return;
      sent++;
      var ver=document.getElementById('ver');
      app.firestore().collection('errors').add({
        msg:msg,stack:String(stack||'').slice(0,2000),
        page:(location.pathname+location.search.replace(/join=[^&]*/,'join=…')).slice(0,300),
        ua:String(navigator.userAgent||'').slice(0,300),v:ver?ver.textContent.slice(0,20):'',t:Date.now(),uid:u.uid
      }).catch(function(){});
    }catch(e){}
  }
  window.reportError=report;
  window.addEventListener('error',function(e){report(e.message||(e.error&&e.error.message),e.error&&e.error.stack);});
  window.addEventListener('unhandledrejection',function(e){var r=e.reason||{};if(r&&r.code==='resource-exhausted')return;report(r.message||String(r),r.stack);});
})();
