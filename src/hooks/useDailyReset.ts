import { useEffect, useRef } from 'react';
import { useRoutineStore } from '@/stores/routineStore';

const LAST_RESET_KEY = 'planlizz-last-reset';

// Day labels map — must match HomeScreen's WEEKDAY_LABELS_PT
const DAY_LABELS_MAP: Record<string, string[]> = {
  'pt-BR': ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  'en':    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  'fr':    ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  'ja':    ['日', '月', '火', '水', '木', '金', '土'],
  'ko':    ['일', '월', '화', '수', '목', '금', '토'],
};

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDayLabel(date: Date, lang: string): string {
  const labels = DAY_LABELS_MAP[lang] || DAY_LABELS_MAP['en'];
  return labels[date.getDay()];
}

/**
 * Resets task completion for all routines scheduled to run on the given day.
 * Preserves completionDates (historical data) — only clears the `completed` flag.
 * Skips moments (they're archived separately when done).
 */
function resetDayRoutines(date: Date, lang: string): void {
  const dayLabel = getDayLabel(date, lang);
  const store = useRoutineStore.getState();

  store.routines.forEach((r) => {
    if (r.archived) return;
    if (r.type === 'moment') return; // moments handled by archive logic

    const runsToday = r.days.length === 0 || r.days.includes(dayLabel);
    if (runsToday) {
      store.resetRoutineTasks(r.id);
    }
  });

  localStorage.setItem(LAST_RESET_KEY, getDateKey(date));
  console.log(`[DailyReset] Reset routines for ${dayLabel} (${getDateKey(date)})`);
}

/**
 * Hook that:
 * 1. On mount — if we haven't reset yet today, resets today's routines
 * 2. Every minute at midnight — resets routines for the new day
 */
export function useDailyReset(lang: string) {
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    const today = new Date();
    const todayKey = getDateKey(today);
    const lastReset = localStorage.getItem(LAST_RESET_KEY);

    // Only reset on first open of a new day
    if (lastReset !== todayKey) {
      resetDayRoutines(today, langRef.current);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        const todayKey = getDateKey(now);
        const lastReset = localStorage.getItem(LAST_RESET_KEY);
        if (lastReset !== todayKey) {
          resetDayRoutines(now, langRef.current);
        }
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);
}
