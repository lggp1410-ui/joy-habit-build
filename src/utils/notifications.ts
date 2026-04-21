import { Routine } from '@/types/routine';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Show a notification via Service Worker (works in background) with fallback to new Notification().
 */
export async function showNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    tag?: string;
    vibrate?: number[];
    requireInteraction?: boolean;
    data?: unknown
    priority?: 'high' | 'normal' | 'low';

    actions?: { action: string; title: string }[]; 

): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notifOptions = {
    body,
    icon: options?.icon || '/images/logo.png',
    badge: '/images/logo.png',
    tag: options?.tag;
    vibrate: options?.vibrate || [300, 100, 300, 100, 300, 100, 400],
    requireInteraction: options?.requireInteraction ?? true,
    silent: false,
    renotify: true,
    priority: options?.priority || 'high',
    data: options?.data ?? { url: '/' },

    vibrate: options?.vibrate || [300, 100, 300, 100, 300],
    requireInteraction: options?.requireInteraction ?? true,
    silent: false,
    renotify: true,
    data: options?.data ?? { url: '/' },
    actions: options?.actions,
      
  };

  try {
    const reg = await getTimerSW();
    if (reg) {
      await reg.showNotification(title, notifOptions);
      return;
    }
  } catch (e) {
    console.warn('[Notifications] SW showNotification failed, using fallback:', e);
  }

  try {
    new Notification(title, notifOptions as globalThis.NotificationOptions);
  } catch {
    // ignore
  }
}

// --- Service Worker helpers ---

let timerSWRegistration: ServiceWorkerRegistration | null = null;
const ACTIVE_TIMER_TAG = 'active-timer';

async function waitForServiceWorkerReady(timeoutMs = 2000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

async function waitForActiveRegistration(
  reg: ServiceWorkerRegistration,
  timeoutMs = 5000
): Promise<ServiceWorkerRegistration | null> {
  if (reg.active) return reg;

  const sw = reg.installing || reg.waiting;
  if (!sw) return reg.active ? reg : null;

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(reg.active ? reg : null), timeoutMs);
    sw.addEventListener('statechange', () => {
      if (sw.state === 'activated') {
        window.clearTimeout(timeout);
        resolve(reg);
      }
    });
  });
}

export async function getTimerSW(): Promise<ServiceWorkerRegistration | null> {
  if (timerSWRegistration?.active) return timerSWRegistration;
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const found =
      registrations.find((r) => r.active?.scriptURL.includes('timer-sw.js')) || null;

    if (found) {
      const active = await waitForActiveRegistration(found);
      if (active) timerSWRegistration = active;
      return active;
    }

    const reg = await navigator.serviceWorker.register('/timer-sw.js');
    const active = await waitForActiveRegistration(reg);
    if (active) timerSWRegistration = active;
    return active;

    if (found?.active) {
      timerSWRegistration = found;
      return found;
    }

    const ready = await waitForServiceWorkerReady();
    if (ready?.active?.scriptURL.includes('timer-sw.js')) {
      timerSWRegistration = ready;
      return ready;
    }

    return null;

  } catch {
    return null;
  }
}

export function setTimerSWRegistration(reg: ServiceWorkerRegistration) {
  timerSWRegistration = reg;
}

export async function postToTimerSW(message: Record<string, unknown>): Promise<boolean> {
  const reg = await getTimerSW();
  const sw = reg?.active;
  if (sw) {
    sw.postMessage(message);
    return true;
  }
  console.warn('[Notifications] No active Service Worker to post message to');
  return false;
}

async function scheduleNativeTimestampNotification(
  fireAtMs: number,
  title: string,
  body: string,
  tag: string,
  vibrate: number[],
  data: unknown
): Promise<boolean> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  if (!('TimestampTrigger' in window)) return false;

  try {
    const reg = await getTimerSW();
    if (!reg) return false;
    const TimestampTriggerCtor = (window as unknown as { TimestampTrigger: new (time: number) => unknown }).TimestampTrigger;
    await reg.showNotification(title, {
      body,
      icon: '/images/logo.png',
      badge: '/images/logo.png',
      tag,
      vibrate,
      requireInteraction: true,
      silent: false,
      renotify: true,
      data,
      showTrigger: new TimestampTriggerCtor(fireAtMs),
    } as NotificationOptions & { showTrigger: unknown });
    return true;
  } catch (e) {
    console.warn('[Notifications] Native scheduled notification failed:', e);
    return false;
  }
}

