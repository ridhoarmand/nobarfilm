'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ContinueWatchingItem } from '@/types/watch-history';

export function useContinueWatching() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUpdate = () => {
      queryClient.refetchQueries({ queryKey: ['continue-watching'], type: 'active' });
    };

    window.addEventListener('nobarfilm_watch_history_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    window.addEventListener('pageshow', handleUpdate);
    window.addEventListener('popstate', handleUpdate);
    window.addEventListener('visibilitychange', handleUpdate);

    return () => {
      window.removeEventListener('nobarfilm_watch_history_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('pageshow', handleUpdate);
      window.removeEventListener('popstate', handleUpdate);
      window.removeEventListener('visibilitychange', handleUpdate);
    };
  }, [queryClient]);

  return useQuery<ContinueWatchingItem[]>({
    queryKey: ['continue-watching'],
    queryFn: async () => {
      if (typeof window === 'undefined') return [];
      const historyJson = localStorage.getItem('nobarfilm_watch_history');
      if (!historyJson) return [];
      try {
        const rawItems = JSON.parse(historyJson) as ContinueWatchingItem[];
        // Sort by last_watched_at descending so the newest watched episode comes first
        const sorted = rawItems.sort(
          (a, b) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime()
        );

        // Deduplicate: Keep exactly 1 latest item per film/series (by title or subject_id)
        const seen = new Set<string>();
        const uniqueItems: ContinueWatchingItem[] = [];

        for (const item of sorted) {
          const normalizedTitle = item.title ? item.title.trim().toLowerCase() : '';
          const key = item.subject_id || normalizedTitle;
          const titleKey = normalizedTitle || item.subject_id;

          if (!seen.has(key) && (!titleKey || !seen.has(titleKey))) {
            seen.add(key);
            if (titleKey) seen.add(titleKey);
            uniqueItems.push(item);
          }
        }

        // Clean up storage if duplicate items existed
        if (uniqueItems.length !== rawItems.length) {
          try {
            localStorage.setItem('nobarfilm_watch_history', JSON.stringify(uniqueItems));
          } catch (err) {
            console.error('Failed to update deduplicated watch history:', err);
          }
        }

        return uniqueItems;
      } catch (e) {
        console.error('Failed to parse continue watching history:', e);
        return [];
      }
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
}
