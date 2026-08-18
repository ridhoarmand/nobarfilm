'use client';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { ContinueWatchingItem } from '@/types/watch-history';

interface UseMovieBoxWatchHistoryParams {
  subjectId: string;
  subjectType: number;
  title: string;
  coverUrl?: string;
  currentSeason?: number;
  currentEpisode?: number;
  totalEpisodes?: number;
}

export function useMovieBoxWatchHistory(params: UseMovieBoxWatchHistoryParams) {
  const { subjectId, subjectType, title, coverUrl, currentSeason, currentEpisode, totalEpisodes } = params;
  const lastProgressRef = useRef<{ time: number; duration: number }>({ time: 0, duration: 0 });

  // Fetch initial progress
  const { data: progressData } = useQuery({
    queryKey: ['watch-progress', subjectId, currentSeason, currentEpisode],
    queryFn: async () => {
      if (typeof window === 'undefined') return null;
      const historyJson = localStorage.getItem('nobarfilm_watch_history');
      if (!historyJson) return null;
      try {
        const items = JSON.parse(historyJson) as ContinueWatchingItem[];
        const normalizedTitle = title ? title.trim().toLowerCase() : '';
        const match = items.find(
          (item) =>
            (item.subject_id === subjectId || (normalizedTitle && item.title?.trim().toLowerCase() === normalizedTitle)) &&
            item.current_episode === (currentEpisode ?? 1) &&
            (typeof currentSeason !== 'number' || (item.current_season ?? 1) === currentSeason)
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

  const saveProgressSync = useCallback(
    (progressSeconds: number, durationSeconds: number) => {
      if (typeof window === 'undefined' || !subjectId || !title || durationSeconds === 0) {
        return;
      }

      lastProgressRef.current = { time: progressSeconds, duration: durationSeconds };

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

      // Filter out this subject_id AND title to guarantee exactly 1 latest item per film/series
      const normalizedTitle = title.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.subject_id !== subjectId &&
          (!item.title || item.title.trim().toLowerCase() !== normalizedTitle)
      );

      const newItem: ContinueWatchingItem = {
        id: subjectId,
        subject_id: subjectId,
        subject_type: subjectType,
        title,
        cover_url: coverUrl || null,
        current_season: currentSeason ?? (subjectType === 2 ? 1 : 0),
        current_episode: currentEpisode ?? 0,
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

      try {
        localStorage.setItem('nobarfilm_watch_history', JSON.stringify(items));
        window.dispatchEvent(new CustomEvent('nobarfilm_watch_history_updated'));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        console.error('Failed to write watch history to localStorage:', e);
      }
    },
    [subjectId, subjectType, title, coverUrl, currentSeason, currentEpisode, totalEpisodes]
  );

  const saveProgress = useCallback(
    (progressSeconds: number, durationSeconds: number) => {
      saveProgressSync(progressSeconds, durationSeconds);
    },
    [saveProgressSync]
  );

  // Flush on unmount or pagehide/beforeunload
  useEffect(() => {
    const flushProgress = () => {
      const { time, duration } = lastProgressRef.current;
      if (time > 3 && duration > 0) {
        saveProgressSync(time, duration);
      }
    };

    window.addEventListener('pagehide', flushProgress);
    window.addEventListener('beforeunload', flushProgress);

    return () => {
      flushProgress();
      window.removeEventListener('pagehide', flushProgress);
      window.removeEventListener('beforeunload', flushProgress);
    };
  }, [saveProgressSync]);

  return {
    saveProgress,
    saveProgressSync,
    progressData,
  };
}
