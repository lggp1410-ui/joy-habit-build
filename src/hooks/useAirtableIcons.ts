import { useState, useEffect } from 'react';
import { getCachedIcons, setCachedIcons, CachedIcon } from '@/lib/localDb';

export interface AirtableIcon {
  url: string;
  filename: string;
}

export interface AirtableCategory {
  name: string;
  icons: AirtableIcon[];
}

const CATEGORY_ORDER = [
  'Manha', 'Tarde/Noite', 'Saude', 'Aprender', 'Trabalho',
  'Profissoes', 'Familia', 'Bebe/Crianca', 'Beleza', 'Culinaria',
  'Tarefas-da-Casa', 'Veiculos', 'Exercicios', 'Lazer',
  'Lanches/Bebidas', 'Pets', 'Eletronicos', 'Comercio', 'Musica', 'Religiao',
];

function filterValidIcons(categories: AirtableCategory[]): AirtableCategory[] {
  return categories.map(cat => {
    const seen = new Set<string>();
    return {
      ...cat,
      icons: cat.icons.filter(icon => {
        if (!icon.url || !icon.filename) return false;
        const isValid = icon.url.startsWith('http') || icon.url.startsWith('data:');
        if (!isValid) return false;
        if (seen.has(icon.filename)) return false;
        seen.add(icon.filename);
        return true;
      }),
    };
  }).filter(cat => cat.icons.length > 0);
}

function sortCategories(cats: AirtableCategory[]): AirtableCategory[] {
  const map = Object.fromEntries(cats.map(c => [c.name, c]));
  const ordered = CATEGORY_ORDER.filter(n => map[n]).map(n => map[n]);
  const rest = cats.filter(c => !CATEGORY_ORDER.includes(c.name));
  return [...ordered, ...rest];
}

function idbToCategories(cached: CachedIcon[]): AirtableCategory[] {
  const map: Record<string, AirtableCategory> = {};
  for (const icon of cached) {
    if (!map[icon.category]) map[icon.category] = { name: icon.category, icons: [] };
    map[icon.category].icons.push({ url: icon.url, filename: icon.filename });
  }
  return sortCategories(Object.values(map));
}

function apiToIdb(categories: AirtableCategory[]): CachedIcon[] {
  const result: CachedIcon[] = [];
  for (const cat of categories) {
    for (const icon of cat.icons) {
      result.push({
        id: `${cat.name}/${icon.filename}`,
        category: cat.name,
        filename: icon.filename,
        url: icon.url,
      });
    }
  }
  return result;
}

export function useAirtableIcons() {
  const [categories, setCategories] = useState<AirtableCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadFromIDB() {
      try {
        const cached = await getCachedIcons();
        if (!cancelled && cached.length > 0) {
          const cats = filterValidIcons(idbToCategories(cached));
          if (cats.length > 0) {
            setCategories(cats);
            setIsLoading(false);
            // Refresh from server in background
            refreshFromServer(true);
            return true;
          }
        }
      } catch {
        // ignore IDB errors
      }
      return false;
    }

    async function refreshFromServer(background = false) {
      try {
        const res = await fetch('/api/icons');
        if (cancelled) return;

        if (!res.ok) {
          if (!background) {
            setError(`Icons API error: ${res.status}`);
            setIsLoading(false);
          }
          return;
        }

        const data = await res.json();
        if (data?.categories && data.categories.length > 0) {
          const sorted = sortCategories(data.categories);
          const filtered = filterValidIcons(sorted);

          if (!cancelled) {
            setCategories(filtered);
            setError(null);
            setIsLoading(false);
          }

          // Persist to IndexedDB for offline use
          const toCache = apiToIdb(filtered);
          await setCachedIcons(toCache);
        } else if (!background) {
          // Empty DB — server may still be syncing; retry after 8s
          setIsLoading(false);
          if (!cancelled) {
            retryTimer = setTimeout(() => {
              if (!cancelled) refreshFromServer(false);
            }, 8000);
          }
        }
      } catch (err: any) {
        if (cancelled) return;
        if (!background) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    }

    async function init() {
      const hadCache = await loadFromIDB();
      if (!hadCache) {
        // No cache — fetch from network immediately
        await refreshFromServer(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  return { categories, isLoading, error };
}
