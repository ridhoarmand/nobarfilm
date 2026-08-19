'use client';

import { useState, useCallback, useEffect } from 'react';
import { Subject } from '@/types/api';

const WATCHLIST_STORAGE_KEY = 'nobarfilm_watchlist_v1';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<Subject[]>([]);

  // Load from localStorage on mount (prevents SSR mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        setWatchlist(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading watchlist:', e);
    }
  }, []);

  // Listen for sync events
  useEffect(() => {
    const syncWatchlist = () => {
      try {
        const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
        if (saved) {
          setWatchlist(JSON.parse(saved));
        } else {
          setWatchlist([]);
        }
      } catch (e) {
        console.error('Error syncing watchlist:', e);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === WATCHLIST_STORAGE_KEY) syncWatchlist();
    };

    window.addEventListener('nobarfilm_watchlist_updated', syncWatchlist);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('nobarfilm_watchlist_updated', syncWatchlist);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const triggerSync = () => {
    window.dispatchEvent(new CustomEvent('nobarfilm_watchlist_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  const addToWatchlist = useCallback((movie: Subject) => {
    setWatchlist((prev) => {
      if (prev.some((item) => item.subjectId === movie.subjectId)) return prev;
      const updated = [movie, ...prev];
      try {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
        setTimeout(triggerSync, 0);
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
        setTimeout(triggerSync, 0);
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
        setTimeout(triggerSync, 0);
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
