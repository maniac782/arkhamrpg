/* Background worker for push notifications. It only shows notifications the server sends (tapping one opens
   the ledger page it links to); it doesn't cache pages or touch any other requests.
   The settings below are copied from js/config.js (that file uses window, which workers don't have). */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyCzibyyquTc6L_S1mTQyVvkxVIJR2qv4j4",
  authDomain: "arkham-ledger.firebaseapp.com",
  projectId: "arkham-ledger",
  storageBucket: "arkham-ledger.firebasestorage.app",
  messagingSenderId: "789653165049",
  appId: "1:789653165049:web:23629583d7d0a3fc8de328"
};
try { firebase.initializeApp(FIREBASE_CONFIG); firebase.messaging(); } catch (e) {}
