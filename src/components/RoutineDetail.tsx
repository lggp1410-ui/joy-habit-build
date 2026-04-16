import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Pencil, Plus, CheckCircle, MoreVertical, Copy, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRoutineStore } from '@/stores/routineStore';
import { CountdownTimer } from './CountdownTimer';
import { TaskEditorModal } from './TaskEditorModal';
import { Task, formatDuration, isImageIcon } from '@/types/routine';
import { requestNotificationPermission } from '@/utils/notifications';

export function RoutineDetail() {
  const { routines, activeRoutineId, setActiveRoutine, toggleTask, setEditingRoutineId, setShowCreateModal, duplicateTask, deleteTask, addTaskToRoutine, updateTaskInRoutine, reorderTasks } = useRoutineStore();
  const { t } = useTranslation();
  const [showTimer, setShowTimer] = useState(false);
  const [completedTaskName, setCompletedTaskName] = useState<string | null>(null);
  const [taskMenuId, setTaskMenuId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragStartY = useRef(0);
  const taskListRef = useRef<HTMLDivElement>(null);
  const routine = routines.find(r => r.id === activeRoutineId);

  if (!routine) return null;

  const handleStartTimer = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission().finally(() => setShowTimer(true));
      return;
    }

    setShowTimer(true);
  };

  const completedCount = routine.tasks.filter(t => t.completed).length;

  const startTime = routine.time;
  const [startH, startM] = startTime.split(':').map(Number);
  const totalMinutesRaw = routine.tasks.reduce((sum, t) => sum + (t.duration || 1), 0);
  const totalMinutes = Math.round(totalMinutesRaw);
  const endH = Math.floor((startH * 60 + startM + totalMinutes) / 60) % 24;
  const endM = (startM + totalMinutes) % 60;

  const formatPeriod = (h: number) => {
    if (h < 12) return 'da manhã';
    if (h < 18) return 'da tarde';
    return 'da noite';
  };

  const displayH = (h: number) => h > 12 ? h - 12 : h || 12;
  const timeRange = `${displayH(startH)}:${String(startM).padStart(2, '0')} ${formatPeriod(startH)} - ${displayH(endH)}:${String(endM).padStart(2, '0')} ${formatPeriod(endH)}`;

  const handleToggleTask = (routineId: string, taskId: string) => {
    const task = routine.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.completed) {
      setCompletedTaskName(task.name);
      setTimeout(() => setCompletedTaskName(null), 2000);
    }

    toggleTask(routineId, taskId);
  };

  const handleEdit = () => {
    setEditingRoutineId(routine.id);
    setShowCreateModal(true);
  };

  const getTaskRestTime = (taskIndex: number) => {
    const task = routine.tasks[taskIndex];
    const rest = task.restTime ?? routine.restTime ?? 0;
    return rest;
  };

  // Drag & Drop handlers
  const handleDragStart = (index: number, e: React.TouchEvent | React.MouseEvent) => {
    setDraggedIndex(index);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (draggedIndex === null || !taskListRef.current) return;
    e.preventDefault();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const items = taskListRef.current.querySelectorAll('[data-task-index]');
    let closestIndex = draggedIndex;
    let closestDist = Infinity;
    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(clientY - mid);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = Number(item.getAttribute('data-task-index'));
      }
    });
    setDragOverIndex(closestIndex);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newTasks = [...routine.tasks];
      const [moved] = newTasks.splice(draggedIndex, 1);
      newTasks.splice(dragOverIndex, 0, moved);
      reorderTasks(routine.id, newTasks.map(t => t.id));
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-[60] bg-background"
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
    >
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setActiveRoutine(null)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-display text-lg">{routine.name}</h1>
          <button onClick={handleEdit} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Pencil className="w-4 h-4 text-foreground" />
          </button>
        </div>
        <h2 className="text-2xl font-semibold text-primary leading-tight">{timeRange}</h2>
      </div>

      {/* Task list */}
      <div ref={taskListRef} className="px-5 py-2 overflow-y-auto space-y-3" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {routine.tasks.map((task, i) => (
          <div key={task.id} data-task-index={i}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 p-4 rounded-2xl transition-all relative ${
                task.completed ? 'bg-muted/50 opacity-60' : 'bg-card shadow-soft'
              } ${draggedIndex === i ? 'opacity-50 scale-95' : ''} ${dragOverIndex === i && draggedIndex !== i ? 'border-2 border-primary' : ''}`}
            >
              {/* Grip handle for reorder */}
              <div
                className="cursor-grab active:cursor-grabbing touch-none shrink-0"
                onTouchStart={(e) => handleDragStart(i, e)}
                onMouseDown={(e) => handleDragStart(i, e)}
              >
                <GripVertical className="w-5 h-5 text-muted-foreground/50" />
              </div>

              {/* Icon in circle */}
              <div className="w-12 h-12 rounded-full bg-[hsl(0,0%,96%)] dark:bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {isImageIcon(task.icon) ? (
                  <img src={task.icon} alt="" className="w-8 h-8 object-contain pointer-events-none" draggable={false} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <span className="text-2xl">{task.icon}</span>
                )}
              </div>

              {/* Checkmark + name */}
              <button onClick={() => handleToggleTask(routine.id, task.id)} className="flex-1 text-left flex items-center gap-2">
                {task.completed && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                <div>
                  <span className={`font-medium block transition-all ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDuration(task.duration || 1)}</span>
                </div>
              </button>

              {/* Completion circle */}
              <button
                onClick={() => handleToggleTask(routine.id, task.id)}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  task.completed ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                }`}
              >
                {task.completed && (
                  <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path d="M5 13l4 4L19 7" />
                  </motion.svg>
                )}
              </button>

              {/* 3-dot menu for task */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setTaskMenuId(taskMenuId === task.id ? null : task.id); }}
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
                {taskMenuId === task.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setTaskMenuId(null)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-0 top-8 z-20 bg-card rounded-xl shadow-lg border border-border py-1 min-w-[130px]"
                    >
                      <button
                        onClick={() => { setTaskMenuId(null); setEditingTask(task); setIsTaskEditorOpen(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" /> {t('create.edit')}
                      </button>
                      <button
                        onClick={() => { setTaskMenuId(null); duplicateTask(routine.id, task.id); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                      >
                        <Copy className="w-4 h-4 text-muted-foreground" /> {t('create.duplicate')}
                      </button>
                      <button
                        onClick={() => { setTaskMenuId(null); deleteTask(routine.id, task.id); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-destructive/10 transition-colors text-left text-destructive"
                      >
                        <Trash2 className="w-4 h-4" /> {t('create.delete')}
                      </button>
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>

            {/* Divider with rest time */}
            {i < routine.tasks.length - 1 && getTaskRestTime(i) > 0 && (
              <div className="flex items-center justify-center gap-2 py-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm">🌴</span>
                <span className="text-xs text-muted-foreground">{formatDuration(getTaskRestTime(i))}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[61] px-5 py-4 bg-background/80 backdrop-blur-sm flex items-center gap-3">
        <button onClick={() => { setEditingTask(null); setIsTaskEditorOpen(true); }} className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Plus className="w-6 h-6 text-foreground" />
        </button>
        <button
          onClick={handleStartTimer}
          disabled={routine.tasks.length === 0}
          className="flex-1 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-lg shadow-lg active:scale-[0.97] transition-transform disabled:opacity-40 disabled:pointer-events-none"
        >
          {t('detail.start', 'Iniciar')}
        </button>
      </div>

      {/* Task completed toast */}
      <AnimatePresence>
        {completedTaskName && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[65] flex items-center gap-2 px-5 py-3 bg-card shadow-soft rounded-full border border-border"
          >
            <CheckCircle className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">{t('detail.taskDone', { name: completedTaskName })}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer overlay */}
      <AnimatePresence>
        {showTimer && (
          <CountdownTimer
            routine={routine}
            onClose={() => setShowTimer(false)}
            onCompleteTask={(taskId) => handleToggleTask(routine.id, taskId)}
          />
        )}
      </AnimatePresence>
      {/* Task editor modal */}
      <TaskEditorModal
        isOpen={isTaskEditorOpen}
        onClose={() => { setIsTaskEditorOpen(false); setEditingTask(null); }}
        onSave={(task) => {
          if (editingTask) {
            updateTaskInRoutine(routine.id, task);
          } else {
            addTaskToRoutine(routine.id, task);
          }
        }}
        initialTask={editingTask}
      />
    </motion.div>
  );
}
