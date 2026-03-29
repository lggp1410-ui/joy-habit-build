import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRoutineStore } from '@/stores/routineStore';
import { BarChart3, CheckCircle2, Target, Flame } from 'lucide-react';
import { useMemo } from 'react';

const WEEKDAY_LABELS: Record<string, string[]> = {
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

export function AnalysisScreen() {
  const { routines } = useRoutineStore();
  const { t, i18n } = useTranslation();

  const totalTasks = routines.reduce((acc, r) => acc + r.tasks.length, 0);
  const completedTasks = routines.reduce((acc, r) => acc + r.tasks.filter(t => t.completed).length, 0);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const completedRoutines = routines.filter(r => r.tasks.length > 0 && r.tasks.every(t => t.completed)).length;

  const stats = [
    { label: t('analysis.totalRoutines'), value: routines.length, icon: Target, color: 'bg-primary' },
    { label: t('analysis.tasksDone'), value: `${completedTasks}/${totalTasks}`, icon: CheckCircle2, color: 'bg-secondary' },
    { label: t('analysis.completion'), value: `${completionRate}%`, icon: BarChart3, color: 'bg-primary' },
    { label: t('analysis.perfectDays'), value: completedRoutines, icon: Flame, color: 'bg-secondary' },
  ];

  const today = new Date();
  const weekDays = useMemo(() => getWeekDays(today), [today.toDateString()]);
  const lang = i18n.language;
  const dayLabels = WEEKDAY_LABELS[lang] || WEEKDAY_LABELS['en'];

  // Calculate progress dots for the week
  const weekProgress = useMemo(() => {
    return weekDays.map((day, i) => {
      const dayLabel = dayLabels[i];
      const isToday = day.toDateString() === today.toDateString();
      
      // Filter routines for this day
      const dayRoutines = routines.filter(r => 
        !r.archived && (r.type || 'routine') === 'routine' && 
        (r.days.length === 0 || r.days.includes(dayLabel))
      );
      const dayMoments = routines.filter(r => 
        !r.archived && r.type === 'moment'
      );

      const routineTotal = dayRoutines.reduce((a, r) => a + r.tasks.length, 0);
      const routineDone = dayRoutines.reduce((a, r) => a + r.tasks.filter(t => t.completed).length, 0);
      const routinePct = routineTotal > 0 ? routineDone / routineTotal : 0;

      const momentTotal = dayMoments.reduce((a, r) => a + r.tasks.length, 0);
      const momentDone = dayMoments.reduce((a, r) => a + r.tasks.filter(t => t.completed).length, 0);
      const momentPct = momentTotal > 0 ? momentDone / momentTotal : 0;

      return { dayLabel, isToday, routinePct, momentPct, hasRoutines: routineTotal > 0, hasMoments: momentTotal > 0 };
    });
  }, [routines, weekDays, dayLabels, today]);

  return (
    <div className="min-h-screen pb-24">
      <div className="gradient-primary px-5 pt-12 pb-8 rounded-b-card">
        <h1 className="text-display text-2xl">{t('analysis.title')}</h1>
        <p className="text-sm text-foreground/60 mt-1">{t('analysis.subtitle')}</p>
      </div>

      <div className="px-5 mt-6">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card rounded-card p-4 text-center"
            >
              <div className={`w-10 h-10 rounded-inner mx-auto flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5 text-foreground" />
              </div>
              <p className="text-2xl text-display text-numbers mt-3">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Weekly progress dots */}
        <div className="mt-6">
          <h3 className="text-display text-base mb-3">{t('analysis.weeklyHistory', 'Histórico Semanal')}</h3>
          <div className="glass-card rounded-card p-4">
            <div className="flex justify-between items-end">
              {weekProgress.map((dp, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  {/* Progress dot */}
                  <div className="relative w-10 h-10">
                    <svg viewBox="0 0 40 40" className="w-full h-full">
                      {/* Background circle */}
                      <circle cx="20" cy="20" r="16" fill="hsl(var(--muted))" />
                      
                      {/* Routine fill (pink) */}
                      {dp.routinePct > 0 && (
                        <circle
                          cx="20" cy="20" r="16"
                          fill="hsl(350, 80%, 85%)"
                          clipPath={`inset(${(1 - dp.routinePct) * 100}% 0 0 0)`}
                        />
                      )}

                      {/* Full pink fill for 100% routines */}
                      {dp.routinePct >= 1 && (
                        <circle cx="20" cy="20" r="16" fill="hsl(350, 80%, 85%)" />
                      )}

                      {/* Blue outline for moments */}
                      {dp.momentPct > 0 && (
                        <circle
                          cx="20" cy="20" r="16"
                          fill="none"
                          stroke="hsl(210, 70%, 75%)"
                          strokeWidth={dp.momentPct >= 1 ? 3 : 2}
                          strokeDasharray={`${dp.momentPct * 100.5} 100.5`}
                          transform="rotate(-90 20 20)"
                          strokeLinecap="round"
                        />
                      )}

                      {/* Today indicator */}
                      {dp.isToday && (
                        <circle cx="20" cy="20" r="3" fill="hsl(var(--primary))" />
                      )}
                    </svg>
                  </div>
                  <span className={`text-[10px] font-medium ${dp.isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {dp.dayLabel}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[hsl(350,80%,85%)]" />
                <span className="text-[10px] text-muted-foreground">{t('analysis.routines', 'Rotinas')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border-2 border-[hsl(210,70%,75%)] bg-transparent" />
                <span className="text-[10px] text-muted-foreground">{t('analysis.moments', 'Momentos')}</span>
              </div>
            </div>
          </div>
        </div>

        {routines.length > 0 && (
          <div className="mt-6">
            <h3 className="text-display text-base mb-3">{t('analysis.routineBreakdown')}</h3>
            <div className="space-y-2">
              {routines.filter(r => !r.archived).map((routine) => {
                const done = routine.tasks.filter(t => t.completed).length;
                const pct = routine.tasks.length > 0 ? (done / routine.tasks.length) * 100 : 0;
                const isMoment = routine.type === 'moment';
                return (
                  <div key={routine.id} className="glass-card rounded-inner p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isMoment && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(210,80%,90%)] text-[hsl(210,60%,40%)] font-medium">
                            {t('saved.moment', 'Momento')}
                          </span>
                        )}
                        <span className="text-sm font-medium">{routine.name}</span>
                      </div>
                      <span className="text-xs text-numbers text-muted-foreground">{done}/{routine.tasks.length}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${isMoment ? 'bg-[hsl(210,70%,70%)]' : 'gradient-primary'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {routines.length === 0 && (
          <div className="glass-card rounded-card p-8 text-center mt-6">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-muted-foreground text-sm">{t('analysis.noDataHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
