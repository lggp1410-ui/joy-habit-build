import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRoutineStore } from '@/stores/routineStore';

export function useRecentIconsSync(userId: string | undefined) {
  const { recentIcons, setRecentIcons } = useRoutineStore();
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

  // Load from DB on login and merge with local
  useEffect(() => {
    if (!userId || hasSyncedRef.current) return;

    const loadFromDb = async () => {
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

        // Merge: DB first, then local, deduplicated
        const merged = [...new Set([...dbIcons, ...localIcons])]
          .filter(url => url && url.startsWith('http'));

        setRecentIcons(merged);
        hasSyncedRef.current = true;

        // If local had icons not in DB, persist the merged result
        if (localIcons.some(icon => !dbIcons.includes(icon))) {
          await upsertToDb(userId, merged);
        }
      } catch (err) {
        console.error('Recent icons sync error:', err);
      }
    };

    loadFromDb();
  }, [userId, setRecentIcons]);

  // Auto-save when recentIcons change (after initial sync)
  useEffect(() => {
    if (!userId || !hasSyncedRef.current) return;

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
