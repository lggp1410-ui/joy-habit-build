import { BottomNav } from '@/components/BottomNav';
import { CreateRoutineModal } from '@/components/CreateRoutineModal';
import { SuccessPopup } from '@/components/SuccessPopup';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { ExploreScreen } from '@/components/screens/ExploreScreen';
import { AnalysisScreen } from '@/components/screens/AnalysisScreen';
import { SettingsScreen } from '@/components/screens/SettingsScreen';
import { SavedScreen } from '@/components/screens/SavedScreen';
import { useRoutineStore } from '@/stores/routineStore';

const Index = () => {
  const { activeTab } = useRoutineStore();

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
