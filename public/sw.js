const CACHE_NAME = 'growpesa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Crucial for installability: handle fetch events
self.addEventListener('fetch', (event) => {
  // A pass-through fetch handler satisfies Chrome's installability check
  event.respondWith(
    fetch(event.request).catch(() => {
      // Optional: fallback to cached assets if needed
      return new Response('Offline', { status: 503 });
    })
  );
});