import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRoutineStore } from '@/stores/routineStore';
import { BarChart3, CheckCircle2, Target, Flame } from 'lucide-react';

export function AnalysisScreen() {
  const { routines } = useRoutineStore();
  const { t } = useTranslation();

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

        {routines.length > 0 && (
          <div className="mt-6">
            <h3 className="text-display text-base mb-3">{t('analysis.routineBreakdown')}</h3>
            <div className="space-y-2">
              {routines.map((routine) => {
                const done = routine.tasks.filter(t => t.completed).length;
                const pct = routine.tasks.length > 0 ? (done / routine.tasks.length) * 100 : 0;
                return (
                  <div key={routine.id} className="glass-card rounded-inner p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{routine.name}</span>
                      <span className="text-xs text-numbers text-muted-foreground">{done}/{routine.tasks.length}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full gradient-primary rounded-full"
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
