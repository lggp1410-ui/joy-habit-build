import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRoutineStore } from '@/stores/routineStore';
import { getLocalRecentIcons, setLocalRecentIcons } from '@/lib/localDb';

export function useRecentIconsSync(userId: string | undefined) {
  const { recentIcons, setRecentIcons } = useRoutineStore();
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
    getLocalRecentIcons().then(localIdb => {
      if (localIdb.length > 0) {
        const current = useRoutineStore.getState().recentIcons;
        const merged = [...new Set([...localIdb, ...current])];
        setRecentIcons(merged);
      }
    });
  }, [setRecentIcons]);

  const syncFromDb = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('recent_icons')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load recent icons:', error);
        return;
      }

      const dbIcons: string[] = (data?.recent_icons as string[]) ?? [];
      const localIcons = useRoutineStore.getState().recentIcons;

      const merged = [...new Set([...dbIcons, ...localIcons])];

      setRecentIcons(merged);
      await setLocalRecentIcons(merged);
      hasSyncedRef.current = true;

      if (localIcons.some(icon => !dbIcons.includes(icon))) {
        await upsertToDb(userId, merged);
      }
    } catch (err) {
      console.error('Recent icons sync error:', err);
    }
  }, [userId, setRecentIcons]);

  useEffect(() => {
    if (!userId || hasSyncedRef.current) return;
    syncFromDb();
  }, [userId, syncFromDb]);

  useEffect(() => {
    if (!userId) return;
    const handleOnline = () => {
      if (hasSyncedRef.current) {
        upsertToDb(userId, useRoutineStore.getState().recentIcons);
      } else {
        syncFromDb();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId, syncFromDb]);

  useEffect(() => {
    if (!userId || !hasSyncedRef.current) return;

    // Save to IndexedDB immediately
    setLocalRecentIcons(recentIcons);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      upsertToDb(userId, recentIcons);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [recentIcons, userId]);
}

async function upsertToDb(userId: string, icons: string[]) {
  try {
    if (!navigator.onLine) return;
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: userId, recent_icons: icons, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) console.error('Failed to save recent icons:', error);
  } catch (err) {
    console.error('Upsert recent icons error:', err);
  }
}
