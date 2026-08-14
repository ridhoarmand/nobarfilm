'use client';

import { useState, useRef, useCallback } from 'react';

interface UsePlayerGesturesProps {
  isMobile: boolean;
  onTogglePlay: () => void;
  onToggleFullscreen: () => void;
  onSeek: (deltaSeconds: number) => void;
  volume: number;
  onVolumeChange: (newVol: number) => void;
  brightness: number;
  onBrightnessChange: (newBrightness: number) => void;
  onToggleControls: () => void;
}

export function usePlayerGestures({
  isMobile,
  onTogglePlay,
  onToggleFullscreen,
  onSeek,
  volume,
  onVolumeChange,
  brightness,
  onBrightnessChange,
  onToggleControls,
}: UsePlayerGesturesProps) {
  // Feedback HUD states
  const [seekFeedback, setSeekFeedback] = useState<{
    side: 'rewind' | 'forward';
    seconds: number;
  } | null>(null);

  const [hudFeedback, setHudFeedback] = useState<{
    type: 'volume' | 'brightness' | 'play' | 'pause';
    value?: number; // 0 - 100 percentage
  } | null>(null);

  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);
  const seekTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showHud = useCallback((type: 'volume' | 'brightness' | 'play' | 'pause', value?: number) => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    setHudFeedback({ type, value });
    hudTimerRef.current = setTimeout(() => {
      setHudFeedback(null);
    }, 1000);
  }, []);

  // Tracking refs for mobile gestures
  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    initialVol: number;
    initialBright: number;
    side: 'left' | 'right' | 'center';
    isVerticalDrag: boolean;
  } | null>(null);

  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' | 'center' }>({ time: 0, side: 'center' });
  const accumulatedSeekRef = useRef<number>(0);

  // Desktop click & double click handler
  const handleDesktopClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile) return;
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('[data-interactive]')) {
        return;
      }

      if (clickTimerRef.current) {
        // Double click detected anywhere on video -> Toggle Fullscreen!
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        onToggleFullscreen();
      } else {
        // Single click -> Toggle Play/Pause
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null;
          onTogglePlay();
        }, 220);
      }
    },
    [isMobile, onToggleFullscreen, onTogglePlay]
  );

  // Mobile touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeX = touch.clientX - rect.left;
      const width = rect.width;

      let side: 'left' | 'right' | 'center' = 'center';
      if (relativeX < width * 0.45) {
        side = 'left';
      } else if (relativeX > width * 0.55) {
        side = 'right';
      }

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        initialVol: volume,
        initialBright: brightness,
        side,
        isVerticalDrag: false,
      };
    },
    [volume, brightness]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!touchStartRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const start = touchStartRef.current;
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      // Check if vertical drag is initiated
      if (!start.isVerticalDrag) {
        if (Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX)) {
          start.isVerticalDrag = true;
        }
      }

      if (start.isVerticalDrag) {
        const sensitivity = 220; // px for full 0-100% range
        const step = -deltaY / sensitivity;

        if (start.side === 'right') {
          // Right side = Volume (0.0 to 1.0)
          const newVol = Math.max(0, Math.min(1, start.initialVol + step));
          onVolumeChange(newVol);
          showHud('volume', Math.round(newVol * 100));
        } else if (start.side === 'left') {
          // Left side = Brightness (0.3 to 1.3)
          const newBright = Math.max(0.3, Math.min(1.3, start.initialBright + step));
          onBrightnessChange(newBright);
          showHud('brightness', Math.round(((newBright - 0.3) / 1.0) * 100));
        }
      }
    },
    [onVolumeChange, onBrightnessChange, showHud]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!touchStartRef.current) return;
      const start = touchStartRef.current;
      const now = Date.now();
      const duration = now - start.time;

      if (!start.isVerticalDrag && duration < 300) {
        // Tap or Double Tap
        const DOUBLE_TAP_DELAY = 320;
        const isDoubleTap =
          lastTapRef.current.side === start.side &&
          now - lastTapRef.current.time < DOUBLE_TAP_DELAY &&
          (start.side === 'left' || start.side === 'right');

        if (isDoubleTap) {
          // Double Tap Seek on Mobile Left or Right
          const isLeft = start.side === 'left';
          const step = isLeft ? -10 : 10;
          onSeek(step);

          if (
            accumulatedSeekRef.current === 0 ||
            (isLeft && accumulatedSeekRef.current > 0) ||
            (!isLeft && accumulatedSeekRef.current < 0)
          ) {
            accumulatedSeekRef.current = step;
          } else {
            accumulatedSeekRef.current += step;
          }

          setSeekFeedback({
            side: isLeft ? 'rewind' : 'forward',
            seconds: Math.abs(accumulatedSeekRef.current),
          });

          if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
          seekTimerRef.current = setTimeout(() => {
            setSeekFeedback(null);
            accumulatedSeekRef.current = 0;
          }, 1000);

          lastTapRef.current = { time: 0, side: 'center' };
        } else {
          lastTapRef.current = { time: now, side: start.side };
          // Single tap on mobile toggles controls
          onToggleControls();
        }
      }

      touchStartRef.current = null;
    },
    [onSeek, onToggleControls]
  );

  return {
    handleDesktopClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    seekFeedback,
    hudFeedback,
    showHud,
  };
}
