// ════════════════════════════════════════════════════════════
// 🛕 SHREE RADHA RAMAN JI — Service Worker
// Caching strategy: Cache First for assets, Network First for data
// ════════════════════════════════════════════════════════════

const SW_VERSION  = 'v1.0.0';
const CACHE_STATIC  = `shree-static-${SW_VERSION}`;
const CACHE_IMAGES  = `shree-images-${SW_VERSION}`;
const CACHE_FONTS   = `shree-fonts-${SW_VERSION}`;

// Files to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ── Install: precache static shell ───────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────────
self.addEventListener('activate', event => {
  const allowedCaches = [CACHE_STATIC, CACHE_IMAGES, CACHE_FONTS];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => !allowedCaches.includes(k)).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: smart caching strategy ────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin API requests
  if (request.method !== 'GET') return;
  if (url.hostname === 'api.jsonbin.io') return;
  if (url.hostname === 'api.cloudinary.com') return;
  if (url.hostname === 'www.googletagmanager.com') return;

  // Google Fonts — Cache First
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_FONTS).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Cloudinary images — Cache First (permanent URLs)
  if (url.hostname.includes('cloudinary.com') || url.hostname.includes('res.cloudinary.com')) {
    event.respondWith(
      caches.open(CACHE_IMAGES).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => cached || new Response('', { status: 503 }));
        })
      )
    );
    return;
  }

  // HTML / static assets — Cache First with network fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_STATIC).then(cache =>
        cache.match(request).then(cached => {
          const networkFetch = fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
          // Return cache immediately, update in background (stale-while-revalidate)
          return cached || networkFetch;
        })
      )
    );
    return;
  }
});

// ── Background Sync message ────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
