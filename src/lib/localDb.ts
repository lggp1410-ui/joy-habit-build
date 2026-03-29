import Dexie, { type Table } from 'dexie';
import type { Routine } from '@/types/routine';

export interface LocalUserData {
  key: string; // 'routines' | 'recentIcons'
  value: any;
}

class PlanLizzDB extends Dexie {
  userData!: Table<LocalUserData, string>;

  constructor() {
    super('planlizz-db');
    this.version(1).stores({
      userData: 'key',
    });
  }
}

export const localDb = new PlanLizzDB();

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
