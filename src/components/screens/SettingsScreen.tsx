import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Palette, Volume2, LogIn, LogOut, Info, ChevronRight, Heart, Check, ArrowLeft, Sun, Moon, Monitor, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { resetTutorial } from '@/components/TutorialOverlay';
import { useRoutineStore } from '@/stores/routineStore';

type ThemeMode = 'system' | 'light' | 'dark';

function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    (localStorage.getItem('planlizz-theme') as ThemeMode) || 'system'
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      }
    }
    localStorage.setItem('planlizz-theme', theme);
  }, [theme]);

  return { theme, setTheme: setThemeState };
}

const SOUND_OPTIONS = [
  { key: 'none', labelKey: 'sounds.none', file: null },
  { key: 'arrow', labelKey: 'sounds.arrow', file: '/sounds/Flecha.m4a' },
  { key: 'bark', labelKey: 'sounds.bark', file: '/sounds/Latido.m4a' },
  { key: 'birds', labelKey: 'sounds.birds', file: '/sounds/Passaros.mp3' },
  { key: 'correctDing', labelKey: 'sounds.correctDing', file: '/sounds/Correto.m4a' },
  { key: 'ding', labelKey: 'sounds.ding', file: '/sounds/Ding.m4a' },
  { key: 'meow', labelKey: 'sounds.meow', file: '/sounds/Gatinho.m4a' },
  { key: 'pop', labelKey: 'sounds.pop', file: '/sounds/Pop.m4a' },
  { key: 'successDing', labelKey: 'sounds.successDing', file: '/sounds/Conquista.m4a' },
  { key: 'whistle', labelKey: 'sounds.whistle', file: '/sounds/Apito.m4a' },
];

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const { user, isGuest, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { setActiveTab } = useRoutineStore();
  const [selectedSound, setSelectedSound] = useState(() =>
    localStorage.getItem('planlizz-sound') || 'pop'
  );

  const handleGoogleSignIn = async () => {
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error(t('settings.signInError', 'Sign in failed.'));
  };

  const handleViewTutorial = () => {
    resetTutorial();
    setActiveTab('home');
    // Small delay so the HomeScreen mounts with tutorial visible
    setTimeout(() => window.location.reload(), 100);
  };

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[1];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('planlizz-language', code);
    setShowLangPicker(false);
  };

  const themeLabel = theme === 'light' ? t('settings.light', 'Light') : theme === 'dark' ? t('settings.dark', 'Dark') : t('settings.system');
  const soundLabel = SOUND_OPTIONS.find(s => s.key === selectedSound)?.labelKey ? t(SOUND_OPTIONS.find(s => s.key === selectedSound)!.labelKey) : 'Pop';

  const handleSoundSelect = (key: string) => {
    setSelectedSound(key);
    localStorage.setItem('planlizz-sound', key);
    const sound = SOUND_OPTIONS.find(s => s.key === key);
    if (sound?.file) {
      const audio = new Audio(sound.file);
      audio.play().catch(() => {});
    }
    setShowSoundPicker(false);
  };

  const SETTINGS_SECTIONS = [
    {
      title: t('settings.preferences'),
      items: [
        { icon: Palette, label: t('settings.theme'), value: themeLabel, action: true, onClick: () => setShowThemePicker(true) },
        { icon: Globe, label: t('settings.language'), value: currentLang.label, action: true, onClick: () => setShowLangPicker(true) },
        { icon: Volume2, label: t('settings.completionSounds'), value: soundLabel, action: true, onClick: () => setShowSoundPicker(true) },
        { icon: HelpCircle, label: t('settings.viewTutorial', 'Ver tutorial'), value: '', action: true, onClick: handleViewTutorial },
      ]
    },
    {
      title: t('settings.account'),
      items: [
        ...(user
          ? [{ icon: LogOut, label: t('settings.signOut', 'Sign out'), value: user.email ?? '', action: true, onClick: signOut }]
          : [{ icon: LogIn, label: t('settings.signInGoogle'), value: '', action: true, onClick: handleGoogleSignIn }]
        ),
        { icon: Info, label: t('settings.aboutApp'), value: 'v1.0', action: true, onClick: () => setShowAbout(true) },
      ]
    }
  ];

  const themeOptions: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
    { mode: 'light', icon: Sun, label: t('settings.light', 'Light') },
    { mode: 'dark', icon: Moon, label: t('settings.dark', 'Dark') },
    { mode: 'system', icon: Monitor, label: t('settings.system') },
  ];

  return (
    <div className="min-h-screen pb-24">
      <div className="gradient-primary px-5 pt-12 pb-8 rounded-b-card">
        <h1 className="text-display text-2xl">{t('settings.title')}</h1>
        <p className="text-sm text-foreground/60 mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="px-5 mt-6 space-y-6">
        {SETTINGS_SECTIONS.map((section, si) => (
          <motion.div key={section.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.1 }}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{section.title}</h3>
            <div className="glass-card rounded-card overflow-hidden divide-y divide-border">
              {section.items.map((item) => (
                <button key={item.label} onClick={item.onClick} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors text-left">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
                  {item.action && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            {t('settings.madeWith')} <Heart className="w-3 h-3 text-primary" /> PlanLizz
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">{t('settings.freeLabel')}</p>
        </div>
      </div>

      {/* Language Picker Modal */}
      <AnimatePresence>
        {showLangPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowLangPicker(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-lg bg-card rounded-t-card sm:rounded-card p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setShowLangPicker(false)} className="p-1.5 rounded-full hover:bg-muted transition-colors"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></button>
                <h2 className="text-display text-xl">{t('settings.selectLanguage')}</h2>
              </div>
              <div className="space-y-1">
                {LANGUAGES.map((lang) => (
                  <button key={lang.code} onClick={() => changeLanguage(lang.code)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-inner transition-colors text-left ${i18n.language === lang.code ? 'bg-pink-accent' : 'hover:bg-muted/50'}`}>
                    <span className="text-xl">{lang.flag}</span>
                    <span className="flex-1 text-sm font-medium">{lang.label}</span>
                    {i18n.language === lang.code && <Check className="w-5 h-5 text-foreground" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme Picker Modal */}
      <AnimatePresence>
        {showThemePicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowThemePicker(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-lg bg-card rounded-t-card sm:rounded-card p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setShowThemePicker(false)} className="p-1.5 rounded-full hover:bg-muted transition-colors"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></button>
                <h2 className="text-display text-xl">{t('settings.theme')}</h2>
              </div>
              <div className="space-y-1">
                {themeOptions.map(({ mode, icon: Icon, label }) => (
                  <button key={mode} onClick={() => { setTheme(mode); setShowThemePicker(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-inner transition-colors text-left ${theme === mode ? 'bg-pink-accent' : 'hover:bg-muted/50'}`}>
                    <Icon className="w-5 h-5" />
                    <span className="flex-1 text-sm font-medium">{label}</span>
                    {theme === mode && <Check className="w-5 h-5 text-foreground" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sound Picker Modal */}
      <AnimatePresence>
        {showSoundPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowSoundPicker(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-lg bg-card rounded-t-card sm:rounded-card p-6 shadow-soft max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setShowSoundPicker(false)} className="p-1.5 rounded-full hover:bg-muted transition-colors"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></button>
                <h2 className="text-display text-xl">{t('settings.completionSounds')}</h2>
              </div>
              <div className="space-y-1">
                {SOUND_OPTIONS.map((sound) => (
                  <button key={sound.key} onClick={() => handleSoundSelect(sound.key)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-inner transition-colors text-left ${selectedSound === sound.key ? 'bg-pink-accent' : 'hover:bg-muted/50'}`}>
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">{t(sound.labelKey)}</span>
                    {selectedSound === sound.key && <Check className="w-5 h-5 text-foreground" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {showAbout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowAbout(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-lg bg-card rounded-t-card sm:rounded-card p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setShowAbout(false)} className="p-1.5 rounded-full hover:bg-muted transition-colors"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></button>
                <h2 className="text-display text-xl">{t('settings.aboutApp')}</h2>
              </div>
              <div className="text-center px-4 py-6">
                <span className="text-4xl mb-4 block">🎀</span>
                <p className="text-sm text-foreground leading-relaxed">{t('about.text')}</p>
                <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
                  {t('settings.madeWith')} <Heart className="w-3 h-3 text-primary" /> PlanLizz v1.0
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
