// StreamSaver Service Worker
importScripts('https://cdn.jsdelivr.net/npm/web-streams-polyfill@2.0.2/dist/ponyfill.min.js');
importScripts('https://cdn.jsdelivr.net/npm/streamsaver@2.0.6/sw.js');

// PWA Cache for offline support
const CACHE_NAME = 'nobarfilm-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch with smart caching
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // DO NOT intercept video/audio streams, proxy video, or subtitles
  if (
    url.pathname.startsWith('/api/proxy/video') ||
    url.pathname.startsWith('/api/subtitle') ||
    event.request.destination === 'video' ||
    event.request.destination === 'audio'
  ) {
    return;
  }

  // Always prefer network for page navigations to avoid stale HTML/RSC payloads.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => 
        caches.match(event.request).then(r => r || caches.match('/'))
      )
    );
    return;
  }

  // Cache static assets (JS, CSS, Fonts)
  if (url.pathname.startsWith('/_next/static/') || url.pathname.endsWith('.woff2')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Cache Proxy Images
  if (url.pathname.startsWith('/api/proxy/image')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }).catch(() => fetch(event.request))
  );
});
