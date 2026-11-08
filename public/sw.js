const CACHE_NAME = 'growpesa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 🔥 REQUIRED: Handle fetch events for PWA installability
self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).catch(() => new Response(null, { status: 404 }))
  );
});

// 🔥 REQUIRED: Handle incoming push notifications
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: { dateOfArrival: Date.now(), primaryKey: '2' },
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/dashboard')
  );
});