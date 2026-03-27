import { Plus, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRoutineStore } from '@/stores/routineStore';
import { RoutineCard } from '@/components/RoutineCard';
import { RoutineDetail } from '@/components/RoutineDetail';
import { useState, useEffect, useMemo } from 'react';

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
  const { routines, setShowCreateModal, activeRoutineId } = useRoutineStore();
  const { t, i18n } = useTranslation();
  const currentDate = useCurrentDate();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [showAllRoutines, setShowAllRoutines] = useState(false);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate.toDateString()]);
  const lang = i18n.language;
  const dayLabels = WEEKDAY_LABELS_PT[lang] || WEEKDAY_LABELS_PT['en'];

  const locale = lang === 'pt-BR' ? 'pt-BR' : lang === 'fr' ? 'fr-FR' : lang === 'ja' ? 'ja-JP' : lang === 'ko' ? 'ko-KR' : 'en-US';
  const weekdayName = currentDate.toLocaleDateString(locale, { weekday: 'long' });

  const todayIndex = weekDays.findIndex(d => d.toDateString() === currentDate.toDateString());

  const filteredRoutines = useMemo(() => {
    if (showAllRoutines) return routines;
    const dayIdx = selectedDayIndex ?? todayIndex;
    if (dayIdx < 0) return routines;
    const dayLabel = dayLabels[dayIdx];
    return routines.filter(r => r.days.length === 0 || r.days.some(d => d === dayLabel));
  }, [routines, selectedDayIndex, todayIndex, dayLabels, showAllRoutines]);

  return (
    <div className="min-h-screen pb-24">
      {/* Pink gradient header with calendar */}
      <div className="gradient-purple px-5 pt-12 pb-6 rounded-b-[32px] text-foreground">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-sm text-foreground/70 font-medium capitalize">{weekdayName}</p>
          </div>
          <button
            onClick={() => setShowAllRoutines(!showAllRoutines)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showAllRoutines ? 'bg-white/40' : 'bg-white/20'}`}
          >
            <List className="w-5 h-5 text-foreground" />
          </button>
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

      {/* Pink FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-20 right-5 z-40 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center">
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <AnimatePresence>
        {activeRoutineId && <RoutineDetail />}
      </AnimatePresence>

      {/* Tutorial moved to CreateRoutineModal */}
    </div>
  );
}
