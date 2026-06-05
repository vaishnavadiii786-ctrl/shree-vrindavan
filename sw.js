// ═══════════════════════════════════════════════════════════════════
// 🙏 SHREE RADHA RAMAN JI — Service Worker
//    Offline-first strategy: cache shell on install,
//    serve from cache + update in background (stale-while-revalidate)
// ═══════════════════════════════════════════════════════════════════

const CACHE_NAME   = 'shree-rr-v1';
const OFFLINE_URL  = 'offline.html';

// Static shell assets to pre-cache
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-16.png',
  '/icons/icon-32.png',
];

// ── Install: pre-cache shell ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Add what we can; don't fail install if optional assets 404
      return cache.addAll(PRECACHE).catch(() => cache.add('/index.html'));
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ───────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: stale-while-revalidate for navigation & GET ───────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip non-http(s) requests (chrome-extension:// etc)
  if (!request.url.startsWith('http')) return;

  // Skip third-party API calls (Cloudinary, JSONBin, etc)
  const url = new URL(request.url);
  const thirdParty = ['api.cloudinary.com','api.jsonbin.io','api.imgbb.com',
                      'www.googletagmanager.com','fonts.googleapis.com','fonts.gstatic.com'];
  if (thirdParty.some(h => url.hostname.includes(h))) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);

      const networkFetch = fetch(request)
        .then(response => {
          // Cache successful opaque & 200 responses
          if (response && (response.status === 200 || response.type === 'opaque')) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      // Return cached immediately; update in background
      return cached || networkFetch || caches.match('/index.html');
    })
  );
});

// ── Background Sync: log offline actions when back online ────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-prayers') {
    // Could sync prayer wall to a real backend here
    console.log('🙏 Background sync: prayers');
  }
});

// ── Push Notifications: aarti reminders ──────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {
    title: 'Shree Radha Raman Ji 🪷',
    body: 'Aarti is starting soon! Radhe Radhe! 🙏',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-32.png',
    tag: 'aarti-reminder'
  };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-32.png',
      tag: data.tag || 'aarti',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
