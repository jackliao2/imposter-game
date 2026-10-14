var CACHE = "imposter-v4";
var FILES = [
  "/",
  "/index.html",
  "/how-to-play/",
  "/online/",
  "/free/",
  "/unblocked/",
  "/impostor-game/",
  "/io/",
  "/offline/",
  "/one-phone/",
  "/lookalike/",
  "/decks/",
  "/decks/supper/",
  "/decks/creatures/",
  "/decks/out/",
  "/decks/house/",
  "/decks/weather/",
  "/decks/work/",
  "/decks/play/",
  "/decks/class/",
  "/decks/closet/",
  "/decks/screen/",
  "/the-imposter-game/",
  "/browser/",
  "/compare/",
  "/css/game.css",
  "/js/engine.js",
  "/js/words.js",
  "/js/game.js",
  "/fonts/fraunces-600.woff2",
  "/fonts/outfit-500.woff2",
  "/fonts/outfit-700.woff2",
  "/favicon.svg",
  "/manifest.webmanifest",
  "/sitemap.xml"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(FILES);
  }));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) {
      return caches.delete(key);
    }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(function (response) {
    if (response && response.status === 200 && new URL(event.request.url).origin === self.location.origin) {
      var copy = response.clone();
      caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
    }
    return response;
  }).catch(function () {
    return caches.match(event.request);
  }));
});
