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
  startPersistentTimerNotification,
  updatePersistentTimerNotification,
  stopPersistentTimerNotification,
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

export const CountdownTimer = forwardRef<HTMLDivElement, CountdownTimerProps>(
  function CountdownTimer({ routine, onClose, onCompleteTask }, _ref) {
    const { t } = useTranslation();
    // Fall back to all tasks if none are incomplete, so Iniciar always works
    const rawIncomplete = routine.tasks.filter((t) => !t.completed);
    const incompleteTasks = rawIncomplete.length > 0 ? rawIncomplete : routine.tasks;
    const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
    const currentTask = incompleteTasks[currentTaskIndex];

    const [isResting, setIsResting] = useState(false);
    const [isRunning, setIsRunning] = useState(true);
    const [isNegative, setIsNegative] = useState(false);
    const [soundPlayed, setSoundPlayed] = useState(false);
    const [remaining, setRemaining] = useState(0);
    const [timerInitialized, setTimerInitialized] = useState(false);
    const [notifPermission, setNotifPermission] = useState(false);

    // Timestamp-based timing for background accuracy
    const startTimeRef = useRef<number>(Date.now());
    const totalDurationRef = useRef<number>(0);
    const pausedRemainingRef = useRef<number>(0);
    const restoredRef = useRef(false);
    const tickTimeoutRef = useRef<number | null>(null);
    const lastRenderedSecondRef = useRef<number | null>(null);
    const lastVisibilityRef = useRef<DocumentVisibilityState>(document.visibilityState);
    const lastNotifUpdateRef = useRef<number>(0);
    // Track last value sent to persistent notification to avoid duplicate calls
    const lastNotifSecondRef = useRef<number | null>(null);

    // ── Helpers ──────────────────────────────────────────────────────────

    const getTaskSeconds = useCallback(() => {
      return currentTask ? (currentTask.duration || 1) * 60 : 60;
    }, [currentTask]);

    const getRestSeconds = useCallback(() => {
      if (!currentTask) return 0;
      const restMinutes = currentTask.restTime ?? routine.restTime ?? 0;
      return Math.round(restMinutes * 60);
    }, [currentTask, routine.restTime]);

    const getSelectedSoundConfig = useCallback(() => {
      const soundKey = localStorage.getItem('planlizz-sound') || 'pop';
      const soundMap: Record<string, string> = {
        arrow: '/sounds/Flecha.m4a',
        bark: '/sounds/Latido.m4a',
        birds: '/sounds/Passaros.mp3',
        correctDing: '/sounds/Correto.m4a',
        ding: '/sounds/Ding.m4a',
        meow: '/sounds/Gatinho.m4a',
        pop: '/sounds/Pop.m4a',
        successDing: '/sounds/Conquista.m4a',
        whistle: '/sounds/Apito.m4a',
      };
      return {
        playSound: soundKey !== 'none',
        soundUrl: soundMap[soundKey] || '/sounds/Pop.m4a',
      };
    }, []);

    const getCurrentRemainingSeconds = useCallback((now = Date.now()) => {
      const elapsedMs = now - startTimeRef.current;
      const diffMs = pausedRemainingRef.current * 1000 - elapsedMs;
      if (diffMs >= 0) return Math.ceil(diffMs / 1000);
      return Math.floor(diffMs / 1000);
    }, []);

    const formatTimerValue = useCallback((secs: number) => {
      const abs = Math.abs(secs);
      const m = Math.floor(abs / 60).toString().padStart(2, '0');
      const s = (abs % 60).toString().padStart(2, '0');
      return `${secs < 0 ? '-' : ''}${m}:${s}`;
    }, []);

    const syncTimerDisplay = useCallback((nextRemaining: number) => {
      if (lastRenderedSecondRef.current === nextRemaining) return;
      lastRenderedSecondRef.current = nextRemaining;
      setRemaining(nextRemaining);
      setIsNegative((prev) => {
        const shouldBeNegative = nextRemaining < 0;
        return prev === shouldBeNegative ? prev : shouldBeNegative;
      });
    }, []);

    // ── Persistent notification ──────────────────────────────────────────

    const getNotifLabel = useCallback(() => {
      if (!currentTask) return routine.name;
      return isResting ? t('timer.restTime', 'Tempo de descanso') : currentTask.name;
    }, [currentTask, isResting, routine.name, t]);

    /**
     * Sends the current timer state to the persistent SW notification.
     * Only fires once per second (de-duplicated by lastNotifSecondRef).
     */
    const syncPersistentNotification = useCallback(
      async (nextRemaining: number, isStart = false) => {
        const hasPermission =
          notifPermission ||
          ('Notification' in window && Notification.permission === 'granted');
        if (!hasPermission) return;
        if (!isStart && lastNotifSecondRef.current === nextRemaining) return;
        lastNotifSecondRef.current = nextRemaining;

        const label = getNotifLabel();
        const display = formatTimerValue(nextRemaining);

        if (isStart) {
          await startPersistentTimerNotification(label, display, isResting, routine.id);
        } else {
          await updatePersistentTimerNotification(label, display, isResting, routine.id);
        }
      },
      [notifPermission, getNotifLabel, formatTimerValue, isResting, routine.id]
    );

    // ── Permission request ───────────────────────────────────────────────

    useEffect(() => {
      requestNotificationPermission().then((granted) => {
        setNotifPermission(granted);
      });
    }, []);

    // ── Persist state helper ─────────────────────────────────────────────

    const persistState = useCallback(
      (overrides?: Partial<TimerState>) => {
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
      },
      [currentTask, routine.id, isResting, isRunning]
    );

    // ── Restore from localStorage on mount ──────────────────────────────

    useEffect(() => {
      if (restoredRef.current) return;
      restoredRef.current = true;

      const saved = loadTimerState();
      if (!saved || saved.routineId !== routine.id) return;

      const taskIdx = incompleteTasks.findIndex((t) => t.id === saved.taskId);
      if (taskIdx < 0) return;

      setCurrentTaskIndex(taskIdx);
      setIsResting(saved.isResting);
      totalDurationRef.current = saved.totalDuration;

      if (saved.isPaused) {
        pausedRemainingRef.current = saved.pausedRemaining;
        lastRenderedSecondRef.current = Math.round(saved.pausedRemaining);
        setRemaining(Math.round(saved.pausedRemaining));
        setIsRunning(false);
        if (saved.pausedRemaining < 0) setIsNegative(true);
      } else {
        pausedRemainingRef.current = saved.pausedRemaining;
        startTimeRef.current = saved.startTimestamp;
        const newRemaining = getCurrentRemainingSeconds();
        lastRenderedSecondRef.current = newRemaining;
        setRemaining(newRemaining);
        setIsRunning(true);
        if (newRemaining < 0) setIsNegative(true);
      }
      setTimerInitialized(true);
    }, [getCurrentRemainingSeconds, incompleteTasks, routine.id]);

    // ── Initialize timer for current task ───────────────────────────────

    const scheduleTaskCompletionAlert = useCallback(
      (taskId: string, taskName: string, delaySeconds: number) => {
        if (delaySeconds <= 0) return;
        const { playSound, soundUrl } = getSelectedSoundConfig();
        scheduleTimerNotification(
          `task-${taskId}`,
          Math.max(0, Math.ceil(delaySeconds * 1000)),
          `✅ ${taskName}`,
          t('timer.timeUp', 'Tempo esgotado!'),
          'timer-task-complete',
          {
            playSound,
            soundUrl,
            data: {
              url: `/?routineId=${encodeURIComponent(routine.id)}&timer=1`,
              routineId: routine.id,
              openTimer: true,
              type: 'timer-task-complete',
            },
          }
        );
      },
      [getSelectedSoundConfig, routine.id, t]
    );

    useEffect(() => {
      if (!restoredRef.current) return;
      const saved = loadTimerState();
      if (
        saved &&
        saved.routineId === routine.id &&
        saved.taskId === currentTask?.id
      )
        return;

      if (currentTask && !isResting) {
        const secs = getTaskSeconds();
        const now = Date.now();
        totalDurationRef.current = secs;
        startTimeRef.current = now;
        pausedRemainingRef.current = secs;
        lastRenderedSecondRef.current = secs;
        lastNotifSecondRef.current = null;
        setRemaining(secs);
        setIsNegative(false);
        setSoundPlayed(false);
        setIsRunning(true);
        setTimerInitialized(true);

        scheduleTaskCompletionAlert(currentTask.id, currentTask.name, secs);

        persistState({
          taskId: currentTask.id,
          startTimestamp: now,
          totalDuration: secs,
          pausedRemaining: secs,
          isResting: false,
          isPaused: false,
        });

        // Start persistent notification
        if (notifPermission) {
          startPersistentTimerNotification(
            currentTask.name,
            formatTimerValue(secs),
            false,
            routine.id
          );
          lastNotifSecondRef.current = secs;
        }
      }
    }, [
      currentTaskIndex,
      currentTask?.id,
      getTaskSeconds,
      isResting,
      persistState,
      routine.id,
      scheduleTaskCompletionAlert,
      notifPermission,
      formatTimerValue,
    ]);

    useEffect(() => {
      if (!isRunning || !timerInitialized || !currentTask) return;
      const hasPermission =
        notifPermission ||
        ('Notification' in window && Notification.permission === 'granted');
      if (!hasPermission) return;

      const nextRemaining = getCurrentRemainingSeconds();
      syncTimerDisplay(nextRemaining);
      syncPersistentNotification(nextRemaining, true);
    }, [
      currentTask,
      getCurrentRemainingSeconds,
      isRunning,
      notifPermission,
      syncPersistentNotification,
      syncTimerDisplay,
      timerInitialized,
    ]);

    // ── Main tick loop ───────────────────────────────────────────────────

    useEffect(() => {
      const clearTick = () => {
        if (tickTimeoutRef.current !== null) {
          window.clearTimeout(tickTimeoutRef.current);
          tickTimeoutRef.current = null;
        }
      };

      const tick = () => {
        if (!isRunning || !timerInitialized) return;

        const now = Date.now();
        const nextRemaining = getCurrentRemainingSeconds(now);

        syncTimerDisplay(nextRemaining);

        // Update persistent notification every second (all the time, not just background)
        syncPersistentNotification(nextRemaining);

        const elapsedMs = now - startTimeRef.current;
        const remainderMs = elapsedMs % 1000;
        const nextDelay = remainderMs === 0 ? 1000 : 1000 - remainderMs;

        clearTick();
        tickTimeoutRef.current = window.setTimeout(tick, nextDelay);
      };

      const resyncFromClock = () => {
        if (!isRunning || !timerInitialized) return;
        lastNotifUpdateRef.current = 0;
        tick();
      };

      const handleVisibility = () => {
        const previousVisibility = lastVisibilityRef.current;
        lastVisibilityRef.current = document.visibilityState;
        if (
          document.visibilityState === 'hidden' ||
          previousVisibility === 'hidden'
        ) {
          resyncFromClock();
        }
      };

      if (isRunning && timerInitialized) {
        tick();
      }

      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('focus', resyncFromClock);
      window.addEventListener('pageshow', resyncFromClock);

      return () => {
        clearTick();
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('focus', resyncFromClock);
        window.removeEventListener('pageshow', resyncFromClock);
      };
    }, [
      currentTask,
      getCurrentRemainingSeconds,
      isRunning,
      syncTimerDisplay,
      timerInitialized,
      syncPersistentNotification,
    ]);

    // ── Sound at 0 ──────────────────────────────────────────────────────

    useEffect(() => {
      if (!timerInitialized || soundPlayed) return;
      if (remaining <= 0) {
        playCompletionSound();
        setSoundPlayed(true);
        if (isResting) {
          advanceToNextTask();
        } else if (currentTask) {
          showNotification(
            `✅ ${currentTask.name}`,
            t('timer.timeUp', 'Tempo esgotado!'),
            {
              tag: 'timer-task-complete',
              vibrate: [200, 100, 200, 100, 200],
              requireInteraction: true,
              data: {
                url: `/?routineId=${encodeURIComponent(routine.id)}&timer=1`,
                routineId: routine.id,
                openTimer: true,
                type: 'timer-task-complete',
              },
            }
          );
        }
      }
    }, [remaining, soundPlayed, timerInitialized]);

    // ── Controls ─────────────────────────────────────────────────────────

    const handleClose = () => {
      if (tickTimeoutRef.current !== null) {
        window.clearTimeout(tickTimeoutRef.current);
        tickTimeoutRef.current = null;
      }
      clearTimerState();
      cancelAllTimerNotifications();
      stopPersistentTimerNotification();
      onClose();
    };

    const advanceToNextTask = () => {
      setIsResting(false);
      if (incompleteTasks.length > 1) {
        setIsRunning(true);
        setIsNegative(false);
        setSoundPlayed(false);
        lastNotifSecondRef.current = null;
        clearTimerState();
      } else {
        clearTimerState();
        cancelAllTimerNotifications();
        stopPersistentTimerNotification();
        onClose();
      }
    };

    const handleComplete = () => {
      if (!currentTask) return;

      if (isResting) {
        advanceToNextTask();
        return;
      }

      cancelTimerNotification(`task-${currentTask.id}`, 'timer-task-complete');

      showNotification(
        `✅ ${currentTask.name}`,
        `Tarefa ${currentTask.name} concluída! ⭐ Hora da próxima!`,
        {
          tag: 'timer-task-complete',
          vibrate: [200, 100, 200, 100, 200],
          requireInteraction: false,
        }
      );

      onCompleteTask(currentTask.id);

      const restSecs = getRestSeconds();
      if (restSecs > 0 && incompleteTasks.length > 1) {
        const now = Date.now();
        setIsResting(true);
        totalDurationRef.current = restSecs;
        startTimeRef.current = now;
        pausedRemainingRef.current = restSecs;
        lastRenderedSecondRef.current = restSecs;
        lastNotifSecondRef.current = null;
        setRemaining(restSecs);
        setIsNegative(false);
        setSoundPlayed(false);
        setIsRunning(true);

        persistState({
          startTimestamp: now,
          totalDuration: restSecs,
          pausedRemaining: restSecs,
          isResting: true,
          isPaused: false,
        });

        // Update persistent notification for rest
        if (notifPermission) {
          startPersistentTimerNotification(
            t('timer.restTime', 'Tempo de descanso'),
            formatTimerValue(restSecs),
            true,
            routine.id
          );
          lastNotifSecondRef.current = restSecs;
        }
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
        lastNotifSecondRef.current = null;
        setCurrentTaskIndex((prev) => prev + 1);
        setIsRunning(true);
        setIsNegative(false);
        setSoundPlayed(false);
      } else {
        clearTimerState();
        cancelAllTimerNotifications();
        stopPersistentTimerNotification();
        onClose();
      }
    };

    const toggleRunning = () => {
      setIsRunning((prev) => {
        if (prev) {
          // Pausing
          const nextRemaining = getCurrentRemainingSeconds();
          pausedRemainingRef.current = nextRemaining;
          lastRenderedSecondRef.current = nextRemaining;
          setRemaining(nextRemaining);
          setIsNegative(nextRemaining < 0);
          cancelTimerNotification(`task-${currentTask?.id}`, 'timer-task-complete');
          persistState({ isPaused: true, pausedRemaining: pausedRemainingRef.current });
          // Update notification to show paused state
          if (notifPermission && currentTask) {
            updatePersistentTimerNotification(
              `${currentTask.name} ⏸`,
              formatTimerValue(nextRemaining),
              isResting,
              routine.id
            );
          }
        } else {
          // Resuming
          startTimeRef.current = Date.now();
          lastRenderedSecondRef.current = pausedRemainingRef.current;
          lastNotifSecondRef.current = null;
          if (currentTask && pausedRemainingRef.current > 0) {
            scheduleTaskCompletionAlert(
              currentTask.id,
              currentTask.name,
              pausedRemainingRef.current
            );
          }
          persistState({ isPaused: false, startTimestamp: Date.now() });
        }
        return !prev;
      });
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
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          >
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
                  <span className="font-semibold text-sm">
                    {t('timer.restTime', 'Tempo de descanso')}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDuration(getRestSeconds() / 60)}
                  </span>
                </div>
              </motion.div>
            ) : (
              incompleteTasks
                .slice(currentTaskIndex, currentTaskIndex + 3)
                .map((task, i) => (
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
                        <img
                          src={task.icon}
                          alt=""
                          className="w-6 h-6 object-contain pointer-events-none"
                          draggable={false}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement)
                              .parentElement!.querySelector('.fallback-icon');
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <span
                        className={`text-xl fallback-icon ${
                          isImageIcon(task.icon) ? 'hidden' : ''
                        }`}
                      >
                        {isImageIcon(task.icon) ? '📋' : task.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-sm">{task.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDuration(task.duration || 1)}
                      </span>
                    </div>
                  </motion.div>
                ))
            )}
          </AnimatePresence>
        </div>

        {/* Circular timer */}
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <div className="relative w-64 h-64">
            <div
              className={`absolute inset-[-8px] rounded-full transition-colors ${
                isNegative
                  ? 'bg-[hsl(0,80%,90%)]/30'
                  : isResting
                  ? 'bg-[hsl(140,40%,85%)]/30'
                  : 'bg-primary/20'
              }`}
            />
            <div
              className={`absolute inset-0 rounded-full flex flex-col items-center justify-center transition-colors ${
                isNegative
                  ? 'bg-[hsl(0,80%,85%)]'
                  : isResting
                  ? 'bg-[hsl(140,45%,75%)]'
                  : 'bg-primary'
              }`}
            >
              <span className="text-5xl font-semibold text-white text-numbers tracking-tight leading-none">
                {isNegative ? '-' : ''}
                {String(displayMinutes).padStart(2, '0')}:
                {String(displaySeconds).padStart(2, '0')}
              </span>
              {isResting && (
                <span className="text-white/80 text-sm mt-2">
                  🌴 {t('timer.restTime', 'Tempo de descanso')}
                </span>
              )}
            </div>
            <svg className="absolute inset-[-8px] -rotate-90" viewBox="0 0 280 280">
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="hsl(350, 80%, 80%)"
                strokeWidth={4}
                opacity={0.3}
              />
              {!isNegative && (
                <motion.circle
                  cx="140"
                  cy="140"
                  r={radius}
                  fill="none"
                  stroke="white"
                  strokeWidth={5}
                  strokeLinecap="round"
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
            <button
              onClick={toggleRunning}
              className="w-12 h-12 flex items-center justify-center text-primary"
            >
              {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 max-w-[240px] h-14 rounded-full bg-primary text-primary-foreground font-semibold text-lg shadow-lg active:scale-[0.97] transition-transform"
            >
              {isResting
                ? t('timer.skipRest', 'Pular descanso')
                : t('timer.done', 'Concluído')}
            </button>
            <button
              onClick={handleSkip}
              className="w-12 h-12 flex items-center justify-center text-primary"
            >
              <SkipForward className="w-7 h-7" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }
);
