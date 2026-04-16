// Timer Service Worker — handles background notifications and completion sounds
const scheduledTimers = {};

// Active timer notification state
let activeTimerInterval = null;
let activeTimerTag = 'active-timer';

self.addEventListener('message', (event) => {
  const data = event.data || {};
  const { type } = data;

  // ── Scheduled (one-shot) notifications ──────────────────────────────────
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
        vibrate: vibrate || [200, 100, 200],
        tag: tag || 'timer-notification',
        requireInteraction: requireInteraction !== false,
        silent: false,
        data: { url: '/' },
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

  // ── Persistent live timer notification ─────────────────────────────────
  if (type === 'START_PERSISTENT_TIMER') {
    const { taskName, timeDisplay, isResting } = data;
    // Show immediately
    showPersistentTimer(taskName, timeDisplay, isResting, false);
  }

  if (type === 'UPDATE_PERSISTENT_TIMER') {
    const { taskName, timeDisplay, isResting } = data;
    // Update silently every second
    showPersistentTimer(taskName, timeDisplay, isResting, true);
  }

  if (type === 'STOP_PERSISTENT_TIMER') {
    // Close the active-timer notification
    self.registration.getNotifications({ tag: activeTimerTag }).then((notifs) => {
      notifs.forEach((n) => n.close());
    });
  }

  // ── Sound only ─────────────────────────────────────────────────────────
  if (type === 'PLAY_SOUND') {
    if (data.soundUrl) {
      playAudioInSW(data.soundUrl);
    }
  }

  // ── Cancel ─────────────────────────────────────────────────────────────
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
    // Close all notifications EXCEPT the active persistent timer
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((n) => {
        if (n.tag !== activeTimerTag) n.close();
      });
    });
  }

  // Cancel only reminder/scheduled notifications (not the active timer)
  if (type === 'CANCEL_REMINDERS') {
    // Cancel all scheduled timers that are reminders
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
  const body = `${timeDisplay}`;

  self.registration.showNotification(title, {
    body,
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    tag: activeTimerTag,
    requireInteraction: true,
    silent: !!silent,
    renotify: !silent,
    vibrate: silent ? [] : [100],
    data: { url: '/', isPersistentTimer: true },
    // Android specific — keeps it as ongoing
    ongoing: true,
  });
}

// Play audio using fetch + clients notification
async function playAudioInSW(soundUrl) {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clients.length > 0) {
      clients.forEach(client => {
        client.postMessage({ type: 'PLAY_COMPLETION_SOUND', soundUrl });
      });
      return;
    }
    console.log('[timer-sw] No clients available to play sound');
  } catch (e) {
    console.error('[timer-sw] Error playing sound:', e);
  }
}

// When user clicks the notification, focus/open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  // Don't re-open if it's the persistent timer (user just dismissed it visually)
  // but DO focus the app window
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

// Suppress notification close events for the persistent timer — re-show it
self.addEventListener('notificationclose', (event) => {
  // We don't automatically re-show; the timer component drives all updates
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
