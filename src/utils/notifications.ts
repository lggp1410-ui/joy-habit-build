import { Routine } from '@/types/routine';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

interface NotificationOptions {
  body: string;
  icon?: string;
  tag?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
}

/**
 * Show a notification via Service Worker (works in background) with fallback to new Notification().
 */
export async function showNotification(
  title: string,
  body: string,
  options?: Partial<NotificationOptions>
): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notifOptions: globalThis.NotificationOptions & {
    vibrate?: number[];
    requireInteraction?: boolean;
    data?: unknown;
  } = {
    body,
    icon: options?.icon || '/images/logo.png',
    badge: '/images/logo.png',
    tag: options?.tag,
    vibrate: options?.vibrate || [200, 100, 200],
    requireInteraction: options?.requireInteraction ?? false,
  };

  try {
    const reg = await getTimerSW();
    if (reg) {
      await reg.showNotification(title, {
        ...notifOptions,
        data: { url: '/' },
      });
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

export async function getTimerSW(): Promise<ServiceWorkerRegistration | null> {
  if (timerSWRegistration?.active) return timerSWRegistration;
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const found =
      registrations.find((r) => r.active?.scriptURL.includes('timer-sw.js')) || null;
    if (found) timerSWRegistration = found;
    return found;
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

// ── Persistent timer notification (non-dismissable) ────────────────────────

/**
 * Start a persistent non-dismissable notification for the active timer task.
 * Call this when the timer screen opens.
 */
export async function startPersistentTimerNotification(
  taskName: string,
  timeDisplay: string,
  isResting: boolean
): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  await postToTimerSW({
    type: 'START_PERSISTENT_TIMER',
    taskName,
    timeDisplay,
    isResting,
  });
}

/**
 * Update the persistent timer notification with the current countdown.
 * Call this every second while the timer is running.
 */
export async function updatePersistentTimerNotification(
  taskName: string,
  timeDisplay: string,
  isResting: boolean
): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  await postToTimerSW({
    type: 'UPDATE_PERSISTENT_TIMER',
    taskName,
    timeDisplay,
    isResting,
  });
}

/**
 * Stop and close the persistent timer notification.
 * Call this when the timer is closed/completed.
 */
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
  options?: { playSound?: boolean; soundUrl?: string }
): Promise<void> {
  const sent = await postToTimerSW({
    type: 'SCHEDULE_NOTIFICATION',
    id,
    delay: delayMs,
    title,
    body,
    vibrate: [200, 100, 200, 100, 200],
    tag: tag || 'timer-task',
    requireInteraction: true,
    playSound: options?.playSound || false,
    soundUrl: options?.soundUrl || '',
  });
  if (!sent) {
    console.warn('[Notifications] Failed to schedule notification via SW for:', title);
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

// ── Routine reminder scheduling ────────────────────────────────────────────

const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleRoutineReminder(routine: Routine): void {
  if (!routine.reminder || !routine.time) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Clear any existing timer for this routine
  const existing = scheduledTimers.get(routine.id);
  if (existing) clearTimeout(existing);

  const [hours, minutes] = routine.time.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);

  // Skip if already past (within a 2-minute grace window)
  if (target.getTime() <= now.getTime() - 2 * 60 * 1000) return;

  // If it's within the next 2 minutes and already past, fire immediately
  const delay = Math.max(0, target.getTime() - now.getTime());

  const isMoment = routine.type === 'moment';
  const title = isMoment ? `⭐ ${routine.name}` : `💐 ${routine.name}`;
  const body = isMoment
    ? `Está na hora de começar ${routine.name}! Toque para iniciar o momento! ⭐`
    : `Está na hora de começar ${routine.name}! Toque para iniciar a rotina! 💐`;

  // Schedule via Service Worker for background delivery (primary)
  scheduleTimerNotification(`reminder-${routine.id}`, delay, title, body, `reminder-${routine.id}`);

  // Fallback: local setTimeout (only fires when page is open)
  const timer = setTimeout(() => {
    showNotification(title, body, {
      tag: `reminder-${routine.id}`,
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
    });
    scheduledTimers.delete(routine.id);
  }, delay);

  scheduledTimers.set(routine.id, timer);
}

export function clearAllReminders(): void {
  scheduledTimers.forEach((timer) => clearTimeout(timer));
  scheduledTimers.clear();
  // Cancel reminder notifications in SW without touching the active timer notification
  postToTimerSW({ type: 'CANCEL_REMINDERS' });
}

export function showTimerNotification(taskName: string, isRunning: boolean): void {
  showNotification(
    isRunning ? `⏱️ ${taskName}` : `✅ ${taskName}`,
    isRunning ? 'Timer em andamento' : 'Tempo esgotado!',
    {
      tag: 'active-timer',
      vibrate: isRunning ? [100] : [200, 100, 200, 100, 200],
      requireInteraction: !isRunning,
    }
  );
}
