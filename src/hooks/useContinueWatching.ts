'use client';
import { useQuery } from '@tanstack/react-query';
import { ContinueWatchingItem } from '@/types/watch-history';
import { useAuth } from '@/components/providers/AuthProvider';

interface ContinueWatchingResponse {
  items: ContinueWatchingItem[];
}

export function useContinueWatching() {
  const { user } = useAuth();

  return useQuery<ContinueWatchingItem[]>({
    queryKey: ['continue-watching', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/watch-history');
      if (!response.ok) {
        throw new Error('Failed to fetch continue watching');
      }
      const data: ContinueWatchingResponse = await response.json();
      return data.items;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}
