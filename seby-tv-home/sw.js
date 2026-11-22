const CACHE_NAME = "seby-tv-studio-v2";
const ASSETS = [
  "./studio_ui.html",
  "./index.html",
  "./style.css",
  "./app.js",
  "./user_config.json",
  "./icon.png",
  "./largeIcon.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

