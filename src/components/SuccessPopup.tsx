import { useRoutineStore } from '@/stores/routineStore';
import { CelebrationOverlay } from './CelebrationOverlay';

export function SuccessPopup() {
  const { showSuccessPopup, setShowSuccessPopup } = useRoutineStore();

  return (
    <CelebrationOverlay
      show={showSuccessPopup}
      onDismiss={() => setShowSuccessPopup(false)}
    />
  );
}
