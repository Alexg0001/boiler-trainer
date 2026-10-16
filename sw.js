const CACHE = "marine-trainers-v8";

// Local files: all pages, including turbo.html (was missing before).
const FILES = [
  "./",
  "./index.html",
  "./boiler.html",
  "./turbo.html",
  "./compressor.html",
  "./purifier.html",
  "./steering.html",
  "./ows.html",
  "./engineroom.html",
  "./mainengine.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Outside files the pages need (3D library and fonts). These are cross-origin,
// so they are cached with no-cors and stored even though their status can't be read.
const EXTERNAL = [
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
  "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700;800&family=Pacifico&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Add each file separately so one failed download doesn't stop the whole install.
    await Promise.allSettled(FILES.map(f => cache.add(f)));
    // cache.add() rejects opaque (no-cors) responses, so fetch and put them directly.
    await Promise.allSettled(EXTERNAL.map(async u => {
      const res = await fetch(new Request(u, { mode: "no-cors" }));
      await cache.put(u, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    // Remove caches from older versions.
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Cache first: once a page is stored, it opens from the phone without waiting for the network.
// If it isn't stored yet, fetch it from the network and store it for next time.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;
    try {
      const res = await fetch(e.request);
      if (res && (res.ok || res.type === "opaque")) {
        const cache = await caches.open(CACHE);
        cache.put(e.request, res.clone());
      }
      return res;
    } catch (err) {
      // Offline and not stored: return a clear error instead of a blank failure.
      return new Response("Offline - this page has not been saved yet. Connect to the internet once to save it.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
