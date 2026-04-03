// Timer Service Worker — handles background notifications
const scheduledTimers = {};

self.addEventListener('message', (event) => {
  const { type, id, delay, title, body, vibrate, tag, requireInteraction } = event.data || {};

  if (type === 'SCHEDULE_NOTIFICATION') {
    // Cancel existing timer with same id
    if (scheduledTimers[id]) {
      clearTimeout(scheduledTimers[id]);
      delete scheduledTimers[id];
    }

    if (delay <= 0) {
      // Fire immediately
      self.registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: vibrate || [200, 100, 200],
        tag: tag || 'timer-notification',
        requireInteraction: requireInteraction !== false,
        data: { url: '/' },
      });
      return;
    }

    scheduledTimers[id] = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: vibrate || [200, 100, 200],
        tag: tag || 'timer-notification',
        requireInteraction: requireInteraction !== false,
        data: { url: '/' },
      });
      delete scheduledTimers[id];
    }, delay);
  }

  if (type === 'CANCEL_NOTIFICATION') {
    if (id && scheduledTimers[id]) {
      clearTimeout(scheduledTimers[id]);
      delete scheduledTimers[id];
    }
    // Also close any visible notification with matching tag
    if (tag) {
      self.registration.getNotifications({ tag }).then((notifications) => {
        notifications.forEach((n) => n.close());
      });
    }
  }

  if (type === 'CANCEL_ALL') {
    Object.keys(scheduledTimers).forEach((key) => {
      clearTimeout(scheduledTimers[key]);
      delete scheduledTimers[key];
    });
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  }
});

// When user clicks the notification, focus/open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if any
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
