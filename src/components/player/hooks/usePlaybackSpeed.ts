'use client';import { useCallback, useRef } from 'react';

const STORAGE_KEY = 'nobar-playback-rate';

/**
 * Helper to read from localStorage synchronously
 */
function getStoredSpeed(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const rate = parseFloat(saved);
      if (!isNaN(rate) && rate > 0 && rate <= 16) {
        return rate;
      }
    }
  } catch {
    // localStorage might not be available
  }
  return 1;
}

/**
 * Hook for persistent playback speed across episodes and sessions.
 * Uses synchronous localStorage read to ensure speed is available immediately.
 */
export function usePlaybackSpeed() {
  // Read from localStorage SYNCHRONOUSLY on first call
  const speedRef = useRef<number>(getStoredSpeed());

  // Stable setter that updates ref and localStorage
  const setSpeed = useCallback((newSpeed: number) => {
    speedRef.current = newSpeed;
    try {
      localStorage.setItem(STORAGE_KEY, newSpeed.toString());
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Apply speed to a player instance
  const applyToPlayer = useCallback((player: { playbackRate: number } | null) => {
    if (player) {
      // Re-read from localStorage in case it was updated elsewhere
      const currentSpeed = getStoredSpeed();
      speedRef.current = currentSpeed;
      player.playbackRate = currentSpeed;
    }
  }, []);

  return {
    speed: speedRef.current,
    speedRef,
    setSpeed,
    applyToPlayer,
  };
}
