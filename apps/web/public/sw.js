// CA SmartPro service worker — installability + app-shell speed only.
//
// This is deliberately NOT a full offline-data PWA: client, task, and
// compliance data must always be live and correct for a CA's practice, so
// every /api/ request always goes straight to the network, untouched. Only
// content-hashed static build assets (safe to cache indefinitely) and the
// icons/manifest are cached. Page navigations are network-first; if the
// network is unreachable, we fall back to the cached shell or /offline
// rather than ever showing stale business data.

const CACHE_NAME = "ca-smartpro-shell-v1";
const SHELL_ASSETS = ["/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept writes

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin (API base URL, fonts CDN, etc.)
  if (url.pathname.startsWith("/api/")) return; // always live — never cached

  // Next.js build output under /_next/static is content-hashed — safe to cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Page navigations: always try the network first so data is never stale;
  // only fall back to a cached shell/offline page when the network is down.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match("/offline"))),
    );
  }
});
