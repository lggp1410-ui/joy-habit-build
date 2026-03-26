import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AirtableIcon {
  url: string;
  filename: string;
}

export interface AirtableCategory {
  name: string;
  icons: AirtableIcon[];
}

const CACHE_KEY = 'planlizz_airtable_icons';
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour (Airtable URLs expire ~2h)

interface CachedData {
  categories: AirtableCategory[];
  timestamp: number;
}

function getCached(): AirtableCategory[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedData = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cached.categories;
  } catch {
    return null;
  }
}

function setCache(categories: AirtableCategory[]) {
  try {
    const data: CachedData = { categories, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

function filterValidIcons(categories: AirtableCategory[]): AirtableCategory[] {
  return categories.map(cat => ({
    ...cat,
    icons: cat.icons.filter(icon => icon.url && icon.url.startsWith('http') && icon.filename),
  })).filter(cat => cat.icons.length > 0);
}

export function useAirtableIcons() {
  const [categories, setCategories] = useState<AirtableCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchIcons() {
      // Try cache first
      const cached = getCached();
      if (cached && cached.length > 0) {
        setCategories(filterValidIcons(cached));
        setIsLoading(false);
        // Still refresh in background
        refreshFromServer(cancelled);
        return;
      }

      await refreshFromServer(cancelled);
    }

    async function refreshFromServer(isCancelled: boolean) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('airtable-icons');

        if (isCancelled) return;

        if (fnError) {
          console.error('Edge function error:', fnError);
          setError(fnError.message);
          const stale = getCachedStale();
          if (stale) setCategories(filterValidIcons(stale));
          setIsLoading(false);
          return;
        }

        if (data?.categories && data.categories.length > 0) {
          const filtered = filterValidIcons(data.categories);
          setCategories(filtered);
          setCache(filtered);
        }
        setIsLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Fetch error:', err);
        setError(err.message);
        const stale = getCachedStale();
        if (stale) setCategories(filterValidIcons(stale));
        setIsLoading(false);
      }
    }

    fetchIcons();
    return () => { cancelled = true; };
  }, []);

  return { categories, isLoading, error };
}

function getCachedStale(): AirtableCategory[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw).categories || null;
  } catch {
    return null;
  }
}
