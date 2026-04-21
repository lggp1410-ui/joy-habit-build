import { Plus, List, Star, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRoutineStore } from '@/stores/routineStore';
import { RoutineCard } from '@/components/RoutineCard';
import { RoutineDetail } from '@/components/RoutineDetail';
import { useState, useEffect, useMemo } from 'react';

import { requestNotificationPermission, scheduleRoutineReminder, clearAllReminders } from '@/utils/notifications';

import { requestNotificationPermission, scheduleRoutineReminder, clearAllReminders, checkDueRoutineReminders, enableClosedAppPushNotifications } from '@/utils/notifications';

import { useDailyReset } from '@/hooks/useDailyReset';

function useCurrentDate() {
  const [date, setDate] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  return date;
}

const WEEKDAY_LABELS_PT: Record<string, string[]> = {
  'pt-BR': ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  'en': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  'fr': ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  'ja': ['日', '月', '火', '水', '木', '金', '土'],
  'ko': ['일', '월', '화', '수', '목', '금', '토']
};

function getWeekDays(today: Date) {
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

export function HomeScreen() {
  const { routines, setShowCreateModal, activeRoutineId, showCreateMenu, setShowCreateMenu, setCreateType, homeFilter, setHomeFilter, setActiveTab, archiveRoutine } = useRoutineStore();
  const { t, i18n } = useTranslation();
  const currentDate = useCurrentDate();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [showAllRoutines, setShowAllRoutines] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate.toDateString()]);
  const lang = i18n.language;
  const dayLabels = WEEKDAY_LABELS_PT[lang] || WEEKDAY_LABELS_PT['en'];

  // Daily reset: resets task completion at midnight and on first app open each day
  useDailyReset(lang);

  const locale = lang === 'pt-BR' ? 'pt-BR' : lang === 'fr' ? 'fr-FR' : lang === 'ja' ? 'ja-JP' : lang === 'ko' ? 'ko-KR' : 'en-US';
  const weekdayName = currentDate.toLocaleDateString(locale, { weekday: 'long' });

  const todayIndex = weekDays.findIndex(d => d.toDateString() === currentDate.toDateString());

  // Auto-archive moments at day change
  useEffect(() => {
    const now = new Date();
    routines.forEach(r => {
      if (r.type === 'moment' && !r.archived && r.days.length === 0) {
        const allDone = r.tasks.length > 0 && r.tasks.every(t => t.completed);
        if (allDone) {
          archiveRoutine(r.id);
        }
      }
    });

    const interval = setInterval(() => {
      const current = new Date();
      if (current.getHours() === 0 && current.getMinutes() === 0) {
        const store = useRoutineStore.getState();
        store.routines.forEach(r => {
          if (r.type === 'moment' && !r.archived && r.days.length === 0) {
            store.archiveRoutine(r.id);
          }
        });
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [routines.length]);



  const filteredRoutines = useMemo(() => {
    let filtered = routines.filter(r => !r.archived);

    // Type filter
    if (homeFilter === 'routines') {
      filtered = filtered.filter(r => (r.type || 'routine') === 'routine');
    } else if (homeFilter === 'moments') {
      filtered = filtered.filter(r => r.type === 'moment');
    }

    if (showAllRoutines) return filtered;
    const dayIdx = selectedDayIndex ?? todayIndex;
    if (dayIdx < 0) return filtered;
    const dayLabel = dayLabels[dayIdx];
    return filtered.filter(r => r.days.length === 0 || r.days.some(d => d === dayLabel));
  }, [routines, selectedDayIndex, todayIndex, dayLabels, showAllRoutines, homeFilter]);

  // Schedule push notifications for all reminder routines (next occurrence)
  useEffect(() => {
    const reminderRoutines = routines.filter(r => !r.archived && r.reminder && r.time);
    if (reminderRoutines.length === 0) return;

        

    let interval: ReturnType<typeof setInterval> | null = null;


    requestNotificationPermission().then(granted => {
      if (!granted) return;
      clearAllReminders();
      reminderRoutines.forEach(r => {
        scheduleRoutineReminder(r, dayLabels);
      });
      enableClosedAppPushNotifications();
      checkDueRoutineReminders(reminderRoutines, dayLabels);
      interval = setInterval(() => {
        checkDueRoutineReminders(reminderRoutines, dayLabels);
      }, 1000);
    });


    return () => clearAllReminders();

    const handleWake = () => {
      checkDueRoutineReminders(reminderRoutines, dayLabels);
      clearAllReminders();
      reminderRoutines.forEach(r => {
        scheduleRoutineReminder(r, dayLabels);
      });
    };

    document.addEventListener('visibilitychange', handleWake);
    window.addEventListener('focus', handleWake);
    window.addEventListener('pageshow', handleWake);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleWake);
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('pageshow', handleWake);
      clearAllReminders();
    };

  }, [routines, dayLabels.join(',')]);

  const handleCreateOption = (type: 'routine' | 'moment') => {
    setCreateType(type);
    setShowCreateMenu(false);
    setShowCreateModal(true);
  };

  const filterLabel = homeFilter === 'all' 
    ? t('home.filterAll', 'Ver Tudo') 
    : homeFilter === 'routines' 
    ? t('home.filterRoutines', 'Rotinas') 
    : t('home.filterMoments', 'Momentos');

  return (
    <div className="min-h-screen pb-24">
      {/* Pink gradient header with calendar */}
      <div className="gradient-purple px-5 pt-12 pb-6 rounded-b-[32px] text-foreground">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-sm text-foreground/70 font-medium capitalize">{weekdayName}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter button */}
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${homeFilter !== 'all' ? 'bg-white/40' : 'bg-white/20'}`}
              >
                <SlidersHorizontal className="w-4.5 h-4.5 text-foreground" />
              </button>
              <AnimatePresence>
                {showFilterMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -5 }}
                      className="absolute right-0 top-11 z-20 bg-card rounded-xl shadow-lg border border-border py-1 min-w-[160px]"
                    >
                      {(['all', 'routines', 'moments'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => { setHomeFilter(f); setShowFilterMenu(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${homeFilter === f ? 'bg-pink-accent text-foreground font-medium' : 'hover:bg-muted'}`}
                        >
                          {f === 'all' ? t('home.filterAll', 'Ver Tudo') : f === 'routines' ? t('home.filterRoutines', 'Apenas Rotinas') : t('home.filterMoments', 'Apenas Momentos')}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Saved (star) button */}
            <button
              onClick={() => setActiveTab('saved')}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 transition-colors"
            >
              <Star className="w-5 h-5 text-foreground" />
            </button>

            {/* List button */}
            <button
              onClick={() => setShowAllRoutines(!showAllRoutines)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showAllRoutines ? 'bg-white/40' : 'bg-white/20'}`}
            >
              <List className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Horizontal week calendar */}
        <div className="flex justify-between items-center">
          {weekDays.map((day, i) => {
            const isToday = day.toDateString() === currentDate.toDateString();
            const isSelected = selectedDayIndex === i;
            return (
              <button
                key={i}
                onClick={() => { setSelectedDayIndex(i); setShowAllRoutines(false); }}
                className="flex flex-col items-center gap-1.5"
              >
                <span className="text-xs text-foreground/70 font-medium">{dayLabels[i]}</span>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isSelected ? 'bg-white text-foreground shadow-soft' :
                  isToday ? 'bg-white/30 text-foreground' : 'text-foreground/80'
                }`}>
                  {day.getDate()}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Routines list */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-display text-lg">
            {showAllRoutines ? t('home.allRoutines') : t('home.myRoutines')}
          </h2>
          <span className="text-xs text-muted-foreground">
            {t('home.routineCount', { count: filteredRoutines.length })}
          </span>
        </div>

        {filteredRoutines.length === 0 ?
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-32 h-32 mb-4 flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
                <rect x="20" y="45" width="80" height="55" rx="6" fill="hsl(350, 100%, 93%)" stroke="hsl(350, 80%, 80%)" strokeWidth="2" />
                <path d="M20 55 L60 35 L100 55" fill="hsl(350, 100%, 96%)" stroke="hsl(350, 80%, 80%)" strokeWidth="2" />
                <path d="M50 25 Q60 15 70 25" stroke="hsl(350, 80%, 80%)" strokeWidth="2" strokeDasharray="4 3" fill="none" />
                <path d="M45 30 Q55 20 50 25" stroke="hsl(350, 80%, 80%)" strokeWidth="2" strokeDasharray="4 3" fill="none" />
              </svg>
            </div>
            <h3 className="text-display text-lg text-muted-foreground">{t('home.noRoutines')}</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">{t('home.noRoutinesHint')}</p>
          </motion.div> :

        <div className="space-y-3">
            {filteredRoutines.map((routine) =>
          <RoutineCard key={routine.id} routine={routine} />
          )}
          </div>
        }
      </div>

      {/* FAB with balloon menu */}
      <div className="fixed bottom-20 right-5 z-40">
        <AnimatePresence>
          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowCreateMenu(false)} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute bottom-16 right-0 z-40 w-56"
              >
                {/* Speech bubble */}
                <div className="bg-pink-accent rounded-2xl p-4 shadow-lg border border-[hsl(350,80%,85%)] relative">
                  <p className="text-sm font-semibold text-foreground mb-3">{t('home.createMenu.title', 'O que você quer criar?')}</p>
                  <button
                    onClick={() => handleCreateOption('routine')}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/50 transition-colors mb-1.5"
                  >
                    <span className="text-sm font-medium">• {t('home.createMenu.routine', 'Rotina')}</span>
                    <p className="text-xs text-muted-foreground ml-3">{t('home.createMenu.routineDesc', 'Repetitiva')}</p>
                  </button>
                  <button
                    onClick={() => handleCreateOption('moment')}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/50 transition-colors"
                  >
                    <span className="text-sm font-medium">• {t('home.createMenu.moment', 'Momento Único')}</span>
                    <p className="text-xs text-muted-foreground ml-3">{t('home.createMenu.momentDesc', 'Especial/único')}</p>
                  </button>
                  {/* Arrow pointing to FAB */}
                  <div className="absolute -bottom-2 right-5 w-4 h-4 bg-pink-accent border-r border-b border-[hsl(350,80%,85%)] rotate-45" />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCreateMenu(!showCreateMenu)}
          className="w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center"
        >
          <Plus className={`w-6 h-6 text-primary-foreground transition-transform ${showCreateMenu ? 'rotate-45' : ''}`} />
        </motion.button>
      </div>

      <AnimatePresence>
        {activeRoutineId && <RoutineDetail />}
      </AnimatePresence>
    </div>
  );
}
