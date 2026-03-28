import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRoutineStore } from '@/stores/routineStore';
import { Routine } from '@/types/routine';

export function useRoutinesSync(userId: string | undefined) {
  const { routines, setRoutines } = useRoutineStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSyncedRef = useRef(false);
  const prevUserIdRef = useRef<string | undefined>(undefined);

  // Reset sync flag when user changes
  useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      hasSyncedRef.current = false;
      prevUserIdRef.current = userId;
    }
  }, [userId]);

  const syncFromDb = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('routines')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load routines:', error);
        return;
      }

      const dbRoutines: Routine[] = (data?.routines as unknown as Routine[]) ?? [];
      const localRoutines = useRoutineStore.getState().routines;

      const dbIds = new Set(dbRoutines.map(r => r.id));
      const localOnly = localRoutines.filter(r => !dbIds.has(r.id));
      const merged = [...dbRoutines, ...localOnly];

      setRoutines(merged);
      hasSyncedRef.current = true;

      if (localOnly.length > 0) {
        await upsertToDb(userId, merged);
      }
    } catch (err) {
      console.error('Routines sync error:', err);
    }
  }, [userId, setRoutines]);

  // Load from DB on login
  useEffect(() => {
    if (!userId || hasSyncedRef.current) return;
    syncFromDb();
  }, [userId, syncFromDb]);

  // Re-sync when coming back online
  useEffect(() => {
    if (!userId) return;
    const handleOnline = () => {
      if (hasSyncedRef.current) {
        upsertToDb(userId, useRoutineStore.getState().routines);
      } else {
        syncFromDb();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId, syncFromDb]);

  // Auto-save when routines change (after initial sync)
  useEffect(() => {
    if (!userId || !hasSyncedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      upsertToDb(userId, routines);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [routines, userId]);
}

async function upsertToDb(userId: string, routines: Routine[]) {
  try {
    if (!navigator.onLine) return;
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: userId, routines: routines as unknown as any, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) console.error('Failed to save routines:', error);
  } catch (err) {
    console.error('Upsert routines error:', err);
  }
}
