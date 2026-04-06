export interface Task {
  id: string;
  name: string;
  icon: string;
  completed: boolean;
  duration?: number; // in minutes (can be fractional, e.g. 0.5 = 30s)
  restTime?: number; // per-task rest time in minutes (can be fractional)
}

export function formatDuration(minutes: number): string {
  const totalSecs = Math.round(minutes * 60);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}min`);
  if (s > 0) parts.push(`${s}s`);
  return parts.length > 0 ? parts.join(' ') : '0s';
}

export interface Routine {
  id: string;
  name: string;
  days: string[];
  time: string;
  tasks: Task[];
  category: 'morning' | 'afternoon' | 'health' | 'custom';
  reminder?: boolean;
  autoContinue?: boolean;
  restTime?: number; // global rest time in minutes
  type?: 'routine' | 'moment'; // default: 'routine'
  archived?: boolean;
  archivedAt?: string; // ISO date string
}

export function isImageIcon(icon: string): boolean {
  return icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:') || icon.includes('/assets/');
}

export type TabType = 'home' | 'explore' | 'analysis' | 'settings' | 'saved';

export const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const ICON_CATEGORIES = [
  'Manha', 'Tarde/Noite', 'Saude', 'Aprender', 'Trabalho',
  'Profissoes', 'Familia', 'Bebe/Crianca', 'Beleza', 'Culinaria',
  'Tarefas-da-Casa', 'Veiculos', 'Exercicios', 'Lazer',
  'Lanches/Bebidas', 'Pets', 'Eletronicos', 'Comercio', 'Musica', 'Religiao'
] as const;
