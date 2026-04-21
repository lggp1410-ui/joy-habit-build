// PlanLizz Service Worker — background timer, precise reminders, offline cache
// Version: 6.2


const CACHE_NAME = 'planlizz-v6.2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/logo.png',
  '/sounds/Pop.m4a',
  '/sounds/Ding.m4a',
  '/sounds/Conquista.m4a',
  '/sounds/Correto.m4a',
  '/sounds/Flecha.m4a',
  '/sounds/Latido.m4a',
  '/sounds/Passaros.mp3',
  '/sounds/Gatinho.m4a',
  '/sounds/Apito.m4a',
];

// Active timer notification state
let activeTimerTag = 'active-timer';


// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url).catch(() => {})))
    )
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
      // On SW restart: reload persisted reminders from IndexedDB and reschedule
      loadAndReschedulePersisted(),
    ])
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html').then((r) => r || fetch(event.request))
      )
    );
    return;
  }

  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/images/') || url.pathname.startsWith('/sounds/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return response;
        }).catch(() => cached || new Response('', { status: 404 }));
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});

// ── IndexedDB persistence ────────────────────────────────────────────────────
const IDB_NAME = 'planlizz-sw-reminders';
const IDB_VERSION = 2;
const IDB_STORE = 'reminders';
const IDB_TIMER_STORE = 'activeTimer';

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(IDB_TIMER_STORE)) {
        db.createObjectStore(IDB_TIMER_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function idbSave(reminder) {
  try {
    const db = await openIDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(reminder);
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    console.warn('[SW] idbSave error:', e);
  }
}

async function idbDelete(id) {
  try {
    const db = await openIDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    console.warn('[SW] idbDelete error:', e);
  }
}

async function idbGetAll() {
  try {
    const db = await openIDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = (e) => resolve(e.target.result || []);
      req.onerror = reject;
    });
  } catch (e) {
    console.warn('[SW] idbGetAll error:', e);
    return [];
  }
}

async function idbSaveActiveTimer(timer) {
  try {
    const db = await openIDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_TIMER_STORE, 'readwrite');
      tx.objectStore(IDB_TIMER_STORE).put({ id: 'current', ...timer });
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    console.warn('[SW] idbSaveActiveTimer error:', e);
  }
}

async function idbGetActiveTimer() {
  try {
    const db = await openIDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_TIMER_STORE, 'readonly');
      const req = tx.objectStore(IDB_TIMER_STORE).get('current');
      req.onsuccess = (e) => resolve(e.target.result || null);
      req.onerror = reject;
    });
  } catch (e) {
    console.warn('[SW] idbGetActiveTimer error:', e);
    return null;
  }
}

async function idbClearActiveTimer() {
  try {
    const db = await openIDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_TIMER_STORE, 'readwrite');
      tx.objectStore(IDB_TIMER_STORE).delete('current');
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    console.warn('[SW] idbClearActiveTimer error:', e);
  }
}

// ── In-memory reminders (also persisted to IDB) ───────────────────────────────
// { id -> { id, fireAtMs, title, body, tag, vibrate, playSound, soundUrl } }
const scheduledReminders = {};
let reminderIntervalId = null;

// ── Load & reschedule from IDB after SW restart ───────────────────────────────
async function loadAndReschedulePersisted() {
  const items = await idbGetAll();
  const now = Date.now();
  for (const r of items) {
    if (r.fireAtMs <= now) {
      // Already past — fire immediately and remove
      fireReminder(r);
      await idbDelete(r.id);
    } else {
      // Restore into memory and reschedule timeout
      scheduledReminders[r.id] = r;
      const delay = r.fireAtMs - now;
      setTimeout(() => {
        if (scheduledReminders[r.id]) {
          fireReminder(scheduledReminders[r.id]);
          delete scheduledReminders[r.id];
          idbDelete(r.id);
        }
      }, delay);
    }
  }
  if (Object.keys(scheduledReminders).length > 0) {
    startReminderPoller();
  }

  const activeTimer = await idbGetActiveTimer();
  if (activeTimer) {
    bgTimer = activeTimer;
    if (bgTimer.isPaused) {
      const label = bgTimer.isResting ? '🌴' : '⏱️';
      const absR = Math.abs(Math.round(bgTimer.pausedRemaining));
      const m = String(Math.floor(absR / 60)).padStart(2, '0');
      const s = String(absR % 60).padStart(2, '0');
      self.registration.showNotification(`${label} ${bgTimer.taskName} ⏸`, {
        body: `${m}:${s} — pausado`,
        icon: '/images/logo.png',
        badge: '/images/logo.png',
        tag: ACTIVE_TIMER_TAG,
        requireInteraction: true,
        silent: true,
        renotify: false,
        vibrate: [],
        priority: 'high',
        data: bgTimer.data || { url: '/', isPersistentTimer: true },
        ongoing: true,
        actions: [{ action: 'open', title: '▶ Abrir App' }],
      });
    } else {
      startBgTimerEngine();
    }
  }
}

