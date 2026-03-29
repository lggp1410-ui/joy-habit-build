import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, ChevronDown, MoreVertical, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRoutineStore } from '@/stores/routineStore';
import { IconPicker } from './IconPicker';
import { WheelPicker } from './WheelPicker';
import { Task, Routine, formatDuration, isImageIcon } from '@/types/routine';
import { TutorialOverlay } from './TutorialOverlay';
import defaultTaskIcon from '@/assets/default-task-icon.png';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const DURATION_H = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const DURATION_M = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const DURATION_S = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const DEFAULT_TASK_ICON = defaultTaskIcon;

export function CreateRoutineModal() {
  const { showCreateModal, setShowCreateModal, addRoutine, updateRoutine, routines, editingRoutineId, setEditingRoutineId } = useRoutineStore();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [hourIndex, setHourIndex] = useState(7);
  const [minuteIndex, setMinuteIndex] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskIcon, setNewTaskIcon] = useState(DEFAULT_TASK_ICON);
  const [durH, setDurH] = useState(0);
  const [durM, setDurM] = useState(1);
  const [durS, setDurS] = useState(0);
  const [restH, setRestH] = useState(0);
  const [restM, setRestM] = useState(0);
  const [restS, setRestS] = useState(0);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [reminder, setReminder] = useState(false);
  const [autoContinue, setAutoContinue] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showRestPicker, setShowRestPicker] = useState(false);
  // Task editing & 3-dot menu
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (editingRoutineId && showCreateModal) {
      const routine = routines.find(r => r.id === editingRoutineId);
      if (routine) {
        setName(routine.name);
        setTasks([...routine.tasks]);
        setReminder(routine.reminder ?? false);
        setAutoContinue(routine.autoContinue ?? false);
        const [h, m] = routine.time.split(':').map(Number);
        setHourIndex(h);
        setMinuteIndex(m);
        setSelectedDays([]);
      }
    }
  }, [editingRoutineId, showCreateModal]);

  const toggleDay = (dayKey: string) => {
    setSelectedDays(prev =>
      prev.includes(dayKey) ? prev.filter(d => d !== dayKey) : [...prev, dayKey]
    );
  };

  const getDurationMinutes = () => durH * 60 + durM + durS / 60;
  const getDurationLabel = () => {
    const parts = [];
    if (durH > 0) parts.push(`${durH}h`);
    if (durM > 0) parts.push(`${durM}m`);
    if (durS > 0) parts.push(`${durS}s`);
    return parts.length > 0 ? parts.join(' ') : '0s';
  };

  const getRestLabel = () => {
    const parts = [];
    if (restH > 0) parts.push(`${restH}h`);
    if (restM > 0) parts.push(`${restM}m`);
    if (restS > 0) parts.push(`${restS}s`);
    return parts.length > 0 ? parts.join(' ') : '0m';
  };

  const addTask = () => {
    if (!newTaskName.trim()) return;
    const taskRestMinutes = restH * 60 + restM + restS / 60;

    if (editingTaskId) {
      // Update existing task
      setTasks(prev => prev.map(t => t.id === editingTaskId ? {
        ...t,
        name: newTaskName.trim(),
        icon: newTaskIcon,
        duration: getDurationMinutes() || 0.5,
        restTime: taskRestMinutes,
      } : t));
      setEditingTaskId(null);
    } else {
      // Add new task
      setTasks(prev => [...prev, {
        id: crypto.randomUUID(),
        name: newTaskName.trim(),
        icon: newTaskIcon,
        completed: false,
        duration: getDurationMinutes() || 0.5,
        restTime: taskRestMinutes,
      }]);
    }
    resetTaskForm();
  };

  const resetTaskForm = () => {
    setNewTaskName('');
    setNewTaskIcon(DEFAULT_TASK_ICON);
    setDurH(0); setDurM(0); setDurS(30);
    setRestH(0); setRestM(0); setRestS(0);
    setShowDurationPicker(false);
    setShowRestPicker(false);
    setShowAddTask(false);
    setEditingTaskId(null);
  };

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setNewTaskName(task.name);
    setNewTaskIcon(task.icon);
    const durTotalSecs = Math.round((task.duration || 1) * 60);
    setDurH(Math.floor(durTotalSecs / 3600));
    setDurM(Math.floor((durTotalSecs % 3600) / 60));
    setDurS(durTotalSecs % 60);
    const restTotalSecs = Math.round((task.restTime || 0) * 60);
    setRestH(Math.floor(restTotalSecs / 3600));
    setRestM(Math.floor((restTotalSecs % 3600) / 60));
    setRestS(restTotalSecs % 60);
    setShowAddTask(true);
    setOpenMenuTaskId(null);
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setOpenMenuTaskId(null);
  };

  const { createType } = useRoutineStore();

  const handleSave = () => {
    if (!name.trim() || tasks.length === 0) return;
    const time = `${HOURS[hourIndex]}:${MINUTES_60[minuteIndex]}`;
    const routineData: Routine = {
      id: editingRoutineId || crypto.randomUUID(),
      name: name.trim(),
      days: selectedDays.map(key => t(`dayLabels.${key}`)),
      time,
      tasks,
      category: 'custom',
      reminder,
      autoContinue,
      restTime: 0,
      type: editingRoutineId ? (routines.find(r => r.id === editingRoutineId)?.type || 'routine') : createType,
    };

    if (editingRoutineId) {
      updateRoutine(routineData);
    } else {
      addRoutine(routineData);
    }
    reset();
  };

  const reset = () => {
    setName('');
    setSelectedDays([]);
    setHourIndex(7);
    setMinuteIndex(0);
    setTasks([]);
    setShowAddTask(false);
    setReminder(false);
    setAutoContinue(false);
    setDurH(0); setDurM(0); setDurS(30);
    setRestH(0); setRestM(0); setRestS(0);
    setShowDurationPicker(false);
    setShowRestPicker(false);
    setNewTaskIcon(DEFAULT_TASK_ICON);
    setEditingTaskId(null);
    setOpenMenuTaskId(null);
    setEditingRoutineId(null);
    setShowCreateModal(false);
  };

  const isEditing = !!editingRoutineId;

  return (
    <>
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-foreground/20 backdrop-blur-sm"
            onClick={reset}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-card sm:rounded-card p-6 shadow-soft max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto" style={{ width: '88%' }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-display text-xl">{createType === 'moment' && !isEditing ? t('create.titleMoment', 'Criar Momento') : t('create.title')}</h2>
                  <button onClick={reset} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Name */}
                <div className="mb-5">
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('create.routineName')}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('create.namePlaceholder')}
                    className="w-full px-4 py-3 bg-muted rounded-inner text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                </div>

                {/* Days */}
                <div className="mb-5">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">{t('create.days')}</label>
                  <div className="flex gap-2 justify-center">
                    {DAY_KEYS.map((key) => (
                      <button
                        key={key}
                        onClick={() => toggleDay(key)}
                        className={`w-10 h-10 rounded-full text-xs font-medium transition-all ${
                          selectedDays.includes(key)
                            ? 'bg-pink-accent text-foreground shadow-soft'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {t(`days.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Time */}
                <div className="mb-5">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">{t('create.time')}</label>
                  <div className="flex items-center justify-center gap-2 bg-muted rounded-inner p-2">
                    <WheelPicker items={HOURS} selectedIndex={hourIndex} onChange={setHourIndex} className="w-16" />
                    <span className="text-xl font-bold text-foreground">:</span>
                    <WheelPicker items={MINUTES_60} selectedIndex={minuteIndex} onChange={setMinuteIndex} className="w-16" />
                  </div>
                </div>

                {/* Reminder switch */}
                <div className="mb-4 flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">{t('create.reminder')}</label>
                  <button
                    onClick={() => setReminder(!reminder)}
                    className={`w-12 h-7 rounded-full transition-colors relative ${reminder ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <motion.div animate={{ x: reminder ? 20 : 2 }} className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm" />
                  </button>
                </div>

                {/* Auto-continue switch */}
                <div className="mb-4 flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">{t('create.autoContinue')}</label>
                  <button
                    onClick={() => setAutoContinue(!autoContinue)}
                    className={`w-12 h-7 rounded-full transition-colors relative ${autoContinue ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <motion.div animate={{ x: autoContinue ? 20 : 2 }} className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm" />
                  </button>
                </div>

                {/* Tasks */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    {t('create.tasks')} ({tasks.length})
                  </label>
                  <div className="space-y-2 mb-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 bg-muted rounded-inner px-4 py-3 relative">
                        <div className="w-10 h-10 rounded-full bg-[hsl(0,0%,96%)] dark:bg-[hsl(0,0%,22%)] flex items-center justify-center shrink-0 overflow-hidden">
                          {isImageIcon(task.icon) ? (
                            <img src={task.icon} alt="" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.querySelector('.fallback-icon')?.classList.remove('hidden'); }} />
                          ) : null}
                          <span className={`text-xl fallback-icon ${isImageIcon(task.icon) ? 'hidden' : ''}`}>{isImageIcon(task.icon) ? '📋' : task.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium block truncate">{task.name}</span>
                          <span className="text-xs text-muted-foreground">{formatDuration(task.duration || 1)}</span>
                        </div>
                        {/* 3-dot menu */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuTaskId(openMenuTaskId === task.id ? null : task.id)}
                            className="p-1.5 rounded-full hover:bg-card transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <AnimatePresence>
                            {openMenuTaskId === task.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuTaskId(null)} />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className="absolute right-0 top-8 z-20 bg-card rounded-lg shadow-soft border border-border py-1 min-w-[120px]"
                                >
                                  <button
                                    onClick={() => startEditTask(task)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    {t('create.edit') || 'Edit'}
                                  </button>
                                  <button
                                    onClick={() => removeTask(task.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {t('create.delete')}
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                  </div>

                  {showAddTask ? (
                    <div className="bg-muted rounded-inner p-4 space-y-4">
                      {/* Centered icon circle */}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => setShowIconPicker(true)}
                          className="w-20 h-20 rounded-full bg-[hsl(0,0%,96%)] dark:bg-[hsl(0,0%,22%)] flex items-center justify-center shadow-soft overflow-hidden"
                        >
                          {isImageIcon(newTaskIcon) ? (
                            <img src={newTaskIcon} alt="" className="w-12 h-12 object-contain" />
                          ) : (
                            <span className="text-3xl">{newTaskIcon}</span>
                          )}
                        </button>
                        <p className="text-xs text-muted-foreground mt-1.5">{t('iconPicker.title')}</p>
                      </div>

                      {/* Task name */}
                      <input
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        placeholder={t('create.taskPlaceholder')}
                        className="w-full px-4 py-3 bg-card rounded-inner text-foreground text-sm placeholder:text-muted-foreground/50 outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && addTask()}
                      />

                      {/* Duration - collapsible */}
                      <div>
                        <button
                          onClick={() => setShowDurationPicker(!showDurationPicker)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-card rounded-inner"
                        >
                          <span className="text-sm text-muted-foreground">{t('create.duration')}</span>
                          <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                            {getDurationLabel()}
                            <ChevronDown className={`w-4 h-4 transition-transform ${showDurationPicker ? 'rotate-180' : ''}`} />
                          </span>
                        </button>
                        <AnimatePresence>
                          {showDurationPicker && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex items-center justify-center gap-1 bg-card rounded-inner p-2 mt-1">
                                <WheelPicker items={DURATION_H} selectedIndex={durH} onChange={setDurH} className="w-14" visibleItems={3} />
                                <span className="text-xs text-muted-foreground font-medium">H</span>
                                <WheelPicker items={DURATION_M} selectedIndex={durM} onChange={setDurM} className="w-14" visibleItems={3} />
                                <span className="text-xs text-muted-foreground font-medium">M</span>
                                <WheelPicker items={DURATION_S} selectedIndex={durS} onChange={setDurS} className="w-14" visibleItems={3} />
                                <span className="text-xs text-muted-foreground font-medium">S</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Rest time - collapsible */}
                      <div>
                        <button
                          onClick={() => setShowRestPicker(!showRestPicker)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-card rounded-inner"
                        >
                          <span className="text-sm text-muted-foreground">{t('create.restTime')}</span>
                          <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                            {getRestLabel()}
                            <ChevronDown className={`w-4 h-4 transition-transform ${showRestPicker ? 'rotate-180' : ''}`} />
                          </span>
                        </button>
                        <AnimatePresence>
                          {showRestPicker && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex items-center justify-center gap-1 bg-card rounded-inner p-2 mt-1">
                                <WheelPicker items={DURATION_H} selectedIndex={restH} onChange={setRestH} className="w-14" visibleItems={3} />
                                <span className="text-xs text-muted-foreground font-medium">H</span>
                                <WheelPicker items={DURATION_M} selectedIndex={restM} onChange={setRestM} className="w-14" visibleItems={3} />
                                <span className="text-xs text-muted-foreground font-medium">M</span>
                                <WheelPicker items={DURATION_S} selectedIndex={restS} onChange={setRestS} className="w-14" visibleItems={3} />
                                <span className="text-xs text-muted-foreground font-medium">S</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={resetTaskForm} className="flex-1 py-2 rounded-inner text-sm text-muted-foreground hover:bg-card transition-colors">
                          {t('create.cancel')}
                        </button>
                        <button onClick={addTask} className="flex-1 py-2 bg-pink-accent rounded-inner text-sm font-medium shadow-soft text-foreground">
                          {editingTaskId ? (t('create.save') || 'Save') : t('create.add')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddTask(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-inner text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                    >
                      <Plus className="w-4 h-4" /> {t('create.addTask')}
                    </button>
                  )}
                </div>

                {/* Save */}
                <button
                  onClick={handleSave}
                  disabled={!name.trim() || tasks.length === 0}
                  className="w-full py-3.5 bg-pink-accent rounded-inner font-semibold shadow-soft transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-foreground"
                >
                  {t('create.saveRoutine')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <IconPicker
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={setNewTaskIcon}
        selectedIcon={newTaskIcon}
      />

      {showCreateModal && !editingRoutineId && <TutorialOverlay />}
    </>
  );
}
