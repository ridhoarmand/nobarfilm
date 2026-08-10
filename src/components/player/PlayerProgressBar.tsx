'use client';

import React, { useRef, useState } from 'react';

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
  const [isDragging, setIsDragging] = useState(false);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
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

  const calculateTimeFromEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!barRef.current || duration <= 0) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = clickX / rect.width;
    return percent * duration;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || duration <= 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const moveX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setHoverPos(moveX);
    setHoverTime((moveX / rect.width) * duration);
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setHoverTime(null);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const targetTime = calculateTimeFromEvent(e);
    onSeek(targetTime);
  };

  return (
    <div className="w-full flex items-center gap-3 group/progress py-1 cursor-pointer">
      {/* Time Current */}
      <span className="text-xs font-semibold text-zinc-300 min-w-[36px] text-right">
        {formatTime(currentTime)}
      </span>

      {/* Progress Bar Track */}
      <div
        ref={barRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative flex-1 h-1.5 hover:h-2.5 bg-zinc-800/80 rounded-full overflow-visible transition-all duration-150"
      >
        {/* Hover Time Tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[11px] font-bold text-white shadow-md pointer-events-none"
            style={{ left: `${hoverPos}px` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}

        {/* Buffered Progress */}
        <div
          className="absolute top-0 left-0 h-full bg-zinc-600/50 rounded-full"
          style={{ width: `${Math.min(100, bufferedPercent)}%` }}
        />

        {/* Current Progress (Red Netflix Bar) */}
        <div
          className="absolute top-0 left-0 h-full bg-red-600 rounded-full relative"
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        >
          {/* Scrub Knob / Indicator */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Time Duration */}
      <span className="text-xs font-semibold text-zinc-400 min-w-[36px]">
        {formatTime(duration)}
      </span>
    </div>
  );
}
