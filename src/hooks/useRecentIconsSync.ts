import { useEffect } from 'react';
import { useRoutineStore } from '@/stores/routineStore';
import { getLocalRecentIcons, setLocalRecentIcons } from '@/lib/localDb';

export function useRecentIconsSync(_userId: string | undefined) {
  const { recentIcons, setRecentIcons } = useRoutineStore();

  // Load from IndexedDB on mount
  useEffect(() => {
    getLocalRecentIcons().then(localIcons => {
      if (localIcons.length > 0) {
        const current = useRoutineStore.getState().recentIcons;
        const merged = [...new Set([...localIcons, ...current])];
        setRecentIcons(merged);
      }
    });
  }, [setRecentIcons]);

  // Save to IndexedDB whenever recentIcons changes
  useEffect(() => {
    setLocalRecentIcons(recentIcons);
  }, [recentIcons]);
}
