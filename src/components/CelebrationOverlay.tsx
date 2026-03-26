import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface CelebrationOverlayProps {
  show: boolean;
  onDismiss: () => void;
}

// Generate confetti particles
function generateConfetti(count: number) {
  const colors = ['#FFD1DC', '#FFB6C8', '#FFDAA5', '#FFE8A0', '#D4F0FF', '#E8D5FF', '#FF9EC4'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 10,
    rotation: Math.random() * 360,
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  }));
}

export function CelebrationOverlay({ show, onDismiss }: CelebrationOverlayProps) {
  const { t } = useTranslation();
  const [confetti] = useState(() => generateConfetti(50));

  useEffect(() => {
    if (show) {
      const timer = setTimeout(onDismiss, 4500);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FFD1DC 0%, #FFB6C8 40%, #FFDAA5 100%)' }}
          onClick={onDismiss}
        >
          {/* Confetti particles */}
          {confetti.map((p) => (
            <motion.div
              key={p.id}
              initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
              animate={{
                y: '110vh',
                rotate: p.rotation + 720,
                opacity: [1, 1, 0.5, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: 'easeIn',
              }}
              className="absolute top-0"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.shape === 'circle' ? p.size : p.size * 1.5,
                backgroundColor: p.color,
                borderRadius: p.shape === 'circle' ? '50%' : '2px',
              }}
            />
          ))}

          {/* Central text */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', damping: 12 }}
            className="flex flex-col items-center z-10"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.span>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg text-center px-8">
              {t('success.title')}
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-white/80 text-sm mt-3"
            >
              {t('success.message')}
            </motion.p>
          </motion.div>

          {/* Tap to dismiss */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 2.5 }}
            className="absolute bottom-10 text-white/60 text-sm select-none"
          >
            {t('success.tapToDismiss')}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}