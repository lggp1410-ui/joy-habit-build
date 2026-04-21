import { BottomNav } from '@/components/BottomNav';
import { CreateRoutineModal } from '@/components/CreateRoutineModal';
import { SuccessPopup } from '@/components/SuccessPopup';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { ExploreScreen } from '@/components/screens/ExploreScreen';
import { AnalysisScreen } from '@/components/screens/AnalysisScreen';
import { SettingsScreen } from '@/components/screens/SettingsScreen';
import { SavedScreen } from '@/components/screens/SavedScreen';
import { useRoutineStore } from '@/stores/routineStore';
import { useEffect } from 'react';

const Index = () => {
  const { activeTab, routines, setActiveTab, setActiveRoutine } = useRoutineStore();

  useEffect(() => {
    const openRoutineFromUrl = (urlValue?: string) => {
      const url = new URL(urlValue || window.location.href, window.location.origin);
      const routineId = url.searchParams.get('routineId');
      if (!routineId) return;
      if (!routines.some((routine) => routine.id === routineId)) return;
      setActiveTab('home');
      setActiveRoutine(routineId);
      url.searchParams.delete('routineId');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    };

    openRoutineFromUrl();

    const handleNotificationOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ url?: string }>;
      openRoutineFromUrl(customEvent.detail?.url);
    };

    window.addEventListener('planlizz-notification-open', handleNotificationOpen);
    return () => window.removeEventListener('planlizz-notification-open', handleNotificationOpen);
  }, [routines, setActiveRoutine, setActiveTab]);

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background relative">
      {activeTab === 'home' && <HomeScreen />}
      {activeTab === 'explore' && <ExploreScreen />}
      {activeTab === 'analysis' && <AnalysisScreen />}
      {activeTab === 'settings' && <SettingsScreen />}
      {activeTab === 'saved' && <SavedScreen />}

      <BottomNav />
      <CreateRoutineModal />
      <SuccessPopup />
    </div>
  );
};

export default Index;
