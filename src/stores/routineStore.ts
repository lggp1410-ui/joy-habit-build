import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Routine, Task, TabType } from '@/types/routine';

interface RoutineStore {
  routines: Routine[];
  activeTab: TabType;
  activeRoutineId: string | null;
  showCreateModal: boolean;
  showSuccessPopup: boolean;
  recentIcons: string[];
  editingRoutineId: string | null;
  showWelcome: boolean;
  showCreateMenu: boolean;
  createType: 'routine' | 'moment';
  homeFilter: 'all' | 'routines' | 'moments';
  setActiveTab: (tab: TabType) => void;
  setActiveRoutine: (id: string | null) => void;
  setShowCreateModal: (show: boolean) => void;
  setShowSuccessPopup: (show: boolean) => void;
  addRoutine: (routine: Routine) => void;
  updateRoutine: (routine: Routine) => void;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (id: string) => void;
  toggleTask: (routineId: string, taskId: string) => void;
  resetRoutineTasks: (routineId: string) => void;
  addRecentIcon: (url: string) => void;
  setEditingRoutineId: (id: string | null) => void;
  setShowWelcome: (show: boolean) => void;
  setRecentIcons: (icons: string[]) => void;
  setRoutines: (routines: Routine[]) => void;
  duplicateTask: (routineId: string, taskId: string) => void;
  deleteTask: (routineId: string, taskId: string) => void;
  addTaskToRoutine: (routineId: string, task: Task) => void;
  updateTaskInRoutine: (routineId: string, task: Task) => void;
  reorderTasks: (routineId: string, taskIds: string[]) => void;
  setShowCreateMenu: (show: boolean) => void;
  setCreateType: (type: 'routine' | 'moment') => void;
  setHomeFilter: (filter: 'all' | 'routines' | 'moments') => void;
  archiveRoutine: (id: string) => void;
  reactivateRoutine: (id: string) => void;
  convertToRoutine: (id: string, days: string[]) => void;
}

const SESSION_RECENT_ICONS_KEY = 'planlizz-recent-icons-session';

