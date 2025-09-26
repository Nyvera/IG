const CACHE_NAME = "nyvera-cache-v1";
const PRECACHE = ["/", "/index.html", "/app.js", "/style.css", "/manifest.json", "/vendor/web-stable-diffusion/websd.min.js"];

// When installing, cache core assets
self.addEventListener("install", evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", evt => {
  evt.waitUntil(self.clients.claim());
});

// Fetch: respond from cache, otherwise network and cache it
self.addEventListener("fetch", evt => {
  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) return cached;
      return fetch(evt.request).then(response => {
        // don't cache opaque cross-origin responses (size/security)
        if (!response || response.type === 'opaque') return response;
        const respClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(evt.request, respClone));
        return response;
      }).catch(() => {
        // fallback for offline image requests (optional)
        if (evt.request.destination === "image") {
          return new Response(null, { status: 404 });
        }
      });
    })
  );
});