// ── Precise reminder engine (1-second polling) ────────────────────────────────
function startReminderPoller() {
  if (reminderIntervalId !== null) return;
  // Poll every 1 second for immediate notification delivery
  reminderIntervalId = setInterval(checkReminders, 1000);
}

function stopReminderPollerIfEmpty() {
  if (Object.keys(scheduledReminders).length === 0 && reminderIntervalId !== null) {
    clearInterval(reminderIntervalId);
    reminderIntervalId = null;
  }
}

function checkReminders() {
  const now = Date.now();
  Object.keys(scheduledReminders).forEach((id) => {
    const r = scheduledReminders[id];
    if (!r) return;
    if (now >= r.fireAtMs) {
      fireReminder(r);
      delete scheduledReminders[id];
      idbDelete(id);
    }
  });
  stopReminderPollerIfEmpty();
}

function fireReminder(r) {
  self.registration.showNotification(r.title, {
    body: r.body,
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    vibrate: r.vibrate || [300, 100, 300, 100, 300, 100, 400],
    tag: r.tag || 'reminder',
    requireInteraction: true,
    silent: false,
    renotify: true,
    priority: 'high',
    data: r.data || { url: '/', type: 'reminder', tag: r.tag },
    actions: [{ action: 'open', title: '▶ Abrir App' }],
  });
  if (r.playSound && r.soundUrl) {
    playAudioInSW(r.soundUrl);
  }
}

// ── Background timer engine ───────────────────────────────────────────────────
// Runs in the SW independently — updates persistent notification every 1 second,
// perfectly synchronized with the screen timer (same startTimestamp formula).

let bgTimer = null;
// { taskName, startTimestamp, pausedRemaining, isResting, soundUrl, playSound, completionFired }
let bgTimerIntervalId = null;

const ACTIVE_TIMER_TAG = 'active-timer';

function startBgTimerEngine() {
  if (bgTimerIntervalId !== null) {
    clearInterval(bgTimerIntervalId);
  }
  // Fire immediately so the first notification appears without 1s delay
  tickBgTimer();
  // Then tick every 1 second — same cadence as the screen timer
  bgTimerIntervalId = setInterval(tickBgTimer, 1000);
}

function stopBgTimerEngine() {
  if (bgTimerIntervalId !== null) {
    clearInterval(bgTimerIntervalId);
    bgTimerIntervalId = null;
  }
}

