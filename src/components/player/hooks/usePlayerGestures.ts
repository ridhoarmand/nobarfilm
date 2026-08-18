'use client';

import { useState, useRef, useCallback } from 'react';

interface UsePlayerGesturesProps {
  isMobile?: boolean;
  onTogglePlay: () => void;
  onToggleFullscreen: () => void;
  onSeek: (deltaSeconds: number) => void;
  volume: number;
  onVolumeChange: (newVol: number) => void;
  brightness: number;
  onBrightnessChange: (newBrightness: number) => void;
  onToggleControls: () => void;
}

const isInteractiveTarget = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof Element)) return false;
  return !!target.closest(
    'button, input, select, textarea, a, [data-interactive="true"], [role="dialog"], [role="menu"], [data-popover]'
  );
};

export function usePlayerGestures({
  isMobile: _isMobile,
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
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTouchTimeRef = useRef<number>(0);

  const showHud = useCallback((type: 'volume' | 'brightness' | 'play' | 'pause', value?: number) => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    setHudFeedback({ type, value });
    hudTimerRef.current = setTimeout(() => {
      setHudFeedback(null);
    }, 1000);
  }, []);

  // Tracking refs for gestures
  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    initialVol: number;
    initialBright: number;
    side: 'left' | 'right' | 'center';
    isVerticalDrag: boolean;
    canVerticalDrag: boolean;
  } | null>(null);

  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' | 'center' }>({ time: 0, side: 'center' });
  const accumulatedSeekRef = useRef<number>(0);

  // Mouse click & double click handler (works for desktop and mouse on touchscreen laptops)
  const handleDesktopClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // If this click was triggered right after a touch event (synthetic click), ignore it
      if (Date.now() - lastTouchTimeRef.current < 450) {
        return;
      }

      if (isInteractiveTarget(e.target)) {
        return;
      }

      if (clickTimerRef.current) {
        // Double click detected -> Toggle Fullscreen!
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
    [onToggleFullscreen, onTogglePlay]
  );

  // Touch handlers (works for phones, tablets, and touchscreen laptops)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      lastTouchTimeRef.current = Date.now();

      // Don't intercept touches on buttons, progress bar, or interactive dialogs
      if (isInteractiveTarget(e.target)) {
        touchStartRef.current = null;
        return;
      }

      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeX = touch.clientX - rect.left;
      const relativeY = touch.clientY - rect.top;
      const width = rect.width;
      const height = rect.height;

      // Status Bar & Navigation Bar Dead-Zone:
      // If touch begins in top 18% (e.g. status bar / notification pull down)
      // or bottom 18% (e.g. nav bar / progress bar), do NOT allow vertical drag gestures.
      const topDeadZone = Math.max(55, height * 0.18);
      const bottomDeadZone = Math.max(55, height * 0.18);
      const isEdgeZone = relativeY < topDeadZone || relativeY > height - bottomDeadZone;

      let side: 'left' | 'right' | 'center' = 'center';
      if (relativeX < width * 0.4) {
        side = 'left';
      } else if (relativeX > width * 0.6) {
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
        canVerticalDrag: !isEdgeZone,
      };
    },
    [volume, brightness]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      lastTouchTimeRef.current = Date.now();
      if (!touchStartRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const start = touchStartRef.current;
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      // Check if vertical drag is initiated (only if touch did not start in edge dead-zone)
      if (!start.isVerticalDrag && start.canVerticalDrag) {
        if (Math.abs(deltaY) > 28 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
          start.isVerticalDrag = true;
          // Cancel any pending tap toggle
          if (singleTapTimerRef.current) {
            clearTimeout(singleTapTimerRef.current);
            singleTapTimerRef.current = null;
          }
        }
      }

      if (start.isVerticalDrag) {
        const sensitivity = 320; // Smooth px for full 0-100% range
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
      lastTouchTimeRef.current = Date.now();
      if (!touchStartRef.current) return;
      const start = touchStartRef.current;
      const now = Date.now();
      const duration = now - start.time;

      if (!start.isVerticalDrag && duration < 300) {
        const DOUBLE_TAP_DELAY = 280;
        const isDoubleTap =
          lastTapRef.current.side === start.side &&
          now - lastTapRef.current.time < DOUBLE_TAP_DELAY &&
          (start.side === 'left' || start.side === 'right');

        if (isDoubleTap) {
          // Clear pending single tap action
          if (singleTapTimerRef.current) {
            clearTimeout(singleTapTimerRef.current);
            singleTapTimerRef.current = null;
          }

          // Double Tap Seek on Left or Right
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
          }, 900);

          lastTapRef.current = { time: 0, side: 'center' };
        } else {
          lastTapRef.current = { time: now, side: start.side };

          if (start.side === 'left' || start.side === 'right') {
            // For left/right, wait briefly in case user is double tapping
            if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
            singleTapTimerRef.current = setTimeout(() => {
              singleTapTimerRef.current = null;
              onToggleControls();
            }, DOUBLE_TAP_DELAY);
          } else {
            // Center tap immediately toggles controls
            onToggleControls();
          }
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
