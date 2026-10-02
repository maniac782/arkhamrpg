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
window.APP_CHECK_KEY = "";
window.armAppCheck = function(app){
  if(!window.APP_CHECK_KEY||!app||!app.appCheck||!window.firebase||!firebase.appCheck)return;
  try{app.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(window.APP_CHECK_KEY),true);}catch(e){console.warn('App Check',e);}
};
