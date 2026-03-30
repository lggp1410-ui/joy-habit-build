import { useState, useEffect, useRef, forwardRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, SkipForward, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Routine, formatDuration, isImageIcon } from '@/types/routine';
import { playCompletionSound } from '@/utils/completionSound';
import { showNotification } from '@/utils/notifications';

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

  const getTaskSeconds = useCallback(() => {
    return currentTask ? (currentTask.duration || 1) * 60 : 60;
  }, [currentTask]);

  const getRestSeconds = useCallback(() => {
    if (!currentTask) return 0;
    const restMinutes = currentTask.restTime ?? routine.restTime ?? 0;
    return Math.round(restMinutes * 60);
  }, [currentTask, routine.restTime]);

  // Initialize timer for current task
  useEffect(() => {
    if (currentTask && !isResting) {
      const secs = getTaskSeconds();
      totalDurationRef.current = secs;
      startTimeRef.current = Date.now();
      pausedRemainingRef.current = secs;
      setRemaining(secs);
      setIsNegative(false);
      setSoundPlayed(false);
      setIsRunning(true);
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

  // Handle pause/resume - save remaining on pause
  const toggleRunning = () => {
    setIsRunning(prev => {
      if (prev) {
        // Pausing: save current remaining
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        pausedRemainingRef.current = pausedRemainingRef.current - elapsed;
      } else {
        // Resuming: reset start time
        startTimeRef.current = Date.now();
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
        // Auto-advance after rest ends
        advanceToNextTask();
      } else if (currentTask) {
        showNotification(`✅ ${currentTask.name}`, t('timer.timeUp', 'Tempo esgotado!'));
      }
    }
  }, [remaining, soundPlayed]);

  // Show background notification when timer starts
  useEffect(() => {
    if (isRunning && currentTask && !isResting) {
      showNotification(`⏱️ ${currentTask.name}`, t('timer.inProgress', 'Timer em andamento'));
    }
  }, [currentTask?.id, isResting]);

  const advanceToNextTask = () => {
    setIsResting(false);
    if (incompleteTasks.length > 1) {
      // Task was already completed, incompleteTasks shrunk
      setIsRunning(true);
      setIsNegative(false);
      setSoundPlayed(false);
    } else {
      onClose();
    }
  };

  const handleComplete = () => {
    if (!currentTask) return;

    if (isResting) {
      // Skip rest → advance
      advanceToNextTask();
      return;
    }

    onCompleteTask(currentTask.id);

    // Check for rest time
    const restSecs = getRestSeconds();
    if (restSecs > 0 && incompleteTasks.length > 1) {
      // Enter rest mode
      setIsResting(true);
      totalDurationRef.current = restSecs;
      startTimeRef.current = Date.now();
      pausedRemainingRef.current = restSecs;
      setRemaining(restSecs);
      setIsNegative(false);
      setSoundPlayed(false);
      setIsRunning(true);
    } else {
      advanceToNextTask();
    }
  };

  const handleSkip = () => {
    if (isResting) {
      advanceToNextTask();
      return;
    }
    if (currentTaskIndex < incompleteTasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
      setIsRunning(true);
      setIsNegative(false);
      setSoundPlayed(false);
    } else {
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

  const circleColor = isNegative ? 'hsl(0, 80%, 85%)' : 'hsl(var(--primary))';

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
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
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
