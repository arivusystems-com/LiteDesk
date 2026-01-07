/**
 * Service Worker for Audit App PWA
 * 
 * Caching Strategy:
 * - Static assets: Cache First
 * - /audit/* GET requests: Stale-While-Revalidate
 * - /api/* routes: Network Only (never cached)
 * 
 * Scope: /audit/* only
 */

const CACHE_NAME = 'audit-app-v1';
const STATIC_CACHE_NAME = 'audit-static-v1';
const API_CACHE_NAME = 'audit-api-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/audit/dashboard',
  '/favicon.ico'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  return self.clients.claim(); // Take control of all pages
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname;

  // Only handle requests within audit app scope
  if (!path.startsWith('/audit/') && !path.startsWith('/api/audit/')) {
    return; // Let browser handle other requests
  }

  // NEVER cache /api/* routes (CRM routes)
  if (path.startsWith('/api/') && !path.startsWith('/api/audit/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static assets: Cache First
  if (event.request.destination === 'script' || 
      event.request.destination === 'style' || 
      event.request.destination === 'image' ||
      event.request.destination === 'font') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // /api/audit/* GET requests: Stale-While-Revalidate
  if (path.startsWith('/api/audit/') && event.request.method === 'GET') {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          // Fetch fresh data in background
          const fetchPromise = fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              cache.put(event.request, clone);
            }
            return response;
          }).catch(() => {
            // Network failed, return cached if available
            return cached || new Response(JSON.stringify({ 
              success: false, 
              message: 'Network error and no cached data available' 
            }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });

          // Return cached immediately if available, otherwise wait for network
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // POST/PUT/DELETE: Network Only (never cache)
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Default: Network First
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cached) => {
        if (cached) {
          return cached;
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Message handler for cache invalidation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(API_CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

