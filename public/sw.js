const CACHE_NAME = 'growpesa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 🔥 ADD THIS: Listen for Push messages
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'GrowPesa', options)
    );
  }
});

// 🔥 ADD THIS: Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

self.addEventListener('fetch', function(event) {
  // Do NOT intercept API calls. Let the browser handle them natively.
  if (event.request.url.includes('/api/')) {
    return; 
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline', { status: 503 });
    })
  );
});