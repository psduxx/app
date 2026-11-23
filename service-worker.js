// Retired service worker.
// The site root used to host a cache-first PWA. Browsers that installed it
// would keep serving the old cached page, so this version clears every cache,
// unregisters itself and reloads open tabs onto the live site.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => c.navigate(c.url));
    })()
  );
});
