'use client';
import { useQuery } from '@tanstack/react-query';
import { ContinueWatchingItem } from '@/types/watch-history';

export function useContinueWatching() {
  return useQuery<ContinueWatchingItem[]>({
    queryKey: ['continue-watching'],
    queryFn: async () => {
      if (typeof window === 'undefined') return [];
      const historyJson = localStorage.getItem('nobarfilm_watch_history');
      if (!historyJson) return [];
      try {
        const items = JSON.parse(historyJson) as ContinueWatchingItem[];
        return items.sort((a, b) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime());
      } catch (e) {
        console.error('Failed to parse continue watching history:', e);
        return [];
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}