// ── Background timer registration (SW tracks timer independently) ───────────

export async function registerBackgroundTimer(
  taskName: string,
  startTimestamp: number,
  pausedRemaining: number,
  isResting: boolean,
  soundUrl: string,
  playSound: boolean,
  data?: unknown
): Promise<void> {
  await postToTimerSW({
    type: 'REGISTER_BACKGROUND_TIMER',
    taskName,
    startTimestamp,
    pausedRemaining,
    isResting,
    soundUrl,
    playSound,
    data,
  });
}

export async function pauseBackgroundTimer(
  taskName: string,
  pausedRemaining: number,
  isResting: boolean,
  data?: unknown
): Promise<void> {
  await postToTimerSW({
    type: 'PAUSE_BACKGROUND_TIMER',
    taskName,
    pausedRemaining,
    isResting,
    data,
  });
}

export async function resumeBackgroundTimer(
  taskName: string,
  startTimestamp: number,
  pausedRemaining: number,
  isResting: boolean,
  soundUrl: string,
  playSound: boolean,
  data?: unknown
): Promise<void> {
  await postToTimerSW({
    type: 'RESUME_BACKGROUND_TIMER',
    taskName,
    startTimestamp,
    pausedRemaining,
    isResting,
    soundUrl,
    playSound,
    data,
  });
}

export async function stopBackgroundTimer(): Promise<void> {
  await postToTimerSW({ type: 'STOP_BACKGROUND_TIMER' });
}

// ── Persistent timer notification (non-dismissable) ────────────────────────



async function showPersistentTimerStatus(
  taskName: string,
  timeDisplay: string,
  isResting: boolean,
  silent: boolean,
  routineId?: string
): Promise<void> {
  const url = routineId ? `/?routineId=${encodeURIComponent(routineId)}&timer=1` : '/';
  const title = `${isResting ? '🌴' : '⏱️'} ${taskName}`;
  const options = {
    body: timeDisplay,
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    tag: ACTIVE_TIMER_TAG,
    requireInteraction: true,
    silent,
    renotify: !silent,
    vibrate: silent ? [] : [100, 50, 100],
    data: { url, routineId, openTimer: true, isPersistentTimer: true },
    ongoing: true,
    actions: [{ action: 'open', title: '▶ Abrir App' }],
  } as NotificationOptions;

  try {
    const reg = await getTimerSW();
    if (reg) {
      const existing = await reg.getNotifications({ tag: ACTIVE_TIMER_TAG });
      existing.forEach((notification) => notification.close());
      await reg.showNotification(title, options);
      return;
    }
  } catch (e) {
    console.warn('[Notifications] Persistent timer notification failed:', e);
  }

  try {
    new Notification(title, options);
  } catch {}
}


export async function startPersistentTimerNotification(
  taskName: string,
  timeDisplay: string,
  isResting: boolean,
  routineId?: string
): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const sent = await postToTimerSW({
    type: 'START_PERSISTENT_TIMER',
    taskName,
    timeDisplay,
    isResting,
    routineId,
  });
  if (sent) return;
  await showPersistentTimerStatus(taskName, timeDisplay, isResting, false, routineId);
}

export async function updatePersistentTimerNotification(
  taskName: string,
  timeDisplay: string,
  isResting: boolean,
  routineId?: string
): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const sent = await postToTimerSW({
    type: 'UPDATE_PERSISTENT_TIMER',
    taskName,
    timeDisplay,
    isResting,
    routineId,
  });
  if (sent) return;
  await showPersistentTimerStatus(taskName, timeDisplay, isResting, true, routineId);
}

export async function stopPersistentTimerNotification(): Promise<void> {
  await postToTimerSW({ type: 'STOP_PERSISTENT_TIMER' });
}

// ── Scheduled (one-shot) notifications ────────────────────────────────────

