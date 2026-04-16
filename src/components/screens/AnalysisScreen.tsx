import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRoutineStore } from '@/stores/routineStore';
import { BarChart3, CheckCircle2, Target, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

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

function getMonthDays(today: Date) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const days: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

interface DayProgress {
  dayLabel: string;
  isToday: boolean;
  routinePct: number;
  momentPct: number;
  hasRoutines: boolean;
  hasMoments: boolean;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function wasCompletedOn(task: any, dateStr: string, isToday: boolean): boolean {
  // If completionDates exists, use it as the source of truth
  if (task.completionDates && task.completionDates.length > 0) {
    return task.completionDates.includes(dateStr);
  }
  // Legacy: for today only, fall back to the completed flag
  return isToday && !!task.completed;
}

function calcDayProgress(
  day: Date,
  dayLabel: string,
  today: Date,
  routines: any[]
): DayProgress {
  const isToday = day.toDateString() === today.toDateString();
  const dateStr = toDateStr(day);

  // Only show routines scheduled for this weekday
  const dayRoutines = routines.filter(r =>
    !r.archived && (r.type || 'routine') === 'routine' &&
    (r.days.length === 0 || r.days.includes(dayLabel))
  );
  const dayMoments = routines.filter(r =>
    !r.archived && r.type === 'moment'
  );

  const routineTotal = dayRoutines.reduce((a: number, r: any) => a + r.tasks.length, 0);
  const routineDone = dayRoutines.reduce((a: number, r: any) =>
    a + r.tasks.filter((t: any) => wasCompletedOn(t, dateStr, isToday)).length, 0);
  const routinePct = routineTotal > 0 ? routineDone / routineTotal : 0;

  const momentTotal = dayMoments.reduce((a: number, r: any) => a + r.tasks.length, 0);
  const momentDone = dayMoments.reduce((a: number, r: any) =>
    a + r.tasks.filter((t: any) => wasCompletedOn(t, dateStr, isToday)).length, 0);
  const momentPct = momentTotal > 0 ? momentDone / momentTotal : 0;

  return { dayLabel, isToday, routinePct, momentPct, hasRoutines: routineTotal > 0, hasMoments: momentTotal > 0 };
}

function ProgressDot({ dp, size = 40 }: { dp: DayProgress; size?: number }) {
  const r = size * 0.4;
  const c = size / 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      <circle cx={c} cy={c} r={r} fill="hsl(var(--muted))" />
      {dp.routinePct > 0 && dp.routinePct < 1 && (
        <circle cx={c} cy={c} r={r} fill="hsl(350, 80%, 85%)"
          clipPath={`inset(${(1 - dp.routinePct) * 100}% 0 0 0)`} />
      )}
      {dp.routinePct >= 1 && (
        <circle cx={c} cy={c} r={r} fill="hsl(350, 80%, 85%)" />
      )}
      {dp.momentPct > 0 && (
        <circle cx={c} cy={c} r={r} fill="none"
          stroke="hsl(210, 70%, 75%)"
          strokeWidth={dp.momentPct >= 1 ? 3 : 2}
          strokeDasharray={`${dp.momentPct * (2 * Math.PI * r)} ${2 * Math.PI * r}`}
          transform={`rotate(-90 ${c} ${c})`}
          strokeLinecap="round" />
      )}
      {dp.isToday && (
        <circle cx={c} cy={c} r={size * 0.075} fill="hsl(var(--primary))" />
      )}
    </svg>
  );
}

export function AnalysisScreen() {
  const { routines } = useRoutineStore();
  const { t, i18n } = useTranslation();
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [monthOffset, setMonthOffset] = useState(0);

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
  const viewMonth = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return d;
  }, [today.toDateString(), monthOffset]);
  const monthDays = useMemo(() => getMonthDays(viewMonth), [viewMonth.toISOString()]);
  const lang = i18n.language;
  const dayLabels = WEEKDAY_LABELS[lang] || WEEKDAY_LABELS['en'];

  const weekProgress = useMemo(() => {
    return weekDays.map((day, i) => calcDayProgress(day, dayLabels[i], today, routines));
  }, [routines, weekDays, dayLabels, today]);

  const monthProgress = useMemo(() => {
    return monthDays.map(day => {
      if (!day) return null;
      const dayOfWeek = day.getDay();
      return calcDayProgress(day, dayLabels[dayOfWeek], today, routines);
    });
  }, [routines, monthDays, dayLabels, today]);

  const monthName = viewMonth.toLocaleDateString(lang === 'pt-BR' ? 'pt-BR' : lang, { month: 'long', year: 'numeric' });

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

        {/* View mode toggle */}
        <div className="mt-6 flex items-center justify-between">
          <h3 className="text-display text-base">
            {viewMode === 'weekly'
              ? t('analysis.weeklyHistory', 'Histórico Semanal')
              : t('analysis.monthlyHistory', 'Histórico Mensal')}
          </h3>
          <div className="flex bg-muted rounded-full p-0.5">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${viewMode === 'weekly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {t('analysis.weekly', 'Semanal')}
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${viewMode === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {t('analysis.monthly', 'Mensal')}
            </button>
          </div>
        </div>

        {/* Weekly view */}
        {viewMode === 'weekly' && (
          <div className="glass-card rounded-card p-4 mt-3">
            <div className="flex justify-between items-end">
              {weekProgress.map((dp, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="relative w-10 h-10">
                    <ProgressDot dp={dp} />
                  </div>
                  <span className={`text-[10px] font-medium ${dp.isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {dp.dayLabel}
                  </span>
                </div>
              ))}
            </div>
            <Legend />
          </div>
        )}

        {/* Monthly view */}
        {viewMode === 'monthly' && (
          <div className="glass-card rounded-card p-4 mt-3">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setMonthOffset(prev => prev - 1)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="text-sm text-muted-foreground capitalize">{monthName}</p>
              <button
                onClick={() => setMonthOffset(prev => prev + 1)}
                disabled={monthOffset >= 0}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayLabels.map((label, i) => (
                <div key={i} className="text-center text-[9px] text-muted-foreground font-medium">{label}</div>
              ))}
            </div>
            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {monthProgress.map((dp, i) => (
                <div key={i} className="flex flex-col items-center py-0.5">
                  {dp ? (
                    <>
                      <span className={`text-[10px] ${dp.isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                        {monthDays[i]!.getDate()}
                      </span>
                      <div className="w-6 h-6">
                        <ProgressDot dp={dp} size={24} />
                      </div>
                    </>
                  ) : (
                    <div className="h-[34px]" />
                  )}
                </div>
              ))}
            </div>
            <Legend />
          </div>
        )}

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

function Legend() {
  const { t } = useTranslation();
  return (
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
  );
}
