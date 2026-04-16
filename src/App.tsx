import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { useRecentIconsSync } from "@/hooks/useRecentIconsSync";
import { useRoutinesSync } from "@/hooks/useRoutinesSync";
import { useRoutineStore } from "@/stores/routineStore";
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function WelcomeOverlay() {
  const { t } = useTranslation();
  const { showWelcome, setShowWelcome } = useRoutineStore();

  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome, setShowWelcome]);

  return (
    <AnimatePresence>
      {showWelcome && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-8"
          style={{ background: 'linear-gradient(135deg, #FFD1DC 0%, #FFB6C8 40%, #FFDAA5 100%)' }}
          onClick={() => setShowWelcome(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', damping: 15 }}
            className="text-center"
          >
            <span className="text-5xl mb-4 block">✨</span>
            <p className="text-lg font-medium text-white leading-relaxed drop-shadow-sm">
              {t('welcome.message')}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AppContent() {
  const { isAuthenticated, loading, continueAsGuest, user } = useAuth();
  const { setShowWelcome, setActiveRoutine, setActiveTab } = useRoutineStore();
  const [prevAuth, setPrevAuth] = useState(false);
  useRecentIconsSync(user?.id);
  useRoutinesSync(user?.id);

  useEffect(() => {
    if (!prevAuth && isAuthenticated && user) {
      setShowWelcome(true);
    }
    setPrevAuth(isAuthenticated);
  }, [isAuthenticated, user]);

  useEffect(() => {
    const openFromUrl = (urlValue?: string, routineIdValue?: string, openTimerValue?: boolean) => {
      try {
        const parsed = new URL(urlValue || window.location.href, window.location.origin);
        const routineId = routineIdValue || parsed.searchParams.get('routineId') || undefined;
        const openTimer = openTimerValue || parsed.searchParams.get('timer') === '1';
        if (!routineId) return;

        setActiveTab('home');
        setActiveRoutine(routineId);

        if (openTimer) {
          sessionStorage.setItem('planlizz-open-timer-routine', routineId);
          window.dispatchEvent(new CustomEvent('planlizz-open-timer', {
            detail: { routineId, openTimer: true },
          }));
        }

        if (parsed.searchParams.has('routineId') || parsed.searchParams.has('timer')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch {}
    };

    openFromUrl();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        openFromUrl(event.data.url, event.data.routineId, event.data.openTimer);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, [setActiveRoutine, setActiveTab]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onGuest={continueAsGuest} />;
  }

  return (
    <>
      <WelcomeOverlay />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
