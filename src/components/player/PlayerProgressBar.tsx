'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

interface PlayerProgressBarProps {
  currentTime: number;
  duration: number;
  buffered?: number;
  onSeek: (time: number) => void;
}

export function PlayerProgressBar({
  currentTime,
  duration,
  buffered = 0,
  onSeek,
}: PlayerProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  const displayTime = isScrubbing && scrubTime !== null ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!barRef.current || duration <= 0) return { time: 0, pos: 0 };
      const rect = barRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = rect.width > 0 ? clickX / rect.width : 0;
      return { time: percent * duration, pos: clickX };
    },
    [duration]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    setIsScrubbing(true);
    const { time, pos } = getTimeFromClientX(e.clientX);
    setScrubTime(time);
    setHoverPos(pos);
    setHoverTime(time);
  };

  useEffect(() => {
    if (!isScrubbing) return;
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (duration <= 0) return;
      const { time, pos } = getTimeFromClientX(e.clientX);
      setHoverPos(pos);
      setHoverTime(time);
      setScrubTime(time);
    };
    const handleWindowMouseUp = (e: MouseEvent) => {
      const { time } = getTimeFromClientX(e.clientX);
      onSeek(time);
      setIsScrubbing(false);
      setScrubTime(null);
    };
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isScrubbing, duration, getTimeFromClientX, onSeek]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isScrubbing || duration <= 0) return;
    const { time, pos } = getTimeFromClientX(e.clientX);
    setHoverPos(pos);
    setHoverTime(time);
  };

  const handleMouseLeave = () => {
    if (!isScrubbing) {
      setHoverTime(null);
    }
  };

  // Touch Handlers for mobile & touchscreens
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.touches.length !== 1 || duration <= 0) return;
    const { time, pos } = getTimeFromClientX(e.touches[0].clientX);
    setIsScrubbing(true);
    setScrubTime(time);
    setHoverPos(pos);
    setHoverTime(time);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.touches.length !== 1 || duration <= 0) return;
    const { time, pos } = getTimeFromClientX(e.touches[0].clientX);
    setScrubTime(time);
    setHoverPos(pos);
    setHoverTime(time);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    let finalTime = scrubTime;
    if (e.changedTouches.length > 0) {
      const { time } = getTimeFromClientX(e.changedTouches[0].clientX);
      finalTime = time;
    }
    if (finalTime !== null) {
      onSeek(finalTime);
    }
    setIsScrubbing(false);
    setScrubTime(null);
    setHoverTime(null);
  };

  return (
    <div
      data-interactive="true"
      className="w-full flex items-center gap-2.5 sm:gap-3 group/progress py-2 sm:py-1.5 cursor-pointer touch-none select-none"
    >
      {/* Time Current */}
      <span className="text-[11px] sm:text-xs font-semibold text-zinc-300 min-w-[34px] sm:min-w-[36px] text-right font-mono">
        {formatTime(displayTime)}
      </span>

      {/* Progress Bar Track */}
      <div
        ref={barRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="relative flex-1 h-2 sm:h-1.5 group-hover/progress:h-2.5 bg-zinc-800/80 rounded-full overflow-visible transition-all duration-150"
      >
        {/* Hover / Scrub Time Tooltip */}
        {(hoverTime !== null || isScrubbing) && (
          <div
            className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 bg-zinc-900/95 border border-zinc-700 rounded-md text-[11px] font-bold text-white shadow-xl pointer-events-none backdrop-blur-sm z-50 whitespace-nowrap"
            style={{ left: `${hoverPos}px` }}
          >
            {formatTime(hoverTime ?? (scrubTime || 0))}
          </div>
        )}

        {/* Buffered Progress */}
        <div
          className="absolute top-0 left-0 h-full bg-zinc-600/50 rounded-full"
          style={{ width: `${Math.min(100, bufferedPercent)}%` }}
        />

        {/* Current Progress (Red Bar) */}
        <div
          className="absolute top-0 left-0 h-full bg-red-600 rounded-full relative"
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        >
          {/* Scrub Knob / Indicator (always visible on mobile or when scrubbing / hovering) */}
          <div
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 sm:w-3 sm:h-3 rounded-full bg-red-500 border-2 border-white shadow-lg transition-transform ${
              isScrubbing ? 'scale-125 opacity-100' : 'opacity-90 sm:opacity-0 group-hover/progress:opacity-100 group-hover/progress:scale-110'
            }`}
          />
        </div>
      </div>

      {/* Time Duration */}
      <span className="text-[11px] sm:text-xs font-semibold text-zinc-400 min-w-[34px] sm:min-w-[36px] font-mono">
        {formatTime(duration)}
      </span>
    </div>
  );
}
