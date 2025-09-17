// Firebase SDK'larını service worker içine aktar
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Senin Firebase projenin web uygulaması yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyDw7e1yWd9gxakSCtDDjYM5rkfjWg4xsZg",
  authDomain: "nem18-5c2af.firebaseapp.com",
  projectId: "nem18-5c2af",
  storageBucket: "nem18-5c2af.firebasestorage.app",
  messagingSenderId: "370581331073",
  appId: "1:370581331073:web:fd3901a0b55bc8ac4b4180"
};

// Firebase'i service worker içinde başlat
firebase.initializeApp(firebaseConfig);

// Messaging servisine erişim sağla
const messaging = firebase.messaging();

// Arka planda gelen bildirimleri dinle
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Arka plan mesajı alındı: ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: './images/icon-192x192.png' // Bildirimlerde görünecek ikon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// === PWA ÖNBELLEKLEME KODLARI ===
const staticCacheName = 'site-static-v2';
const assets = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './images/icon-192x192.png',
  './images/icon-512x512.png',
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(staticCacheName).then(cache => {
      console.log('caching shell assets');
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys
        .filter(key => key !== staticCacheName)
        .map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request).then(cacheRes => {
      return cacheRes || fetch(evt.request);
    })
  );

});