export async function scheduleTimerNotification(
  id: string,
  delayMs: number,
  title: string,
  body: string,
  tag?: string,

  options?: { playSound?: boolean; soundUrl?: string; data?: unknown }

  options?: { playSound?: boolean; soundUrl?: string; data?: unknown; targetTimestamp?: number }

): Promise<void> {
  const fireAtMs = Date.now() + delayMs;
  const tagValue = tag || 'timer-task';
  const vibrate = [300, 100, 300, 100, 300, 100, 400];
  const notificationData = options?.data ?? { url: '/' };

  void scheduleNativeTimestampNotification(
    fireAtMs,
    title,
    body,
    tagValue,
    vibrate,
    notificationData
  );

  const sent = await postToTimerSW({
    type: 'SCHEDULE_NOTIFICATION',
    id,
    delay: delayMs,
    fireAtMs,
    title,
    body,

    vibrate,
    tag: tagValue,

    vibrate: [300, 100, 300, 100, 300, 100, 300],
    tag: tag || 'timer-task',

    requireInteraction: true,
    priority: 'high',
    playSound: options?.playSound || false,
    soundUrl: options?.soundUrl || '',

    data: notificationData,

    data: options?.data ?? { url: '/' },
    targetTimestamp: options?.targetTimestamp,

  });
  if (!sent) {
    setTimeout(() => {
      showNotification(title, body, {

        tag: tagValue,
        vibrate,
        requireInteraction: true,
        data: notificationData,
        priority: 'high',

        tag: tag || 'timer-task',
        vibrate: [300, 100, 300, 100, 300],
        requireInteraction: true,
        data: options?.data ?? { url: '/' },

      });
    }, delayMs);
  }
}

export async function cancelTimerNotification(id: string, tag?: string): Promise<void> {
  await postToTimerSW({
    type: 'CANCEL_NOTIFICATION',
    id,
    tag: tag || 'timer-task',
  });
}

export async function cancelAllTimerNotifications(): Promise<void> {
  await postToTimerSW({ type: 'CANCEL_ALL' });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function enableClosedAppPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;

  try {
    const keyRes = await fetch('/api/push/vapid-public-key', { credentials: 'include' });
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json() as { publicKey?: string };
    if (!publicKey) return false;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const saveRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(subscription),
    });

    return saveRes.ok;
  } catch (err) {
    console.warn('Closed-app push subscription failed:', err);
    return false;
  }
}

// ── Routine reminder scheduling ────────────────────────────────────────────

const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>();


/**
 * Schedule a reminder for a routine at its next occurrence.
 * dayLabels: ordered array of day abbreviations starting from Sunday,
 * e.g. ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'] for pt-BR.
 * This matches routine.days which stores the same abbreviations.
 */
export function scheduleRoutineReminder(routine: Routine, dayLabels: string[]): void {
  if (!routine.reminder || !routine.time) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const existing = scheduledTimers.get(routine.id);
  if (existing) clearTimeout(existing);

  const [hours, minutes] = routine.time.split(':').map(Number);
  const now = new Date();

  // Find the next occurrence within the next 7 days
  for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
    const target = new Date(now);
    target.setDate(now.getDate() + daysAhead);
    target.setHours(hours, minutes, 0, 0);

    // Skip if this target is already in the past (more than 1 minute ago)
    if (target.getTime() < now.getTime() - 60 * 1000) continue;

    // Check if this day matches the routine's scheduled days
    const dayIdx = target.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const dayLabel = dayLabels[dayIdx];
    const dayMatches = routine.days.length === 0 || routine.days.includes(dayLabel);

    if (!dayMatches) continue;

    const delay = Math.max(0, target.getTime() - now.getTime());
    const isMoment = routine.type === 'moment';
    const title = isMoment ? `⭐ ${routine.name}` : `💐 ${routine.name}`;
    const body = isMoment
      ? `Está na hora de começar ${routine.name}! Toque para iniciar o momento! ⭐`
      : `Está na hora de começar ${routine.name}! Toque para iniciar a rotina! 💐`;

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getReminderContent(routine: Routine) {
  const isMoment = routine.type === 'moment';
  const title = isMoment ? `⭐ ${routine.name}` : `💐 ${routine.name}`;
  const body = isMoment
    ? `Está na hora de começar ${routine.name}! Toque para iniciar o momento! ⭐`
    : `Está na hora de começar ${routine.name}! Toque para iniciar a rotina! 💐`;
  const data = {
    url: `/?routineId=${encodeURIComponent(routine.id)}&timer=1`,
    routineId: routine.id,
    openTimer: true,
    type: isMoment ? 'moment-reminder' : 'routine-reminder',
  };

  return { title, body, data };
}

function getNextReminderTarget(routine: Routine, dayLabels: string[], from = new Date()): Date | null {
  if (!routine.reminder || !routine.time) return null;
  const [hours, minutes] = routine.time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
    const target = new Date(from);
    target.setDate(from.getDate() + daysAhead);
    target.setHours(hours, minutes, 0, 0);

    if (target.getTime() < from.getTime() - 60 * 1000) continue;

    const dayLabel = dayLabels[target.getDay()];
    const dayMatches = routine.days.length === 0 || routine.days.includes(dayLabel);
    if (dayMatches) return target;
  }

  return null;
}

