// Timer Service Worker — handles background notifications and completion sounds
const scheduledTimers = {};

self.addEventListener('message', (event) => {
  const { type, id, delay, title, body, vibrate, tag, requireInteraction, playSound, soundUrl } = event.data || {};

  if (type === 'SCHEDULE_NOTIFICATION') {
    // Cancel existing timer with same id
    if (scheduledTimers[id]) {
      clearTimeout(scheduledTimers[id]);
      delete scheduledTimers[id];
    }

    const fireNotification = () => {
      self.registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: vibrate || [200, 100, 200],
        tag: tag || 'timer-notification',
        requireInteraction: requireInteraction !== false,
        data: { url: '/' },
      });

      // Play completion sound if requested
      if (playSound && soundUrl) {
        playAudioInSW(soundUrl);
      }

      delete scheduledTimers[id];
    };

    if (delay <= 0) {
      fireNotification();
      return;
    }

    scheduledTimers[id] = setTimeout(fireNotification, delay);
  }

  if (type === 'PLAY_SOUND') {
    // Direct sound playback request
    if (event.data.soundUrl) {
      playAudioInSW(event.data.soundUrl);
    }
  }

  if (type === 'CANCEL_NOTIFICATION') {
    if (id && scheduledTimers[id]) {
      clearTimeout(scheduledTimers[id]);
      delete scheduledTimers[id];
    }
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

// Play audio using fetch + decodeAudioData in the SW context
async function playAudioInSW(soundUrl) {
  try {
    // Notify all clients to play the sound (more reliable than SW audio)
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clients.length > 0) {
      clients.forEach(client => {
        client.postMessage({ type: 'PLAY_COMPLETION_SOUND', soundUrl });
      });
      return;
    }
    // Fallback: try to play in SW context (limited support)
    // Most browsers don't support AudioContext in SW, but we try anyway
    console.log('[timer-sw] No clients available to play sound');
  } catch (e) {
    console.error('[timer-sw] Error playing sound:', e);
  }
}

// When user clicks the notification, focus/open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
