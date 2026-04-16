import { useEffect, useRef, useCallback } from 'react';
import { useRoutineStore } from '@/stores/routineStore';
import { Routine } from '@/types/routine';
import { getLocalRoutines, setLocalRoutines } from '@/lib/localDb';

export function useRoutinesSync(userId: string | undefined) {
  const { routines, setRoutines } = useRoutineStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSyncedRef = useRef(false);
  const prevUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      hasSyncedRef.current = false;
      prevUserIdRef.current = userId;
    }
  }, [userId]);

  // Load from IndexedDB immediately on mount
  useEffect(() => {
    getLocalRoutines().then(localIdb => {
      if (localIdb.length > 0) {
        const current = useRoutineStore.getState().routines;
        const idbIds = new Set(localIdb.map(r => r.id));
        const extra = current.filter(r => !idbIds.has(r.id));
        setRoutines([...localIdb, ...extra]);
      }
    });
  }, [setRoutines]);

  const syncFromServer = useCallback(async () => {
    // Guests: no server sync, local-only
    if (!userId || userId.startsWith('guest')) return;
    try {
      const res = await fetch('/api/preferences', { credentials: 'include' });
      if (!res.ok) return;

      const { routines: dbRoutines }: { routines: Routine[] } = await res.json();
      const localRoutines = useRoutineStore.getState().routines;

      const dbIds = new Set(dbRoutines.map(r => r.id));
      const localOnly = localRoutines.filter(r => !dbIds.has(r.id));
      const merged = [...dbRoutines, ...localOnly];

      setRoutines(merged);
      await setLocalRoutines(merged);
      hasSyncedRef.current = true;

      if (localOnly.length > 0) {
        await saveToServer(merged);
      }
    } catch (err) {
      console.error('Routines sync error:', err);
    }
  }, [userId, setRoutines]);

  useEffect(() => {
    if (!userId || hasSyncedRef.current) return;
    syncFromServer();
  }, [userId, syncFromServer]);

  useEffect(() => {
    if (!userId) return;
    const handleOnline = () => {
      if (hasSyncedRef.current) {
        saveToServer(useRoutineStore.getState().routines);
      } else {
        syncFromServer();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId, syncFromServer]);

  useEffect(() => {
    if (!userId || !hasSyncedRef.current) return;
    if (userId.startsWith('guest')) return;

    setLocalRoutines(routines);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveToServer(routines);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [routines, userId]);
}

async function saveToServer(routines: Routine[]) {
  try {
    if (!navigator.onLine) return;
    await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ routines }),
    });
  } catch (err) {
    console.error('Save routines error:', err);
  }
}
