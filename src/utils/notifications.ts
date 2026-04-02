import { Routine } from '@/types/routine';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showNotification(title: string, body: string, icon?: string): Notification | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') return null;
  try {
    return new Notification(title, { body, icon: icon || '/favicon.ico', badge: '/favicon.ico' });
  } catch {
    return null;
  }
}

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
  const timer = setTimeout(() => {
    const isMoment = routine.type === 'moment';
    const title = isMoment ? `⭐ ${routine.name}` : `💐 ${routine.name}`;
    const body = isMoment
      ? `Está na hora de começar ${routine.name}! Toque para iniciar o momento! ⭐`
      : `Está na hora de começar ${routine.name}! Toque para iniciar a rotina! 💐`;
    showNotification(title, body);
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
    isRunning ? 'Timer em andamento' : 'Tempo esgotado!'
  );
}
