const CACHE_NAME = 'growpesa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 1. Listen for Push messages from the Backend
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/dashboard' }
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'GrowPesa', options)
    );
  }
});

// 2. Open the app when notification is clicked
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.url.includes('/api/')) return; 
  event.respondWith(
    fetch(event.request).catch(() => new Response('Offline', { status: 503 }))
  );
});