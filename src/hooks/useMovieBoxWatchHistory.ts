'use client';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ContinueWatchingItem } from '@/types/watch-history';

interface UseMovieBoxWatchHistoryParams {
  subjectId: string;
  subjectType: number;
  title: string;
  coverUrl?: string;
  currentEpisode?: number;
  totalEpisodes?: number;
}

export function useMovieBoxWatchHistory(params: UseMovieBoxWatchHistoryParams) {
  const { subjectId, subjectType, title, coverUrl, currentEpisode, totalEpisodes } = params;

  // Fetch initial progress
  const { data: progressData } = useQuery({
    queryKey: ['watch-progress', subjectId, currentEpisode],
    queryFn: async () => {
      if (typeof window === 'undefined') return null;
      const historyJson = localStorage.getItem('nobarfilm_watch_history');
      if (!historyJson) return null;
      try {
        const items = JSON.parse(historyJson) as ContinueWatchingItem[];
        const match = items.find(
          (item) => item.subject_id === subjectId && item.current_episode === (currentEpisode || 1)
        );
        return match || null;
      } catch (e) {
        console.error('Failed to parse watch history:', e);
        return null;
      }
    },
    enabled: !!subjectId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const saveProgress = useCallback(
    async (progressSeconds: number, durationSeconds: number) => {
      if (typeof window === 'undefined' || !subjectId || !title || durationSeconds === 0) {
        return;
      }

      const progress_percent = Math.round((progressSeconds / durationSeconds) * 100);
      const isCompleted = progress_percent >= 95; // Complete if 95%+ watched

      const historyJson = localStorage.getItem('nobarfilm_watch_history');
      let items: ContinueWatchingItem[] = [];
      if (historyJson) {
        try {
          items = JSON.parse(historyJson);
        } catch (e) {
          console.error('Failed to parse watch history:', e);
        }
      }

      // Filter out this subject_id to avoid duplicate entries (we show latest watched)
      items = items.filter((item) => item.subject_id !== subjectId);

      const newItem: ContinueWatchingItem = {
        id: subjectId,
        subject_id: subjectId,
        subject_type: subjectType,
        title,
        cover_url: coverUrl || null,
        current_episode: currentEpisode || 1,
        total_episodes: totalEpisodes || null,
        progress_seconds: Math.floor(progressSeconds),
        duration_seconds: Math.floor(durationSeconds),
        progress_percent,
        last_watched_at: new Date().toISOString(),
      };

      // Only save if not completed (completed items are removed from continue watching list)
      if (!isCompleted) {
        items.push(newItem);
      }

      // Limit to 15 items
      if (items.length > 15) {
        items = items.slice(-15);
      }

      localStorage.setItem('nobarfilm_watch_history', JSON.stringify(items));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nobarfilm_watch_history_updated'));
        window.dispatchEvent(new Event('storage'));
      }
    },
    [subjectId, subjectType, title, coverUrl, currentEpisode, totalEpisodes],
  );

  return {
    saveProgress,
    progressData,
  };
}
