import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRoutineStore } from '@/stores/routineStore';
import { Routine, formatDuration } from '@/types/routine';
import { X } from 'lucide-react';

import morningImg from '@/assets/categories/morning.png';
import afternoonImg from '@/assets/categories/afternoon.png';
import learningImg from '@/assets/categories/learning.png';
import beautyImg from '@/assets/categories/beauty.png';
import cookingImg from '@/assets/categories/cooking.png';

const SUGGESTED_ROUTINES: (Omit<Routine, 'id'> & { nameKey: string; taskKeys: string[]; categoryIcon: string })[] = [
  {
    nameKey: 'suggestedRoutines.morningWellness',
    name: '',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    time: '06:30',
    category: 'morning',
    categoryIcon: morningImg,
    taskKeys: ['drinkWater', 'stretch', 'skincare', 'breakfast', 'journaling'],
    tasks: [
      { id: '1', name: '', icon: '💧', completed: false, duration: 1 },
      { id: '2', name: '', icon: '🧘', completed: false, duration: 5 },
      { id: '3', name: '', icon: '🧴', completed: false, duration: 10 },
      { id: '4', name: '', icon: '🥐', completed: false, duration: 15 },
      { id: '5', name: '', icon: '📝', completed: false, duration: 10 },
    ],
  },
  {
    nameKey: 'suggestedRoutines.eveningWindDown',
    name: '',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    time: '21:00',
    category: 'afternoon',
    categoryIcon: afternoonImg,
    taskKeys: ['noScreens', 'readBook', 'skincare', 'meditation'],
    tasks: [
      { id: '1', name: '', icon: '📵', completed: false, duration: 1 },
      { id: '2', name: '', icon: '📚', completed: false, duration: 20 },
      { id: '3', name: '', icon: '✨', completed: false, duration: 10 },
      { id: '4', name: '', icon: '😌', completed: false, duration: 10 },
    ],
  },
  {
    nameKey: 'suggestedRoutines.workoutRoutine',
    name: '',
    days: ['Mon', 'Wed', 'Fri'],
    time: '07:00',
    category: 'health',
    categoryIcon: beautyImg,
    taskKeys: ['warmUp', 'strengthTraining', 'cardio', 'coolDown', 'proteinShake'],
    tasks: [
      { id: '1', name: '', icon: '🏃', completed: false, duration: 10 },
      { id: '2', name: '', icon: '💪', completed: false, duration: 30 },
      { id: '3', name: '', icon: '🚴', completed: false, duration: 20 },
      { id: '4', name: '', icon: '🧘', completed: false, duration: 5 },
      { id: '5', name: '', icon: '🥤', completed: false, duration: 2 },
    ],
  },
  {
    nameKey: 'suggestedRoutines.studySession',
    name: '',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    time: '14:00',
    category: 'custom',
    categoryIcon: learningImg,
    taskKeys: ['reviewNotes', 'practiceProblems', 'flashcards', 'shortBreak'],
    tasks: [
      { id: '1', name: '', icon: '📝', completed: false, duration: 20 },
      { id: '2', name: '', icon: '🧪', completed: false, duration: 25 },
      { id: '3', name: '', icon: '📋', completed: false, duration: 15 },
      { id: '4', name: '', icon: '☕', completed: false, duration: 10 },
    ],
  },
  {
    nameKey: 'suggestedRoutines.selfCareSunday',
    name: '',
    days: ['Sun'],
    time: '10:00',
    category: 'health',
    categoryIcon: cookingImg,
    taskKeys: ['faceMask', 'bubbleBath', 'mealPrep', 'planWeek'],
    tasks: [
      { id: '1', name: '', icon: '🧖', completed: false, duration: 15 },
      { id: '2', name: '', icon: '🛁', completed: false, duration: 30 },
      { id: '3', name: '', icon: '🍳', completed: false, duration: 45 },
      { id: '4', name: '', icon: '📅', completed: false, duration: 15 },
    ],
  },
];

export function ExploreScreen() {
  const { addRoutine } = useRoutineStore();
  const { t } = useTranslation();
  const [previewRoutine, setPreviewRoutine] = useState<typeof SUGGESTED_ROUTINES[number] | null>(null);

  const adoptRoutine = (suggested: typeof SUGGESTED_ROUTINES[number]) => {
    addRoutine({
      id: crypto.randomUUID(),
      name: t(suggested.nameKey),
      days: suggested.days,
      time: suggested.time,
      category: suggested.category,
      tasks: suggested.tasks.map((task, i) => ({
        ...task,
        id: crypto.randomUUID(),
        name: t(`suggestedRoutines.${suggested.taskKeys[i]}`),
      })),
    });
    setPreviewRoutine(null);
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="gradient-primary px-5 pt-12 pb-8 rounded-b-card">
        <h1 className="text-display text-2xl">{t('explore.title')}</h1>
        <p className="text-sm text-foreground/60 mt-1">{t('explore.subtitle')}</p>
      </div>

      <div className="px-5 mt-6 space-y-3">
        {SUGGESTED_ROUTINES.map((routine, i) => (
          <motion.div
            key={routine.nameKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-card p-4 cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => setPreviewRoutine(routine)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0">
                    <img src={routine.categoryIcon} alt="" className="w-6 h-6 object-contain" />
                  </div>
                  <div>
                    <h3 className="text-display text-base">{t(routine.nameKey)}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {routine.time} · {routine.days.join(', ')} · {routine.tasks.length} tasks
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewRoutine && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-foreground/20 backdrop-blur-sm"
            onClick={() => setPreviewRoutine(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-card p-5 shadow-soft max-h-[70vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0">
                    <img src={previewRoutine.categoryIcon} alt="" className="w-6 h-6 object-contain" />
                  </div>
                  <div>
                    <h3 className="text-display text-lg">{t(previewRoutine.nameKey)}</h3>
                    <p className="text-xs text-muted-foreground">{previewRoutine.time} · {previewRoutine.days.join(', ')}</p>
                  </div>
                </div>
                <button onClick={() => setPreviewRoutine(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tasks list */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {previewRoutine.tasks.map((task, i) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <div className="w-9 h-9 rounded-full bg-[hsl(0,0%,96%)] dark:bg-muted flex items-center justify-center">
                      <span className="text-lg">{task.icon}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{t(`suggestedRoutines.${previewRoutine.taskKeys[i]}`)}</span>
                      <span className="text-xs text-muted-foreground ml-2">{formatDuration(task.duration || 1)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Adopt button */}
              <button
                onClick={() => adoptRoutine(previewRoutine)}
                className="w-full py-3 bg-primary rounded-full text-primary-foreground font-semibold shadow-lg active:scale-[0.98] transition-transform"
              >
                {t('explore.adoptRoutine')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
