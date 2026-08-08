'use client';

import { useState, useCallback } from 'react';
import { Subject } from '@/types/api';

const WATCHLIST_STORAGE_KEY = 'nobarfilm_watchlist_v1';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<Subject[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading watchlist:', e);
      return [];
    }
  });

  const addToWatchlist = useCallback((movie: Subject) => {
    setWatchlist((prev) => {
      if (prev.some((item) => item.subjectId === movie.subjectId)) return prev;
      const updated = [movie, ...prev];
      try {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  const removeFromWatchlist = useCallback((subjectId: string) => {
    setWatchlist((prev) => {
      const updated = prev.filter((item) => item.subjectId !== subjectId);
      try {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  const toggleWatchlist = useCallback((movie: Subject) => {
    setWatchlist((prev) => {
      const exists = prev.some((item) => item.subjectId === movie.subjectId);
      const updated = exists
        ? prev.filter((item) => item.subjectId !== movie.subjectId)
        : [movie, ...prev];
      try {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  const isInWatchlist = useCallback(
    (subjectId: string) => {
      return watchlist.some((item) => item.subjectId === subjectId);
    },
    [watchlist],
  );

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isInWatchlist,
  };
}
