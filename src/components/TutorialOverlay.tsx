import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const TUTORIAL_KEY = 'planlizz-tutorial-done';

interface TutorialStep {
  titleKey: string;
  descKey: string;
  position: 'bottom-right' | 'center' | 'top-right' | 'bottom-center' | 'center-left';
}

const STEPS: TutorialStep[] = [
  { titleKey: 'tutorial.step1Title', descKey: 'tutorial.step1Desc', position: 'bottom-right' },
  { titleKey: 'tutorial.step2Title', descKey: 'tutorial.step2Desc', position: 'center' },
  { titleKey: 'tutorial.step3Title', descKey: 'tutorial.step3Desc', position: 'top-right' },
  { titleKey: 'tutorial.step4Title', descKey: 'tutorial.step4Desc', position: 'center-left' },
  { titleKey: 'tutorial.step5Title', descKey: 'tutorial.step5Desc', position: 'bottom-center' },
];

export function TutorialOverlay({ onDismiss }: { onDismiss?: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(TUTORIAL_KEY);
    if (!done) {
      setVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(TUTORIAL_KEY, 'true');
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  const currentStep = STEPS[step];

  const getPositionClasses = () => {
    switch (currentStep.position) {
      case 'bottom-right': return 'bottom-28 right-6';
      case 'top-right': return 'top-20 right-6';
      case 'center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'center-left': return 'top-1/2 left-6 -translate-y-1/2';
      case 'bottom-center': return 'bottom-28 left-1/2 -translate-x-1/2';
      default: return 'bottom-28 right-6';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-[2px]"
        onClick={handleDismiss}
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`absolute ${getPositionClasses()} max-w-[280px] w-[280px]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Tooltip bubble */}
          <div className="bg-[hsl(350,100%,93%)] rounded-2xl p-5 shadow-lg border border-[hsl(350,80%,85%)]">
            {/* Step indicator */}
            <div className="flex gap-1.5 mb-3">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= step ? 'bg-primary' : 'bg-[hsl(350,60%,80%)]'
                  }`}
                />
              ))}
            </div>

            <h3 className="text-base font-semibold text-foreground mb-1.5">
              {t(currentStep.titleKey)}
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed mb-4">
              {t(currentStep.descKey)}
            </p>

            <div className="flex items-center justify-between">
              <button
                onClick={handleDismiss}
                className="text-sm text-foreground/60 font-medium"
              >
                {t('tutorial.skip', 'Pular')}
              </button>
              <button
                onClick={handleNext}
                className="px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold shadow-sm active:scale-95 transition-transform"
              >
                {step < STEPS.length - 1 ? t('tutorial.gotIt', 'Entendi!') : t('tutorial.finish', 'Começar!')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function resetTutorial() {
  localStorage.removeItem(TUTORIAL_KEY);
}
