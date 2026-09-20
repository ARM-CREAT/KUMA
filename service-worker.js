// KUMA — Service Worker : mode hors-ligne + faible consommation (2G/3G)
const CACHE_NAME = "kuma-cache-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/firebase-config.js",
  "./js/auth.js",
  "./js/app.js",
  "./js/chat.js",
  "./js/status.js",
  "./js/calls.js",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stratégie : réseau d'abord pour Firestore/Firebase (temps réel),
// cache d'abord pour les fichiers statiques (mode 2G/3G).
self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  const isFirebase = url.includes("firestore.googleapis.com") ||
                      url.includes("firebaseio.com") ||
                      url.includes("identitytoolkit") ||
                      url.includes("firebasestorage");

  if (isFirebase) return; // laisser passer le SDK Firebase tel quel

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => cached);
    })
  );
});
