// Timer Service Worker — handles background notifications and completion sounds
const scheduledTimers = {};

// Active timer notification state
let activeTimerTag = 'active-timer';

self.addEventListener('message', (event) => {
  const data = event.data || {};
  const { type } = data;

  // ── Scheduled (one-shot) notifications ──────────────────────────────────────
  if (type === 'SCHEDULE_NOTIFICATION') {
    const { id, delay, title, body, vibrate, tag, requireInteraction, playSound, soundUrl } = data;

    if (scheduledTimers[id]) {
      clearTimeout(scheduledTimers[id]);
      delete scheduledTimers[id];
    }

    const fireNotification = () => {
      self.registration.showNotification(title, {
        body,
        icon: '/images/logo.png',
        badge: '/images/logo.png',
        vibrate: vibrate || [300, 100, 300, 100, 300],
        tag: tag || 'timer-notification',
        requireInteraction: requireInteraction !== false,
        silent: false,
        renotify: true,
        data: { url: '/', type: 'task-complete' },
        // Android: maximize visibility
        actions: [{ action: 'open', title: '▶ Abrir App' }],
      });

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

  // ── Persistent live timer notification ─────────────────────────────────────
  if (type === 'START_PERSISTENT_TIMER') {
    const { taskName, timeDisplay, isResting } = data;
    showPersistentTimer(taskName, timeDisplay, isResting, false);
  }

  if (type === 'UPDATE_PERSISTENT_TIMER') {
    const { taskName, timeDisplay, isResting } = data;
    showPersistentTimer(taskName, timeDisplay, isResting, true);
  }

  if (type === 'STOP_PERSISTENT_TIMER') {
    self.registration.getNotifications({ tag: activeTimerTag }).then((notifs) => {
      notifs.forEach((n) => n.close());
    });
  }

  // ── Sound only ─────────────────────────────────────────────────────────────
  if (type === 'PLAY_SOUND') {
    if (data.soundUrl) {
      playAudioInSW(data.soundUrl);
    }
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────
  if (type === 'CANCEL_NOTIFICATION') {
    const { id, tag } = data;
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
      notifications.forEach((n) => {
        if (n.tag !== activeTimerTag) n.close();
      });
    });
  }

  if (type === 'CANCEL_REMINDERS') {
    Object.keys(scheduledTimers).forEach((key) => {
      if (key.startsWith('reminder-')) {
        clearTimeout(scheduledTimers[key]);
        delete scheduledTimers[key];
      }
    });
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((n) => {
        if (n.tag && n.tag.startsWith('reminder-')) n.close();
      });
    });
  }
});

function showPersistentTimer(taskName, timeDisplay, isResting, silent) {
  const emoji = isResting ? '🌴' : '⏱️';
  const title = `${emoji} ${taskName}`;
  const body = timeDisplay;

  self.registration.showNotification(title, {
    body,
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    tag: activeTimerTag,
    requireInteraction: true,
    silent: !!silent,
    renotify: !silent,
    vibrate: silent ? [] : [100, 50, 100],
    data: { url: '/', isPersistentTimer: true },
    ongoing: true,
    actions: [{ action: 'open', title: '▶ Abrir App' }],
  });
}

// Play audio by forwarding to main thread clients
async function playAudioInSW(soundUrl) {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clients.length > 0) {
      clients.forEach(client => {
        client.postMessage({ type: 'PLAY_COMPLETION_SOUND', soundUrl });
      });
    }
  } catch (e) {
    console.error('[timer-sw] Error playing sound:', e);
  }
}

// When user clicks the notification, focus/open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const url = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          // Send message to open the active timer screen
          if (notifData.isPersistentTimer || event.action === 'open') {
            client.postMessage({ type: 'NOTIFICATION_CLICKED', url });
          }
          return;
        }
      }
      // No window open — open a new one
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