function tickBgTimer() {
  if (!bgTimer) {
    stopBgTimerEngine();
    return;
  }

  const now = Date.now();
  // Same formula as the screen: remaining = pausedRemaining - elapsed
  const elapsedMs = now - bgTimer.startTimestamp;
  const remainingMs = bgTimer.pausedRemaining * 1000 - elapsedMs;
  const remainingSecs = Math.ceil(remainingMs / 1000);

  const absRemaining = Math.abs(remainingSecs);
  const sign = remainingSecs < 0 ? '-' : '';
  const m = String(Math.floor(absRemaining / 60)).padStart(2, '0');
  const s = String(absRemaining % 60).padStart(2, '0');
  const display = `${sign}${m}:${s}`;

  const emoji = bgTimer.isResting ? '🌴' : '⏱️';
  const firstVisibleTick = !bgTimer.visibleStarted;

  void showActiveTimerNotification(`${emoji} ${bgTimer.taskName}`, {
    body: firstVisibleTick ? `${display} — timer iniciado` : display,
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    tag: ACTIVE_TIMER_TAG,
    requireInteraction: true,
    silent: !firstVisibleTick,
    renotify: firstVisibleTick,
    vibrate: firstVisibleTick ? [120, 60, 120] : [],
    priority: 'high',
    data: bgTimer.data || { url: '/', isPersistentTimer: true },
    ongoing: true,
    actions: [{ action: 'open', title: '▶ Abrir App' }],
  });
  if (firstVisibleTick) {
    bgTimer.visibleStarted = true;
    idbSaveActiveTimer(bgTimer);
  }

  // Completion alert when timer hits exactly 0
  if (remainingSecs <= 0 && !bgTimer.completionFired) {
    bgTimer.completionFired = true;
    self.registration.showNotification(`✅ ${bgTimer.taskName}`, {
      body: `Tarefa ${bgTimer.taskName} concluída! ⭐ Hora da próxima!`,
      icon: '/images/logo.png',
      badge: '/images/logo.png',
      vibrate: [300, 100, 300, 100, 400, 100, 400],
      tag: 'timer-task-complete',
      requireInteraction: true,
      silent: false,
      renotify: true,
      priority: 'high',
      data: bgTimer.data || { url: '/', type: 'completion' },
      actions: [{ action: 'open', title: '▶ Abrir App' }],
    });
    if (bgTimer.playSound && bgTimer.soundUrl) {
      playAudioInSW(bgTimer.soundUrl);
    }
  }
}

async function showActiveTimerNotification(title, options) {
  try {
    const notifications = await self.registration.getNotifications({ tag: ACTIVE_TIMER_TAG });
    notifications.forEach((notification) => notification.close());
  } catch {}
  return self.registration.showNotification(title, options);
}

