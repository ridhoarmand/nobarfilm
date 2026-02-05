'use client';

import { useCallback, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { SaveProgressPayload } from '@/types/watch-history';

interface UseMovieBoxWatchHistoryParams {
  subjectId: string;
  subjectType: number;
  title: string;
  coverUrl?: string;
  currentEpisode?: number;
  totalEpisodes?: number;
}

export function useMovieBoxWatchHistory(params: UseMovieBoxWatchHistoryParams) {
  const { user } = useAuth();
  const { subjectId, subjectType, title, coverUrl, currentEpisode, totalEpisodes } = params;

  const saveProgress = useCallback(
    async (progressSeconds: number, durationSeconds: number) => {
      if (!user) {
        console.warn('User not authenticated, skipping watch history save');
        return;
      }

      if (!subjectId || !title || durationSeconds === 0) {
        console.warn('Missing required fields for watch history');
        return;
      }

      const payload: SaveProgressPayload = {
        subject_id: subjectId,
        subject_type: subjectType,
        title,
        cover_url: coverUrl,
        current_episode: currentEpisode || 1,
        total_episodes: totalEpisodes,
        progress_seconds: Math.floor(progressSeconds),
        duration_seconds: Math.floor(durationSeconds),
      };

      try {
        const response = await fetch('/api/watch-history/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Failed to save watch history:', error);
        }
      } catch (error) {
        console.error('Error saving watch history:', error);
      }
    },
    [user, subjectId, subjectType, title, coverUrl, currentEpisode, totalEpisodes]
  );

  return {
    saveProgress,
  };
}
