import Dexie, { type Table } from 'dexie';
import type { Routine } from '@/types/routine';

export interface LocalUserData {
  key: string;
  value: any;
}

export interface CachedIcon {
  id: string;       // "category/filename"
  category: string;
  filename: string;
  url: string;      // base64 data: URI or remote URL
}

class PlanLizzDB extends Dexie {
  userData!: Table<LocalUserData, string>;
  icons!: Table<CachedIcon, string>;

  constructor() {
    super('planlizz-db');
    this.version(1).stores({
      userData: 'key',
    });
    this.version(2).stores({
      userData: 'key',
      icons: 'id, category',
    });
  }
}

export const localDb = new PlanLizzDB();

// ── Routines ────────────────────────────────────────────────────────────────

export async function getLocalRoutines(): Promise<Routine[]> {
  try {
    const row = await localDb.userData.get('routines');
    return (row?.value as Routine[]) ?? [];
  } catch {
    return [];
  }
}

export async function setLocalRoutines(routines: Routine[]): Promise<void> {
  try {
    await localDb.userData.put({ key: 'routines', value: routines });
  } catch (err) {
    console.warn('IndexedDB setLocalRoutines failed:', err);
  }
}

// ── Recent Icons ────────────────────────────────────────────────────────────
// Recent icons stored ONLY in IndexedDB (clears on app reinstall as intended)

export async function getLocalRecentIcons(): Promise<string[]> {
  try {
    const row = await localDb.userData.get('recentIcons');
    return (row?.value as string[]) ?? [];
  } catch {
    return [];
  }
}

export async function setLocalRecentIcons(icons: string[]): Promise<void> {
  try {
    await localDb.userData.put({ key: 'recentIcons', value: icons });
  } catch (err) {
    console.warn('IndexedDB setLocalRecentIcons failed:', err);
  }
}

// ── Icon Library Cache (Offline First) ─────────────────────────────────────

export async function getCachedIcons(): Promise<CachedIcon[]> {
  try {
    return await localDb.icons.toArray();
  } catch {
    return [];
  }
}

export async function setCachedIcons(newIcons: CachedIcon[]): Promise<void> {
  try {
    await localDb.transaction('rw', localDb.icons, async () => {
      await localDb.icons.clear();
      if (newIcons.length > 0) {
        await localDb.icons.bulkPut(newIcons);
      }
    });
  } catch (err) {
    console.warn('IndexedDB setCachedIcons failed:', err);
  }
}

export async function getCachedIconsByCategory(): Promise<
  { name: string; icons: { url: string; filename: string }[] }[]
> {
  try {
    const all = await localDb.icons.toArray();
    const map: Record<string, { url: string; filename: string }[]> = {};
    for (const icon of all) {
      if (!map[icon.category]) map[icon.category] = [];
      map[icon.category].push({ url: icon.url, filename: icon.filename });
    }
    return Object.entries(map).map(([name, icons]) => ({ name, icons }));
  } catch {
    return [];
  }
}
