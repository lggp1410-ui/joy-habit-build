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

export function showNotification(title: string, body: string, options?: Partial<NotificationOptions>): Notification | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') return null;
  try {
    const notifOptions: Record<string, unknown> = {
      body,
      icon: options?.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: options?.tag,
      vibrate: options?.vibrate || [200, 100, 200],
      requireInteraction: options?.requireInteraction ?? false,
    };
    return new Notification(title, notifOptions as globalThis.NotificationOptions);
  } catch {
    return null;
  }
}

// --- Service Worker helpers ---

let timerSWRegistration: ServiceWorkerRegistration | null = null;

export async function getTimerSW(): Promise<ServiceWorkerRegistration | null> {
  if (timerSWRegistration) return timerSWRegistration;
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    timerSWRegistration = registrations.find(r => r.active?.scriptURL.includes('timer-sw.js')) || null;
    return timerSWRegistration;
  } catch {
    return null;
  }
}

export function setTimerSWRegistration(reg: ServiceWorkerRegistration) {
  timerSWRegistration = reg;
}

export async function postToTimerSW(message: Record<string, unknown>): Promise<void> {
  const reg = await getTimerSW();
  const sw = reg?.active;
  if (sw) {
    sw.postMessage(message);
  }
}

export async function scheduleTimerNotification(
  id: string,
  delayMs: number,
  title: string,
  body: string,
  tag?: string
): Promise<void> {
  await postToTimerSW({
    type: 'SCHEDULE_NOTIFICATION',
    id,
    delay: delayMs,
    title,
    body,
    vibrate: [200, 100, 200, 100, 200],
    tag: tag || 'timer-task',
    requireInteraction: true,
  });
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

// --- Routine reminder scheduling ---

const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleRoutineReminder(routine: Routine): void {
  if (!routine.reminder || !routine.time) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const existing = scheduledTimers.get(routine.id);
  if (existing) clearTimeout(existing);

  const [hours, minutes] = routine.time.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);

  if (target.getTime() <= now.getTime()) return;

  const delay = target.getTime() - now.getTime();
  const isMoment = routine.type === 'moment';
  const title = isMoment ? `⭐ ${routine.name}` : `💐 ${routine.name}`;
  const body = isMoment
    ? `Está na hora de começar ${routine.name}! Toque para iniciar o momento! ⭐`
    : `Está na hora de começar ${routine.name}! Toque para iniciar a rotina! 💐`;

  // Schedule via Service Worker for background delivery
  scheduleTimerNotification(
    `reminder-${routine.id}`,
    delay,
    title,
    body,
    `reminder-${routine.id}`
  );

  // Also keep a local fallback
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
  scheduledTimers.forEach(timer => clearTimeout(timer));
  scheduledTimers.clear();
}

export function showTimerNotification(taskName: string, isRunning: boolean): Notification | null {
  return showNotification(
    isRunning ? `⏱️ ${taskName}` : `✅ ${taskName}`,
    isRunning ? 'Timer em andamento' : 'Tempo esgotado!',
    {
      tag: 'active-timer',
      vibrate: isRunning ? [100] : [200, 100, 200, 100, 200],
      requireInteraction: !isRunning,
    }
  );
}
