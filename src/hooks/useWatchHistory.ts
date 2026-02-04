'use client';

import { useCallback } from 'react';

export interface WatchHistoryItem {
  time: number;
  timestamp: number;
}

export type PlatformId = 'netshort' | 'reelshort' | 'dramabox' | 'melolo' | 'flickreels' | 'freereels';

export function useWatchHistory() {
  const getHistoryKey = (platform: PlatformId, bookId: string, episodeId: string | number) => {
    return `watch_history_${platform}_${bookId}_${episodeId}`;
  };

  const saveProgress = useCallback((platform: PlatformId, bookId: string, episodeId: string | number, time: number) => {
    if (typeof window === 'undefined') return;
    const key = getHistoryKey(platform, bookId, episodeId);
    const data: WatchHistoryItem = {
      time,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  }, []);

  const getProgress = useCallback((platform: PlatformId, bookId: string, episodeId: string | number): number => {
    if (typeof window === 'undefined') return 0;
    const key = getHistoryKey(platform, bookId, episodeId);
    const item = localStorage.getItem(key);
    if (!item) return 0;

    try {
      const data = JSON.parse(item) as WatchHistoryItem;
      // Optional: Only resume if watched within last 30 days? For now, keep it simple.
      return data.time;
    } catch {
      return 0;
    }
  }, []);

  return {
    saveProgress,
    getProgress,
  };
}
