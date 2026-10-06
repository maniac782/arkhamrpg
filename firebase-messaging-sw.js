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
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

// Show each message the server sends. Messages carry title, body, the page to open (link) and a tag.
try {
  firebase.initializeApp(FIREBASE_CONFIG);
  firebase.messaging().onBackgroundMessage(function (p) {
    var d = (p && p.data) || {};
    return self.registration.showNotification(d.title || 'Arkham Horror RPG Ledger', {
      body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', tag: d.tag || undefined, data: {link: d.link || '/'}
    });
  });
} catch (e) {}

// Tapping a notification opens its page: in the ledger if it's already open, otherwise in a new window.
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var link = new URL((e.notification.data && e.notification.data.link) || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.indexOf(self.location.origin) === 0) {
        c.postMessage({openLink: link});
        return c.focus();
      }
    }
    return self.clients.openWindow(link);
  }));
});
