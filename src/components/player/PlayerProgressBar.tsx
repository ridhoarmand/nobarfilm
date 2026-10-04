'use client';

import React, { useRef, useState } from 'react';

interface PlayerProgressBarProps {
  currentTime: number;
  duration: number;
  buffered?: number;
  onSeek: (time: number) => void;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = String(Math.floor(seconds % 60)).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}` : `${minutes}:${remainder}`;
}

export function PlayerProgressBar({
  currentTime,
  duration,
  buffered = 0,
  onSeek,
}: PlayerProgressBarProps) {
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const scrubTimeRef = useRef(0);
  const total = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const position = Number.isFinite(currentTime) ? Math.min(total, Math.max(0, currentTime)) : 0;
  const displayedPosition = scrubTime ?? position;
  const progress = total > 0 ? (displayedPosition / total) * 100 : 0;
  const bufferedProgress = total > 0 ? Math.min(100, Math.max(0, (buffered / total) * 100)) : 0;

  return (
    <div
      data-interactive="true"
      className="w-full min-w-0 flex items-center gap-2 sm:gap-3 select-none"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <span className="shrink-0 text-xs font-semibold text-zinc-200 tabular-nums font-mono" aria-hidden="true">
        {formatTime(displayedPosition)}
      </span>
      <div className="relative flex-1 min-w-0 h-11 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-zinc-700 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute h-full bg-zinc-400/60" style={{ width: `${bufferedProgress}%` }} />
          <div className="absolute h-full bg-red-600" style={{ width: `${progress}%` }} />
        </div>
        <input
          type="range"
          min={0}
          max={total || 1}
          step={1}
          value={displayedPosition}
          disabled={total <= 0}
          aria-label="Posisi pemutaran"
          aria-valuetext={`${formatTime(displayedPosition)} dari ${formatTime(total)}`}
          title="Geser untuk memilih waktu; tombol arah mengubah posisi"
          onPointerDown={(e) => {
            draggingRef.current = true;
            scrubTimeRef.current = position;
            setScrubTime(position);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onChange={(e) => {
            const time = Number(e.currentTarget.value);
            if (draggingRef.current) {
              scrubTimeRef.current = time;
              setScrubTime(time);
            } else {
              onSeek(time);
            }
          }}
          onPointerUp={() => {
            if (draggingRef.current) onSeek(scrubTimeRef.current);
            draggingRef.current = false;
            setScrubTime(null);
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
            setScrubTime(null);
          }}
          onPointerMove={(e) => {
            if (e.pointerType === 'touch' || total <= 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setPreviewTime(Math.min(total, Math.max(0, (e.clientX - rect.left) / rect.width * total)));
          }}
          onPointerLeave={() => setPreviewTime(null)}
          className="relative z-10 w-full min-w-0 h-11 appearance-none bg-transparent cursor-pointer accent-red-600 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white disabled:cursor-default"
        />
        {previewTime !== null && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 pointer-events-none rounded-md bg-zinc-900 px-2 py-1 text-xs font-mono text-white border border-white/20" aria-hidden="true">
            {formatTime(previewTime)}
          </span>
        )}
      </div>
      <span className="shrink-0 text-xs font-semibold text-zinc-400 tabular-nums font-mono" aria-hidden="true">
        {formatTime(total)}
      </span>
    </div>
  );
}