function loadSessionRecentIcons(): string[] {
  try {
    const raw = sessionStorage.getItem(SESSION_RECENT_ICONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessionRecentIcons(icons: string[]) {
  try {
    sessionStorage.setItem(SESSION_RECENT_ICONS_KEY, JSON.stringify(icons));
  } catch {}
}

export const useRoutineStore = create<RoutineStore>()(
  persist(
    (set, get) => ({
      routines: [],
      activeTab: 'home',
      activeRoutineId: null,
      showCreateModal: false,
      showSuccessPopup: false,
      recentIcons: loadSessionRecentIcons(),
      editingRoutineId: null,
      showWelcome: false,
      showCreateMenu: false,
      createType: 'routine',
      homeFilter: 'all',
      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveRoutine: (id) => set({ activeRoutineId: id }),
      setShowCreateModal: (show) => set({ showCreateModal: show }),
      setShowSuccessPopup: (show) => set({ showSuccessPopup: show }),
      setEditingRoutineId: (id) => set({ editingRoutineId: id }),
      setShowWelcome: (show) => set({ showWelcome: show }),
      setRecentIcons: (icons) => set({ recentIcons: icons }),
      setRoutines: (routines) => set({ routines }),
      setShowCreateMenu: (show) => set({ showCreateMenu: show }),
      setCreateType: (type) => set({ createType: type }),
      setHomeFilter: (filter) => set({ homeFilter: filter }),
      addRoutine: (routine) => set((s) => ({ routines: [...s.routines, routine] })),
      updateRoutine: (routine) => set((s) => ({
        routines: s.routines.map(r => r.id === routine.id ? routine : r)
      })),
      deleteRoutine: (id) => set((s) => ({ routines: s.routines.filter(r => r.id !== id) })),
      duplicateRoutine: (id) => set((s) => {
        const original = s.routines.find(r => r.id === id);
        if (!original) return s;
        const copy: Routine = {
          ...original,
          id: crypto.randomUUID(),
          name: `${original.name} (cópia)`,
          tasks: original.tasks.map(t => ({ ...t, id: crypto.randomUUID(), completed: false })),
        };
        return { routines: [...s.routines, copy] };
      }),
      toggleTask: (routineId, taskId) => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        set((s) => {
          const routines = s.routines.map(r => {
            if (r.id !== routineId) return r;
            const tasks = r.tasks.map(t => {
              if (t.id !== taskId) return t;
              const nowCompleted = !t.completed;
              const dates = t.completionDates ?? [];
              const updatedDates = nowCompleted
                ? [...dates.filter(d => d !== todayStr), todayStr]
                : dates.filter(d => d !== todayStr);
              return { ...t, completed: nowCompleted, completionDates: updatedDates };
            });
            return { ...r, tasks };
          });

          const routine = routines.find(r => r.id === routineId);
          const allDone = routine?.tasks.every(t => t.completed);

          return { routines, showSuccessPopup: allDone || false };
        });
      },
      resetRoutineTasks: (routineId) => set((s) => ({
        routines: s.routines.map(r => r.id === routineId 
          ? { ...r, tasks: r.tasks.map(t => ({ ...t, completed: false })) } 
          : r
        )
      })),
      addRecentIcon: (url) => set((s) => {
        const cleaned = s.recentIcons.filter(i => i && (i.startsWith('http') || i.startsWith('data:')));
        const filtered = cleaned.filter(i => i !== url);
        const next = [url, ...filtered];
        saveSessionRecentIcons(next);
        return { recentIcons: next };
      }),
      duplicateTask: (routineId, taskId) => set((s) => ({
        routines: s.routines.map(r => {
          if (r.id !== routineId) return r;
          const taskIdx = r.tasks.findIndex(t => t.id === taskId);
          if (taskIdx === -1) return r;
          const original = r.tasks[taskIdx];
          const copy = { ...original, id: crypto.randomUUID(), completed: false };
          const tasks = [...r.tasks];
          tasks.splice(taskIdx + 1, 0, copy);
          return { ...r, tasks };
        })
      })),
      deleteTask: (routineId, taskId) => set((s) => ({
        routines: s.routines.map(r => {
          if (r.id !== routineId) return r;
          return { ...r, tasks: r.tasks.filter(t => t.id !== taskId) };
        })
      })),
      addTaskToRoutine: (routineId, task) => set((s) => ({
        routines: s.routines.map(r => {
          if (r.id !== routineId) return r;
          return { ...r, tasks: [...r.tasks, task] };
        })
      })),
      updateTaskInRoutine: (routineId, task) => set((s) => ({
        routines: s.routines.map(r => {
          if (r.id !== routineId) return r;
          return { ...r, tasks: r.tasks.map(t => t.id === task.id ? task : t) };
        })
      })),
      reorderTasks: (routineId, taskIds) => set((s) => ({
        routines: s.routines.map(r => {
          if (r.id !== routineId) return r;
          const reordered = taskIds.map(id => r.tasks.find(t => t.id === id)).filter(Boolean) as Task[];
          return { ...r, tasks: reordered };
        })
      })),
      archiveRoutine: (id) => set((s) => ({
        routines: s.routines.map(r => r.id === id
          ? { ...r, archived: true, archivedAt: new Date().toISOString() }
          : r
        )
      })),
      reactivateRoutine: (id) => set((s) => ({
        routines: s.routines.map(r => r.id === id
          ? { ...r, archived: false, archivedAt: undefined, tasks: r.tasks.map(t => ({ ...t, completed: false })) }
          : r
        )
      })),
      convertToRoutine: (id, days) => set((s) => ({
        routines: s.routines.map(r => r.id === id
          ? { ...r, type: 'routine', days, archived: false, archivedAt: undefined }
          : r
        )
      })),
    }),
    {
      name: 'planlizz-routines',
      partialize: (state) => {
        const { recentIcons, ...rest } = state as any;
        return rest;
      },
    }
  )
);
