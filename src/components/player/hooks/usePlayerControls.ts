'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function usePlayerControls(isPlaying: boolean, autoHideDelayMs: number = 3000) {
  const [isVisible, setIsVisible] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showControls = useCallback(() => {
    setIsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelayMs);
    }
  }, [isPlaying, autoHideDelayMs]);

  const keepControlsVisible = useCallback(() => {
    setIsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  }, []);

  const hideControlsNow = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    setIsVisible(false);
  }, []);

  const scheduleQuickHide = useCallback((delayMs: number = 800) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, delayMs);
    }
  }, [isPlaying]);

  useEffect(() => {
    queueMicrotask(() => {
      showControls();
    });
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [showControls]);

  return {
    isVisible,
    showControls,
    keepControlsVisible,
    hideControlsNow,
    scheduleQuickHide,
  };
}
