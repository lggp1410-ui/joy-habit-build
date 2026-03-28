import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, ChevronRight, MoreVertical, Pencil, Copy, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Routine, isImageIcon } from '@/types/routine';
import { useRoutineStore } from '@/stores/routineStore';

interface RoutineCardProps {
  routine: Routine;
}

export function RoutineCard({ routine }: RoutineCardProps) {
  const { setActiveRoutine, deleteRoutine, duplicateRoutine, setShowCreateModal, setEditingRoutineId } = useRoutineStore();
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const completedCount = routine.tasks.filter(t => t.completed).length;
  const progress = routine.tasks.length > 0 ? (completedCount / routine.tasks.length) * 100 : 0;
  const allDone = completedCount === routine.tasks.length && routine.tasks.length > 0;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setEditingRoutineId(routine.id);
    setShowCreateModal(true);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    duplicateRoutine(routine.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    deleteRoutine(routine.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-card p-4 cursor-pointer group relative"
      onClick={() => setActiveRoutine(routine.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-display text-base">{routine.name}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-numbers">{routine.time}</span>
            {routine.days.length > 0 && (
              <span className="ml-1">· {routine.days.join(', ')}</span>
            )}
          </div>
        </div>

        {/* 3-dot menu */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-8 z-20 bg-card rounded-xl shadow-lg border border-border py-1 min-w-[140px]"
              >
                <button onClick={handleEdit} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                  {t('create.edit')}
                </button>
                <button onClick={handleDuplicate} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                  {t('create.duplicate')}
                </button>
                <button onClick={handleDelete} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-destructive/10 transition-colors text-left text-destructive">
                  <Trash2 className="w-4 h-4" />
                  {t('create.delete')}
                </button>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Task preview - icons in circles */}
      <div className="flex gap-3.5 mb-3 flex-wrap">
        {routine.tasks.slice(0, 6).map(task => (
          <div
            key={task.id}
            className={`w-8 h-8 rounded-full bg-[hsl(0,0%,96%)] dark:bg-muted flex items-center justify-center overflow-hidden transition-all ${task.completed ? 'opacity-100' : 'opacity-40'}`}
          >
            {isImageIcon(task.icon) ? (
              <img src={task.icon} alt="" className="w-5 h-5 object-contain pointer-events-none" draggable={false} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.querySelector('.fallback-icon')?.classList.remove('hidden'); }} />
            ) : null}
            <span className={`text-sm fallback-icon ${isImageIcon(task.icon) ? 'hidden' : ''}`}>{isImageIcon(task.icon) ? '📋' : task.icon}</span>
          </div>
        ))}
        {routine.tasks.length > 6 && (
          <span className="text-xs text-muted-foreground self-center">+{routine.tasks.length - 6}</span>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${allDone ? 'bg-secondary' : 'gradient-primary'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs text-numbers text-muted-foreground">
          {completedCount}/{routine.tasks.length}
        </span>
      </div>
    </motion.div>
  );
}