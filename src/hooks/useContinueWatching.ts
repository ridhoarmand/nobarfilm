'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ContinueWatchingItem } from '@/types/watch-history';

export function useContinueWatching() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
    };

    window.addEventListener('nobarfilm_watch_history_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    window.addEventListener('pageshow', handleUpdate);
    window.addEventListener('popstate', handleUpdate);

    return () => {
      window.removeEventListener('nobarfilm_watch_history_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('pageshow', handleUpdate);
      window.removeEventListener('popstate', handleUpdate);
    };
  }, [queryClient]);

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
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
