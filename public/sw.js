const CACHE_NAME = 'growpesa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', function(event) {
  // 🔥 CRITICAL FIX: Do NOT intercept API calls. Let the browser handle them natively.
  if (event.request.url.includes('/api/')) {
    return; 
  }

  // For everything else (images, pages), just fetch normally
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline', { status: 503 });
    })
  );
});