function getCurrentReminderTarget(routine: Routine, dayLabels: string[], now = new Date()): Date | null {
  if (!routine.reminder || !routine.time) return null;
  const [hours, minutes] = routine.time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  const dayLabel = dayLabels[target.getDay()];
  const dayMatches = routine.days.length === 0 || routine.days.includes(dayLabel);
  if (!dayMatches) return null;

  return target;
}

async function fireRoutineReminder(routine: Routine, target: Date): Promise<void> {
  const firedKey = `planlizz-reminder-fired-${routine.id}-${getDateKey(target)}-${routine.time}`;
  if (localStorage.getItem(firedKey) === '1') return;

  localStorage.setItem(firedKey, '1');
  const { title, body, data } = getReminderContent(routine);
  await showNotification(title, body, {
    tag: `reminder-${routine.id}`,
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    data,
    actions: [{ action: 'open', title: '▶ Abrir App' }],
  });
}

/**
 * Schedule a reminder for a routine at its next occurrence.
 * dayLabels: ordered array of day abbreviations starting from Sunday,
 * e.g. ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'] for pt-BR.
 * This matches routine.days which stores the same abbreviations.
 */
export function scheduleRoutineReminder(routine: Routine, dayLabels: string[]): void {
  if (!routine.reminder || !routine.time) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const existing = scheduledTimers.get(routine.id);
  if (existing) clearTimeout(existing);

  const now = new Date();
  const target = getNextReminderTarget(routine, dayLabels, now);
  if (!target) return;

  const delay = Math.max(0, target.getTime() - now.getTime());
  const { title, body, data } = getReminderContent(routine);

  scheduleTimerNotification(
    `reminder-${routine.id}`,
    delay,
    title,
    body,
    `reminder-${routine.id}`,
    { data, targetTimestamp: target.getTime() }
  );

  const timer = setTimeout(() => {
    fireRoutineReminder(routine, target);
    scheduledTimers.delete(routine.id);
  }, delay);


    // Primary: schedule via Service Worker for background delivery
    void scheduleTimerNotification(
      `reminder-${routine.id}`,
      delay,
      title,
      body,
      `reminder-${routine.id}`,
      {
        data: {
          url: `/?routineId=${encodeURIComponent(routine.id)}`,
          type: 'reminder',
          routineId: routine.id,
        },
      }
    );

    // Fallback: setTimeout for when the app is open
    const timer = setTimeout(() => {
      showNotification(title, body, {
        tag: `reminder-${routine.id}`,
        vibrate: [300, 100, 300, 100, 300, 100, 400],
        requireInteraction: true,
        data: {
          url: `/?routineId=${encodeURIComponent(routine.id)}`,
          type: 'reminder',
          routineId: routine.id,
        },
        priority: 'high',
      });
      scheduledTimers.delete(routine.id);
      // Re-schedule for next occurrence after this one fires
      scheduleRoutineReminder(routine, dayLabels);
    }, delay);

    scheduledTimers.set(routine.id, timer);
    break;
  }
}

export function checkDueRoutineReminders(routines: Routine[], dayLabels: string[]): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  routines.forEach((routine) => {
    const target = getCurrentReminderTarget(routine, dayLabels, now);
    if (!target) return;

    const diff = now.getTime() - target.getTime();
    if (diff >= 0 && diff <= 2 * 60 * 1000) {
      fireRoutineReminder(routine, target);
    }
  });
}

export function clearAllReminders(): void {
  scheduledTimers.forEach((timer) => clearTimeout(timer));
  scheduledTimers.clear();
  postToTimerSW({ type: 'CANCEL_REMINDERS' });
}
