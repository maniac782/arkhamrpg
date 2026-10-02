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
  d.innerHTML='<b>The ledger has hit its free daily limit.</b> Changes won’t save or sync until it resets'+(at?' at about '+at:' at midnight Pacific time')+'. What you see now may be out of date, so keep track on paper until then. Nothing already saved is lost.';
  var top=document.querySelector('.top');if(top)top.insertBefore(d,top.firstChild);else document.body.insertBefore(d,document.body.firstChild);
  return true;
};
window.addEventListener('unhandledrejection',function(ev){window.quotaHit(ev.reason);});
