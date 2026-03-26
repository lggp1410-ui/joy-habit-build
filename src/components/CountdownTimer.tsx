import { useState, useEffect, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, SkipForward, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Routine, formatDuration, isImageIcon } from '@/types/routine';
import { playCompletionSound } from '@/utils/completionSound';

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
  const totalSeconds = currentTask ? (currentTask.duration || 1) * 60 : 60;

  const [remaining, setRemaining] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [isNegative, setIsNegative] = useState(false);
  const [soundPlayed, setSoundPlayed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const absRemaining = Math.abs(remaining);
  const progress = totalSeconds > 0 ? Math.max(0, remaining / totalSeconds) : 0;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const displayMinutes = Math.floor(absRemaining / 60);
  const displaySeconds = absRemaining % 60;

  useEffect(() => {
    if (currentTask) {
      const secs = (currentTask.duration || 1) * 60;
      setRemaining(secs);
      setIsNegative(false);
      setSoundPlayed(false);
    }
  }, [currentTaskIndex]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          const next = prev - 1;
          if (next < 0 && !isNegative) {
            setIsNegative(true);
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // Play sound exactly at 0
  useEffect(() => {
    if (remaining <= 0 && !soundPlayed) {
      playCompletionSound();
      setSoundPlayed(true);
    }
  }, [remaining, soundPlayed]);

  const handleComplete = () => {
    if (!currentTask) return;
    onCompleteTask(currentTask.id);
    if (currentTaskIndex < incompleteTasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
      setIsRunning(true);
      setIsNegative(false);
      setSoundPlayed(false);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
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

      {/* Task list preview - no clickable icons */}
      <div className="px-5 space-y-2 mb-2 max-h-36 overflow-y-auto">
        {incompleteTasks.slice(currentTaskIndex, currentTaskIndex + 3).map((task, i) => (
          <div
            key={task.id}
            className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
              i === 0 ? 'bg-card shadow-soft' : 'bg-muted/50 opacity-60'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[hsl(0,0%,96%)] dark:bg-muted flex items-center justify-center overflow-hidden">
              {isImageIcon(task.icon) ? (
                <img src={task.icon} alt="" className="w-6 h-6 object-contain pointer-events-none" draggable={false} />
              ) : (
                <span className="text-xl">{task.icon}</span>
              )}
            </div>
            <div className="flex-1">
              <span className="font-medium text-sm">{task.name}</span>
              <span className="text-xs text-muted-foreground ml-2">{formatDuration(task.duration || 1)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Circular timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="relative w-64 h-64">
          <div className={`absolute inset-[-8px] rounded-full transition-colors ${isNegative ? 'bg-[hsl(0,80%,90%)]/30' : 'bg-primary/20'}`} />
          <div className={`absolute inset-0 rounded-full flex flex-col items-center justify-center transition-colors ${isNegative ? 'bg-[hsl(0,80%,85%)]' : 'bg-primary'}`}>
            <span className="text-5xl font-semibold text-white text-numbers tracking-tight leading-none">
              {isNegative ? '-' : ''}{String(displayMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}
            </span>
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
          <button onClick={() => setIsRunning(r => !r)} className="w-12 h-12 flex items-center justify-center text-primary">
            {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
          </button>
          <button
            onClick={handleComplete}
            className="flex-1 max-w-[240px] h-14 rounded-full bg-primary text-primary-foreground font-semibold text-lg shadow-lg active:scale-[0.97] transition-transform"
          >
            {t('timer.done', 'Concluído')}
          </button>
          <button onClick={handleSkip} className="w-12 h-12 flex items-center justify-center text-primary">
            <SkipForward className="w-7 h-7" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});