'use client';

import { useState, useRef, useCallback } from 'react';

interface UseDoubleTapSeekProps {
  onSeek: (seconds: number) => void;
}

export function useDoubleTapSeek({ onSeek }: UseDoubleTapSeekProps) {
  const [seekAnimation, setSeekAnimation] = useState<{
    side: 'rewind' | 'forward';
    seconds: number;
  } | null>(null);
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' | null }>({ time: 0, side: null });
  const accumulatedSecondsRef = useRef<number>(0);
  const animTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      const now = Date.now();
      const rect = e.currentTarget.getBoundingClientRect();
      let clientX = 0;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
      } else if ('clientX' in e) {
        clientX = e.clientX;
      }

      const relativeX = clientX - rect.left;
      const isLeft = relativeX < rect.width / 2;
      const side: 'left' | 'right' = isLeft ? 'left' : 'right';

      const DOUBLE_TAP_DELAY = 350; // ms
      if (lastTapRef.current.side === side && now - lastTapRef.current.time < DOUBLE_TAP_DELAY) {
        // Double tap / consecutive rapid taps confirmed!
        const step = isLeft ? -10 : 10;
        onSeek(step);

        if (
          accumulatedSecondsRef.current === 0 ||
          (isLeft && accumulatedSecondsRef.current > 0) ||
          (!isLeft && accumulatedSecondsRef.current < 0)
        ) {
          accumulatedSecondsRef.current = step;
        } else {
          accumulatedSecondsRef.current += step;
        }

        const currentTotal = accumulatedSecondsRef.current;
        setSeekAnimation({
          side: isLeft ? 'rewind' : 'forward',
          seconds: Math.abs(currentTotal),
        });

        if (animTimerRef.current) clearTimeout(animTimerRef.current);
        animTimerRef.current = setTimeout(() => {
          setSeekAnimation(null);
          accumulatedSecondsRef.current = 0;
        }, 1000);

        lastTapRef.current = { time: now, side };
      } else {
        lastTapRef.current = { time: now, side };
      }
    },
    [onSeek]
  );

  return {
    handleTap,
    seekAnimation,
  };
}
