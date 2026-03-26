import { Home, Compass, BarChart3, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRoutineStore } from '@/stores/routineStore';
import { TabType } from '@/types/routine';

const tabs: { id: TabType; icon: typeof Home; labelKey: string }[] = [
  { id: 'home', icon: Home, labelKey: 'nav.home' },
  { id: 'explore', icon: Compass, labelKey: 'nav.explore' },
  { id: 'analysis', icon: BarChart3, labelKey: 'nav.analysis' },
  { id: 'settings', icon: Settings, labelKey: 'nav.settings' },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useRoutineStore();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border">
      <div className="flex items-center justify-around max-w-lg mx-auto py-2 px-4">
        {tabs.map(({ id, icon: Icon, labelKey }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="relative flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-inner transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-primary/15 rounded-inner"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <Icon className={`relative z-10 w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`relative z-10 text-[10px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {t(labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