// ── Message handler ───────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const data = event.data || {};
  const { type } = data;


  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // ── Register background timer ─────────────────────────────────────────────
  if (type === 'REGISTER_BACKGROUND_TIMER') {
    const { taskName, startTimestamp, pausedRemaining, isResting, soundUrl, playSound } = data;
    bgTimer = {
      taskName,
      startTimestamp,
      pausedRemaining,
      isResting: !!isResting,
      soundUrl: soundUrl || '',
      playSound: !!playSound,
      isPaused: false,
      data: data.data || { url: '/', isPersistentTimer: true },
      completionFired: false,
      visibleStarted: false,

  // ── Scheduled (one-shot) notifications ──────────────────────────────────────
  if (type'SCHEDULE_NOTIFICATION')
    const { id, delay, title, body, vibrate, tag, requireInteraction, playSound, soundUrl, targetTimestamp } = data;
    const notifData = data.data || { url: '/', type: 'task-complete' };

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
        data: notifData,
        ongoing: true,
        // Android: maximize visibility
        actions: [{ action: 'open', title: '▶ Abrir App' }],
      });

      if (playSound && soundUrl) {
        playAudioInSW(soundUrl);
      }

      delete scheduledTimers[id];

    };
    idbSaveActiveTimer(bgTimer);
    startBgTimerEngine();
  }


  // ── Pause background timer ────────────────────────────────────────────────
  if (type === 'PAUSE_BACKGROUND_TIMER') {
    const { pausedRemaining, taskName, isResting } = data;
    stopBgTimerEngine();
    if (bgTimer) {
      bgTimer.pausedRemaining = pausedRemaining;
      bgTimer.startTimestamp = Date.now();
      bgTimer.isPaused = true;
      bgTimer.visibleStarted = false;
      idbSaveActiveTimer(bgTimer);
    }
    // Show paused notification immediately
    const emoji = isResting ? '🌴' : '⏱️';
    const absR = Math.abs(Math.round(pausedRemaining));
    const m = String(Math.floor(absR / 60)).padStart(2, '0');
    const s = String(absR % 60).padStart(2, '0');
    self.registration.showNotification(`${emoji} ${taskName} ⏸`, {
      body: `${m}:${s} — pausado`,
      icon: '/images/logo.png',
      badge: '/images/logo.png',
      tag: ACTIVE_TIMER_TAG,
      requireInteraction: true,
      silent: false,
      renotify: true,
      vibrate: [120, 60, 120],
      priority: 'high',
      data: bgTimer?.data || { url: '/', isPersistentTimer: true },
      ongoing: true,
      actions: [{ action: 'open', title: '▶ Abrir App' }],
    });
  }

  // ── Resume background timer ───────────────────────────────────────────────
  if (type === 'RESUME_BACKGROUND_TIMER') {
    const { taskName, startTimestamp, pausedRemaining, isResting, soundUrl, playSound } = data;
    bgTimer = {
      taskName,
      startTimestamp,
      pausedRemaining,
      isResting: !!isResting,
      soundUrl: soundUrl || '',
      playSound: !!playSound,
      isPaused: false,
      data: data.data || { url: '/', isPersistentTimer: true },
      completionFired: false,
      visibleStarted: false,
    };
    idbSaveActiveTimer(bgTimer);
    startBgTimerEngine();
  }

  // ── Stop background timer ─────────────────────────────────────────────────
  if (type === 'STOP_BACKGROUND_TIMER') {
    bgTimer = null;
    stopBgTimerEngine();
    idbClearActiveTimer();
  }

  // ── Schedule reminder (absolute time, persisted to IndexedDB) ────────────
  if (type === 'SCHEDULE_NOTIFICATION') {
    const { id, delay, fireAtMs: providedFireAtMs, title, body, vibrate, tag, playSound, soundUrl } = data;
    const fireAtMs = providedFireAtMs || (Date.now() + (delay || 0));
    const delayMs = Math.max(0, fireAtMs - Date.now());

    // Remove any existing with same id
    if (scheduledReminders[id]) delete scheduledReminders[id];

    const reminder = { id, fireAtMs, title, body, vibrate, tag, playSound, soundUrl, data: data.data };

    if (delayMs <= 0) {
      fireReminder(reminder);
      return;
    }

    // Persist to IndexedDB so it survives SW restart
    idbSave(reminder);

    scheduledReminders[id] = reminder;
    startReminderPoller();

    // Also set a setTimeout as the most precise fast path
    setTimeout(() => {
      if (scheduledReminders[id]) {
        fireReminder(scheduledReminders[id]);
        delete scheduledReminders[id];
        idbDelete(id);
      }
    }, delayMs);
  }

  // ── Persistent live timer notification (main thread updates) ─────────────
  if (type === 'START_PERSISTENT_TIMER') {
    const { taskName, timeDisplay, isResting } = data;
    showPersistentTimerDirect(taskName, timeDisplay, isResting, false);
  }

  if (type === 'UPDATE_PERSISTENT_TIMER') {
    const { taskName, timeDisplay, isResting } = data;
    showPersistentTimerDirect(taskName, timeDisplay, isResting, true);
  }

  if (type === 'STOP_PERSISTENT_TIMER') {
    bgTimer = null;
    stopBgTimerEngine();
    idbClearActiveTimer();
    self.registration.getNotifications({ tag: ACTIVE_TIMER_TAG }).then((notifs) => {

    const nextDelay = targetTimestamp ? Math.max(0, targetTimestamp - Date.now()) : delay;

    if (nextDelay <= 0) {
      fireNotification();
      return;
    }

    scheduledTimers[id] = setTimeout(fireNotification, nextDelay);
  }

  // ── Persistent live timer notification ─────────────────────────────────────
  if (type === 'START_PERSISTENT_TIMER') {
    const { taskName, timeDisplay, isResting, routineId } = data;
    const promise = showPersistentTimer(taskName, timeDisplay, isResting, false, routineId);
    if (event.waitUntil) event.waitUntil(promise);
  }

  if (type === 'UPDATE_PERSISTENT_TIMER') {
    const { taskName, timeDisplay, isResting, routineId } = data;
    const promise = showPersistentTimer(taskName, timeDisplay, isResting, true, routineId);
    if (event.waitUntil) event.waitUntil(promise);
  }

  if (type === 'STOP_PERSISTENT_TIMER') {
    self.registration.getNotifications({ tag: activeTimerTag }).then((notifs) => {
      
      notifs.forEach((n) => n.close());
    });
  }


  // ── Sound ─────────────────────────────────────────────────────────────────
  if (type === 'PLAY_SOUND' && data.soundUrl) {
    playAudioInSW(data.soundUrl);
  }

  // ── Cancel one reminder ───────────────────────────────────────────────────

  // ── Sound only ─────────────────────────────────────────────────────────────
  if (type === 'PLAY_SOUND') {
    if (data.soundUrl) {
      playAudioInSW(data.soundUrl);
    }
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────

  if (type === 'CANCEL_NOTIFICATION') {
    const { id, tag } = data;
    if (id && scheduledReminders[id]) {
      delete scheduledReminders[id];
      idbDelete(id);
    }
    if (tag) {
      self.registration.getNotifications({ tag }).then((ns) => ns.forEach((n) => n.close()));
    }
  }

  // ── Cancel all timer notifications ────────────────────────────────────────
  if (type === 'CANCEL_ALL') {
    Object.keys(scheduledReminders).forEach((id) => {
      if (!id.startsWith('reminder-')) {
        delete scheduledReminders[id];
        idbDelete(id);
      }
    });

    bgTimer = null;
    stopBgTimerEngine();
    idbClearActiveTimer();
    self.registration.getNotifications().then((ns) => {
      ns.forEach((n) => n.close());
    });
  }

  // ── Cancel routine reminders ──────────────────────────────────────────────
  if (type === 'CANCEL_REMINDERS') {
    Object.keys(scheduledReminders).forEach((id) => {
      if (id.startsWith('reminder-')) {
        delete scheduledReminders[id];
        idbDelete(id);

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
    self.registration.getNotifications().then((ns) => {
      ns.forEach((n) => {
        if (String(n.tag).startsWith('reminder-')) n.close();
      });
    });
  }
});


// ── Persistent timer notification (direct, from main thread) ─────────────────
function showPersistentTimerDirect(taskName, timeDisplay, isResting, silent) {
  const emoji = isResting ? '🌴' : '⏱️';
  void showActiveTimerNotification(`${emoji} ${taskName}`, {
    body: timeDisplay,

async function showPersistentTimer(taskName, timeDisplay, isResting, silent, routineId) {
  const emoji = isResting ? '🌴' : '⏱️';
  const title = `${emoji} ${taskName}`;
  const body = timeDisplay;
  const url = routineId ? `/?routineId=${encodeURIComponent(routineId)}&timer=1` : '/';
  const existing = await self.registration.getNotifications({ tag: activeTimerTag });
  existing.forEach((notification) => notification.close());

  await self.registration.showNotification(title, {
    body,

    icon: '/images/logo.png',
    badge: '/images/logo.png',
    tag: ACTIVE_TIMER_TAG,
    requireInteraction: true,
    silent: !!silent,
    renotify: !silent,
    vibrate: silent ? [] : [100, 50, 100],

    priority: 'high',
    data: { url: '/', isPersistentTimer: true },

    data: { url, routineId, openTimer: true, isPersistentTimer: true },

    ongoing: true,
    actions: [{ action: 'open', title: '▶ Abrir App' }],
  });
}


// ── Audio: forward to open window clients ─────────────────────────────────────
async function playAudioInSW(soundUrl) {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: 'PLAY_COMPLETION_SOUND', soundUrl }));

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
    console.error('[SW] playAudioInSW error:', e);
  }
}

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const url = notifData.url || '/';



  const notifData = event.notification.data || {};
  const url = notifData.url || '/';


  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();

          client.postMessage({ type: 'NOTIFICATION_CLICKED', url, notifData });

          if (notifData.openTimer || notifData.isPersistentTimer || event.action === 'open') {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              url,
              routineId: notifData.routineId,
              openTimer: !!notifData.openTimer,
            });
          }

          return;
        }
      }
      // No window open — open a new one
      return self.clients.openWindow(url);
    })
  );
});



self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'PlanLizz';
  const data = payload.data || { url: '/' };
  const promise = self.registration.showNotification(title, {
    body: payload.body || '',
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: payload.tag || 'planlizz-reminder',
    requireInteraction: true,
    renotify: true,
    silent: false,
    data,
    actions: [{ action: 'open', title: '▶ Abrir App' }],
  });

  event.waitUntil(promise);
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

