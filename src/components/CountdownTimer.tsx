import { useState, useEffect, useRef, forwardRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, SkipForward, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Routine, formatDuration, isImageIcon } from '@/types/routine';
import { playCompletionSound } from '@/utils/completionSound';
import {
  showNotification,
  requestNotificationPermission,
  scheduleTimerNotification,
  cancelTimerNotification,
  cancelAllTimerNotifications,
} from '@/utils/notifications';

const TIMER_STATE_KEY = 'timerState';

interface TimerState {
  routineId: string;
  taskId: string;
  startTimestamp: number;
  totalDuration: number;
  pausedRemaining: number;
  isResting: boolean;
  isPaused: boolean;
}

function saveTimerState(state: TimerState) {
  try {
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
  } catch {}
}

function loadTimerState(): TimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearTimerState() {
  try {
    localStorage.removeItem(TIMER_STATE_KEY);
  } catch {}
}

interface CountdownTimerProps {
  routine: Routine;
  onClose: () => void;
  onCompleteTask: (taskId: string) => void;
}

export const CountdownTimer = forwardRef<HTMLDivElement, CountdownTimerProps>(function CountdownTimer({ routine, onClose, onCompleteTask }, ref) {
  const { t } = useTranslation();
  const incompleteTasks = routine.tasks.filter(t => !t.completed);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const currentTask = incompleteTasks[currentTaskIndex];

  const [isResting, setIsResting] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const [isNegative, setIsNegative] = useState(false);
  const [soundPlayed, setSoundPlayed] = useState(false);
  const [remaining, setRemaining] = useState(0);

  // Timestamp-based timing for background accuracy
  const startTimeRef = useRef<number>(Date.now());
  const totalDurationRef = useRef<number>(0);
  const pausedRemainingRef = useRef<number>(0);
  const restoredRef = useRef(false);

  const getTaskSeconds = useCallback(() => {
    return currentTask ? (currentTask.duration || 1) * 60 : 60;
  }, [currentTask]);

  const getRestSeconds = useCallback(() => {
    if (!currentTask) return 0;
    const restMinutes = currentTask.restTime ?? routine.restTime ?? 0;
    return Math.round(restMinutes * 60);
  }, [currentTask, routine.restTime]);

  // Persist state helper
  const persistState = useCallback((overrides?: Partial<TimerState>) => {
    if (!currentTask) return;
    const state: TimerState = {
      routineId: routine.id,
      taskId: currentTask.id,
      startTimestamp: startTimeRef.current,
      totalDuration: totalDurationRef.current,
      pausedRemaining: pausedRemainingRef.current,
      isResting,
      isPaused: !isRunning,
      ...overrides,
    };
    saveTimerState(state);
  }, [currentTask, routine.id, isResting, isRunning]);

  // Try to restore from localStorage on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const saved = loadTimerState();
    if (!saved || saved.routineId !== routine.id) return;

    // Find the task index
    const taskIdx = incompleteTasks.findIndex(t => t.id === saved.taskId);
    if (taskIdx < 0) return;

    setCurrentTaskIndex(taskIdx);
    setIsResting(saved.isResting);
    totalDurationRef.current = saved.totalDuration;

    if (saved.isPaused) {
      pausedRemainingRef.current = saved.pausedRemaining;
      setRemaining(Math.round(saved.pausedRemaining));
      setIsRunning(false);
      if (saved.pausedRemaining < 0) setIsNegative(true);
    } else {
      // Calculate elapsed since startTimestamp
      const elapsed = (Date.now() - saved.startTimestamp) / 1000;
      const newRemaining = Math.round(saved.pausedRemaining - elapsed);
      pausedRemainingRef.current = saved.pausedRemaining;
      startTimeRef.current = saved.startTimestamp;
      setRemaining(newRemaining);
      setIsRunning(true);
      if (newRemaining < 0) setIsNegative(true);
    }
  }, []);

  // Initialize timer for current task (skip if restored)
  useEffect(() => {
    if (!restoredRef.current) return; // wait for restore check
    const saved = loadTimerState();
    // If we just restored this exact task, don't reinitialize
    if (saved && saved.routineId === routine.id && saved.taskId === currentTask?.id) {
      // Clear saved so next task change initializes fresh
      // Actually, only clear if task changed from what was saved
      return;
    }

    if (currentTask && !isResting) {
      const secs = getTaskSeconds();
      totalDurationRef.current = secs;
      startTimeRef.current = Date.now();
      pausedRemainingRef.current = secs;
      setRemaining(secs);
      setIsNegative(false);
      setSoundPlayed(false);
      setIsRunning(true);

      // Schedule SW notification for when timer hits zero
      scheduleTimerNotification(
        `task-${currentTask.id}`,
        secs * 1000,
        `✅ ${currentTask.name}`,
        t('timer.timeUp', 'Tempo esgotado!'),
        'timer-task-complete'
      );

      // Show persistent notification
      showNotification(`⏱️ ${currentTask.name}`, t('timer.inProgress', 'Timer em andamento'), {
        tag: 'active-timer',
      });

      persistState({
        taskId: currentTask.id,
        startTimestamp: Date.now(),
        totalDuration: secs,
        pausedRemaining: secs,
        isResting: false,
        isPaused: false,
      });
    }
  }, [currentTaskIndex, currentTask?.id]);

  // Timestamp-based interval + visibilitychange for background accuracy
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const recalculate = () => {
      if (!isRunning) return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newRemaining = Math.round(pausedRemainingRef.current - elapsed);
      if (newRemaining < 0 && !isNegative) {
        setIsNegative(true);
      }
      setRemaining(newRemaining);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        recalculate();
      }
    };

    if (isRunning) {
      startTimeRef.current = Date.now();
      intervalId = setInterval(recalculate, 1000);
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isRunning, isNegative]);

  // Handle pause/resume
  const toggleRunning = () => {
    setIsRunning(prev => {
      if (prev) {
        // Pausing
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        pausedRemainingRef.current = pausedRemainingRef.current - elapsed;
        cancelTimerNotification(`task-${currentTask?.id}`, 'timer-task-complete');
        persistState({ isPaused: true, pausedRemaining: pausedRemainingRef.current });
      } else {
        // Resuming
        startTimeRef.current = Date.now();
        if (currentTask && pausedRemainingRef.current > 0) {
          scheduleTimerNotification(
            `task-${currentTask.id}`,
            pausedRemainingRef.current * 1000,
            `✅ ${currentTask.name}`,
            t('timer.timeUp', 'Tempo esgotado!'),
            'timer-task-complete'
          );
        }
        persistState({ isPaused: false, startTimestamp: Date.now() });
      }
      return !prev;
    });
  };

  // Play sound at 0
  useEffect(() => {
    if (remaining <= 0 && !soundPlayed) {
      playCompletionSound();
      setSoundPlayed(true);
      if (isResting) {
        advanceToNextTask();
      } else if (currentTask) {
        showNotification(`✅ ${currentTask.name}`, t('timer.timeUp', 'Tempo esgotado!'), {
          tag: 'timer-task-complete',
          vibrate: [200, 100, 200, 100, 200],
          requireInteraction: true,
        });
      }
    }
  }, [remaining, soundPlayed]);

  const handleClose = () => {
    clearTimerState();
    cancelAllTimerNotifications();
    onClose();
  };

  const advanceToNextTask = () => {
    setIsResting(false);
    if (incompleteTasks.length > 1) {
      setIsRunning(true);
      setIsNegative(false);
      setSoundPlayed(false);
      // Clear saved state so next task initializes fresh
      clearTimerState();
    } else {
      clearTimerState();
      cancelAllTimerNotifications();
      onClose();
    }
  };

  const handleComplete = () => {
    if (!currentTask) return;

    if (isResting) {
      advanceToNextTask();
      return;
    }

    // Cancel any scheduled notification for this task
    cancelTimerNotification(`task-${currentTask.id}`, 'timer-task-complete');

    // Show completion notification
    showNotification(
      `✅ ${currentTask.name}`,
      `Tarefa ${currentTask.name} concluída! ⭐ Hora da próxima!`,
      { tag: 'timer-task-complete', vibrate: [200, 100, 200, 100, 200], requireInteraction: false }
    );

    onCompleteTask(currentTask.id);

    const restSecs = getRestSeconds();
    if (restSecs > 0 && incompleteTasks.length > 1) {
      setIsResting(true);
      totalDurationRef.current = restSecs;
      startTimeRef.current = Date.now();
      pausedRemainingRef.current = restSecs;
      setRemaining(restSecs);
      setIsNegative(false);
      setSoundPlayed(false);
      setIsRunning(true);

      persistState({
        startTimestamp: Date.now(),
        totalDuration: restSecs,
        pausedRemaining: restSecs,
        isResting: true,
        isPaused: false,
      });
    } else {
      advanceToNextTask();
    }
  };

  const handleSkip = () => {
    cancelTimerNotification(`task-${currentTask?.id}`, 'timer-task-complete');
    if (isResting) {
      advanceToNextTask();
      return;
    }
    if (currentTaskIndex < incompleteTasks.length - 1) {
      clearTimerState();
      setCurrentTaskIndex(prev => prev + 1);
      setIsRunning(true);
      setIsNegative(false);
      setSoundPlayed(false);
    } else {
      clearTimerState();
      cancelAllTimerNotifications();
      onClose();
    }
  };

  if (!currentTask) return null;

  const totalSeconds = isResting ? totalDurationRef.current : getTaskSeconds();
  const absRemaining = Math.abs(remaining);
  const progress = totalSeconds > 0 ? Math.max(0, remaining / totalSeconds) : 0;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const displayMinutes = Math.floor(absRemaining / 60);
  const displaySeconds = absRemaining % 60;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-background flex flex-col"
    >
      {/* Header */}
      <div className="px-5 pt-12 pb-2 flex items-center justify-between">
        <div />
        <h2 className="text-display text-lg">{routine.name}</h2>
        <button onClick={handleClose} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress segments */}
      <div className="px-8 py-3 flex gap-1.5">
        {incompleteTasks.map((task, i) => (
          <div
            key={task.id}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= currentTaskIndex ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Task list preview OR Rest card */}
      <div className="px-5 space-y-2 mb-2 max-h-36 overflow-y-auto">
        <AnimatePresence mode="wait">
          {isResting ? (
            <motion.div
              key="rest-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-card shadow-soft"
            >
              <div className="w-12 h-12 rounded-full bg-[hsl(140,40%,92%)] flex items-center justify-center">
                <span className="text-2xl">🌴</span>
              </div>
              <div className="flex-1">
                <span className="font-semibold text-sm">{t('timer.restTime', 'Tempo de descanso')}</span>
                <span className="text-xs text-muted-foreground ml-2">{formatDuration(getRestSeconds() / 60)}</span>
              </div>
            </motion.div>
          ) : (
            incompleteTasks.slice(currentTaskIndex, currentTaskIndex + 3).map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  i === 0 ? 'bg-card shadow-soft' : 'bg-muted/50 opacity-60'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[hsl(0,0%,96%)] dark:bg-muted flex items-center justify-center overflow-hidden">
                  {isImageIcon(task.icon) ? (
                    <img src={task.icon} alt="" className="w-6 h-6 object-contain pointer-events-none" draggable={false} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.querySelector('.fallback-icon')?.classList.remove('hidden'); }} />
                  ) : null}
                  <span className={`text-xl fallback-icon ${isImageIcon(task.icon) ? 'hidden' : ''}`}>{isImageIcon(task.icon) ? '📋' : task.icon}</span>
                </div>
                <div className="flex-1">
                  <span className="font-medium text-sm">{task.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{formatDuration(task.duration || 1)}</span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Circular timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="relative w-64 h-64">
          <div className={`absolute inset-[-8px] rounded-full transition-colors ${isNegative ? 'bg-[hsl(0,80%,90%)]/30' : isResting ? 'bg-[hsl(140,40%,85%)]/30' : 'bg-primary/20'}`} />
          <div className={`absolute inset-0 rounded-full flex flex-col items-center justify-center transition-colors ${isNegative ? 'bg-[hsl(0,80%,85%)]' : isResting ? 'bg-[hsl(140,45%,75%)]' : 'bg-primary'}`}>
            <span className="text-5xl font-semibold text-white text-numbers tracking-tight leading-none">
              {isNegative ? '-' : ''}{String(displayMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}
            </span>
            {isResting && (
              <span className="text-white/80 text-sm mt-2">🌴 {t('timer.restTime', 'Tempo de descanso')}</span>
            )}
          </div>
          <svg className="absolute inset-[-8px] -rotate-90" viewBox="0 0 280 280">
            <circle cx="140" cy="140" r={radius} fill="none" stroke="hsl(350, 80%, 80%)" strokeWidth={4} opacity={0.3} />
            {!isNegative && (
              <motion.circle
                cx="140" cy="140" r={radius}
                fill="none" stroke="white" strokeWidth={5} strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                opacity={0.6}
              />
            )}
          </svg>
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 pb-10">
        <div className="flex items-center justify-center gap-4">
          <button onClick={toggleRunning} className="w-12 h-12 flex items-center justify-center text-primary">
            {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
          </button>
          <button
            onClick={handleComplete}
            className="flex-1 max-w-[240px] h-14 rounded-full bg-primary text-primary-foreground font-semibold text-lg shadow-lg active:scale-[0.97] transition-transform"
          >
            {isResting ? t('timer.skipRest', 'Pular descanso') : t('timer.done', 'Concluído')}
          </button>
          <button onClick={handleSkip} className="w-12 h-12 flex items-center justify-center text-primary">
            <SkipForward className="w-7 h-7" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
