import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconPicker } from './IconPicker';
import { WheelPicker } from './WheelPicker';
import { Task, isImageIcon } from '@/types/routine';
import defaultTaskIcon from '@/assets/default-task-icon.png';

const DURATION_H = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const DURATION_M = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const DURATION_S = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface TaskEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  initialTask?: Task | null;
}

export function TaskEditorModal({ isOpen, onClose, onSave, initialTask }: TaskEditorModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(defaultTaskIcon);
  const [durH, setDurH] = useState(0);
  const [durM, setDurM] = useState(0);
  const [durS, setDurS] = useState(30);
  const [restH, setRestH] = useState(0);
  const [restM, setRestM] = useState(0);
  const [restS, setRestS] = useState(0);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showRestPicker, setShowRestPicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setName(initialTask.name);
        setIcon(initialTask.icon);
        const durTotalSecs = Math.round((initialTask.duration || 1) * 60);
        setDurH(Math.floor(durTotalSecs / 3600));
        setDurM(Math.floor((durTotalSecs % 3600) / 60));
        setDurS(durTotalSecs % 60);
        const restTotalSecs = Math.round((initialTask.restTime || 0) * 60);
        setRestH(Math.floor(restTotalSecs / 3600));
        setRestM(Math.floor((restTotalSecs % 3600) / 60));
        setRestS(restTotalSecs % 60);
      } else {
        setName('');
        setIcon(defaultTaskIcon);
        setDurH(0); setDurM(0); setDurS(30);
        setRestH(0); setRestM(0); setRestS(0);
      }
      setShowDurationPicker(false);
      setShowRestPicker(false);
    }
  }, [isOpen, initialTask]);

  const getDurationMinutes = () => durH * 60 + durM + durS / 60;
  const getDurationLabel = () => {
    const parts: string[] = [];
    if (durH > 0) parts.push(`${durH}h`);
    if (durM > 0) parts.push(`${durM}m`);
    if (durS > 0) parts.push(`${durS}s`);
    return parts.length > 0 ? parts.join(' ') : '0s';
  };
  const getRestLabel = () => {
    const parts: string[] = [];
    if (restH > 0) parts.push(`${restH}h`);
    if (restM > 0) parts.push(`${restM}m`);
    if (restS > 0) parts.push(`${restS}s`);
    return parts.length > 0 ? parts.join(' ') : '0m';
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const taskRestMinutes = restH * 60 + restM + restS / 60;
    const task: Task = {
      id: initialTask?.id || crypto.randomUUID(),
      name: name.trim(),
      icon,
      completed: initialTask?.completed || false,
      duration: getDurationMinutes() || 0.5,
      restTime: taskRestMinutes,
    };
    onSave(task);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-end justify-center bg-foreground/20 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-card p-6 shadow-soft max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-display text-lg">
                  {initialTask ? (t('create.edit') || 'Edit Task') : (t('create.addTask') || 'Add Task')}
                </h2>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Icon */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setShowIconPicker(true)}
                    className="w-20 h-20 rounded-full bg-[hsl(0,0%,96%)] dark:bg-[hsl(0,0%,22%)] flex items-center justify-center shadow-soft overflow-hidden"
                  >
                    {isImageIcon(icon) ? (
                      <img src={icon} alt="" className="w-12 h-12 object-contain" />
                    ) : (
                      <span className="text-3xl">{icon}</span>
                    )}
                  </button>
                  <p className="text-xs text-muted-foreground mt-1.5">{t('iconPicker.title')}</p>
                </div>

                {/* Name */}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('create.taskPlaceholder')}
                  className="w-full px-4 py-3 bg-muted rounded-inner text-foreground text-sm placeholder:text-muted-foreground/50 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />

                {/* Duration */}
                <div>
                  <button
                    onClick={() => setShowDurationPicker(!showDurationPicker)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-muted rounded-inner"
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
                        <div className="flex items-center justify-center gap-1 bg-muted rounded-inner p-2 mt-1">
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

                {/* Rest time */}
                <div>
                  <button
                    onClick={() => setShowRestPicker(!showRestPicker)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-muted rounded-inner"
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
                        <div className="flex items-center justify-center gap-1 bg-muted rounded-inner p-2 mt-1">
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

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <button onClick={onClose} className="flex-1 py-3 rounded-inner text-sm text-muted-foreground hover:bg-muted transition-colors">
                    {t('create.cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!name.trim()}
                    className="flex-1 py-3 bg-pink-accent rounded-inner text-sm font-medium shadow-soft text-foreground disabled:opacity-40"
                  >
                    {t('create.save') || 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <IconPicker
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={setIcon}
        selectedIcon={icon}
      />
    </>
  );
}
