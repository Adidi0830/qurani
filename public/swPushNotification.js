// Service Worker for Push Notifications
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  try {
    let data;
    if (event.data) {
      data = event.data.json();
    } else {
      data = {
        title: '🕌 Qurani Notification',
        body: 'You have a new notification',
        icon: '/icons/qurani-192.png'
      };
    }
    
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/icons/qurani-192.png',
      badge: '/icons/qurani-192.png',
      data: data.data || {},
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || '🕌 Qurani', options)
    );
    
  } catch (error) {
    console.error('Service Worker: Push event error:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('🕌 Qurani', {
        body: 'You have a new notification',
        icon: '/icons/qurani-192.png'
      })
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Try to focus existing window
        for (let client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
  