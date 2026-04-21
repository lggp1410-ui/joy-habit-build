import { useEffect, useRef } from 'react';
import { useRoutineStore } from '@/stores/routineStore';
import { getLocalRecentIcons, setLocalRecentIcons } from '@/lib/localDb';

export function useRecentIconsSync(userId: string | undefined) {
  const { recentIcons, setRecentIcons } = useRoutineStore();
  const initializedRef = useRef(false);
  const prevUserIdRef = useRef<string | undefined>(undefined);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load on mount and when user changes
  useEffect(() => {
    if (prevUserIdRef.current === userId && initializedRef.current) return;
    prevUserIdRef.current = userId;
    initializedRef.current = true;

    async function load() {

      const local = await getLocalRecentIcons();
      if (local.length > 0) {
        setRecentIcons(local);
      }
    }

    load();
  }, [userId, setRecentIcons]);

  // Save only to this installation. It is intentionally not synced to the server
  // so recent icons disappear after uninstall/reinstall.
  useEffect(() => {
    if (!initializedRef.current) return;

    setLocalRecentIcons(recentIcons);


      // Always load from IndexedDB first (offline-first, instant)
      const local = await getLocalRecentIcons();

      // For logged-in users, fetch server recents only for the current install.
      // If IndexedDB is empty after reinstall, keep Recentes empty until the user chooses icons again.
      if (userId && !userId.startsWith('guest')) {
        try {
          const res = await fetch('/api/preferences/recent-icons', { credentials: 'include' });
          if (res.ok) {
            const { recentIcons: serverIcons } = await res.json() as { recentIcons: string[] };
            if (serverIcons && serverIcons.length > 0 && local.length > 0) {
              // Merge only when this install already has local recent icons.
              const serverSet = new Set(serverIcons);
              const localOnly = local.filter(i => !serverSet.has(i));
              const merged = [...serverIcons, ...localOnly].slice(0, 30);
              setRecentIcons(merged);
              await setLocalRecentIcons(merged);
              return;
            }
          }
        } catch {
          // Server unavailable — use local
        }
      }

      if (local.length > 0) {
        setRecentIcons(local);
      }
    }

    load();
  }, [userId, setRecentIcons]);

  // Save to IndexedDB + server whenever recentIcons changes
  useEffect(() => {
    if (!initializedRef.current) return;

    // Save to IndexedDB immediately
    setLocalRecentIcons(recentIcons);

    // Save to server for logged-in users (debounced)
    if (userId && !userId.startsWith('guest')) {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(async () => {
        try {
          await fetch('/api/preferences/recent-icons', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ recentIcons }),
          });
        } catch {
          // ignore — saved locally at least
        }
      }, 1000);
    }


    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, [recentIcons, userId]);
}
