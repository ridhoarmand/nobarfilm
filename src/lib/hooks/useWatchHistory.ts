import { useState, useRef, useEffect, useCallback } from 'react';import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { SaveProgressPayload } from '@/types/watch-history';
import { SubjectType } from '@/types/api';

interface UseWatchHistoryProps {
  subjectId: string;
  subjectType: SubjectType;
  title: string;
  coverUrl?: string;
  currentEpisode?: number;
  totalEpisodes?: number;
}

export function useWatchHistory({ subjectId, subjectType, title, coverUrl, currentEpisode = 1, totalEpisodes }: UseWatchHistoryProps) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedTime = useRef<number>(0);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Debounced save to DB (every 10 seconds or significant change)
  const saveProgress = useCallback(
    async (currentTime: number, duration: number, force = false) => {
      // Don't save if user not logged in or time hasn't changed enough (unless forced)
      if (!user) return;
      if (!force && Math.abs(currentTime - lastSavedTime.current) < 10) return;

      // Clear pending timeout if any
      if (saveTimeout.current) clearTimeout(saveTimeout.current);

      const doSave = async () => {
        setIsSaving(true);
        try {
          const payload: SaveProgressPayload = {
            subject_id: subjectId,
            subject_type: subjectType,
            title,
            cover_url: coverUrl,
            current_episode: currentEpisode,
            total_episodes: totalEpisodes,
            progress_seconds: currentTime,
            duration_seconds: duration,
            completed: currentTime / duration >= 0.9, // 90% threshold
          };

          // Use our API endpoint
          const response = await fetch('/api/watch-history/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            lastSavedTime.current = currentTime;
          }
        } catch (error) {
          console.error('Failed to save watch history:', error);
        } finally {
          setIsSaving(false);
        }
      };

      if (force) {
        doSave();
      } else {
        // Debounce
        saveTimeout.current = setTimeout(doSave, 2000);
      }
    },
    [user, subjectId, subjectType, title, coverUrl, currentEpisode, totalEpisodes], // Dependencies
  );

  // Load initial progress (if resuming)
  // This might be redundant if the main page already checks for resume position
  // But useful to know "last saved status"

  // Cleanup on unmount (save final progress)
  // Note: tricky in valid useEffect cleanup, usually better to rely on regular intervals
  // or use navigator.sendBeacon if needed. Ideally, the player pauses before unmount.

  return {
    saveProgress,
    isSaving,
  };
}
