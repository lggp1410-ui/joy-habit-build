import { motion } from 'framer-motion';
import { ArrowLeft, Star, RotateCcw, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRoutineStore } from '@/stores/routineStore';
import { isImageIcon } from '@/types/routine';

export function SavedScreen() {
  const { routines, setActiveTab, reactivateRoutine } = useRoutineStore();
  const { t } = useTranslation();

  const archivedRoutines = routines.filter(r => r.archived);

  return (
    <div className="min-h-screen pb-24">
      <div className="gradient-primary px-5 pt-12 pb-8 rounded-b-card">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => setActiveTab('home')}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-display text-2xl flex items-center gap-2">
              <Star className="w-5 h-5" />
              {t('saved.title', 'Momentos Salvos')}
            </h1>
            <p className="text-sm text-foreground/60 mt-1">{t('saved.subtitle', 'Templates para reutilizar')}</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-3">
        {archivedRoutines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Star className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">{t('saved.empty', 'Nenhum momento salvo ainda')}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{t('saved.emptyHint', 'Momentos únicos serão salvos aqui automaticamente')}</p>
          </div>
        ) : (
          archivedRoutines.map((routine) => (
            <motion.div
              key={routine.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-card p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(210,80%,90%)] text-[hsl(210,60%,40%)] font-medium">
                      {t('saved.moment', 'Momento')}
                    </span>
                    <h3 className="text-display text-base">{routine.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {routine.tasks.length} {t('create.tasks', 'tarefas')} · {routine.time}
                  </p>
                </div>
              </div>

              {/* Task preview */}
              <div className="flex gap-2 mb-3">
                {routine.tasks.slice(0, 5).map(task => (
                  <div key={task.id} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {isImageIcon(task.icon) ? (
                      <img src={task.icon} alt="" className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <span className="text-sm">{task.icon}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => reactivateRoutine(routine.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-inner bg-pink-accent text-foreground text-sm font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('saved.useToday', 'Usar Hoje')}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
