'use client';

import React from 'react';
import { Film, Check } from 'lucide-react';

interface QualityPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  qualities: number[];
  activeIndex: number;
  onSelectQuality: (index: number) => void;
  activeHlsHeight?: number | null;
}

export function QualityPopover({
  isOpen,
  onClose,
  qualities = [],
  activeIndex,
  onSelectQuality,
  activeHlsHeight,
}: QualityPopoverProps) {
  if (!isOpen) return null;

  const runningRes = activeHlsHeight || (qualities.length > 0 ? qualities[0] : 1080);

  return (
    <div
      data-interactive="true"
      data-popover="true"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="absolute bottom-14 sm:bottom-16 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-40 w-64 max-w-[calc(100vw-1rem)] bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl p-3.5 sm:p-4 animate-fade-in text-white text-xs"
    >
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/80 mb-3">
        <Film className="w-4 h-4 text-red-500" />
        <span className="font-bold uppercase tracking-wider text-zinc-200">Kualitas Resolusi</span>
      </div>

      {/* Quality List */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {/* Auto (Dinamis) Option */}
        <button
          type="button"
          onClick={() => {
            onSelectQuality(-1);
            onClose();
          }}
          className={`w-full px-3 py-2 rounded-xl text-left font-medium flex items-center justify-between transition-all ${
            activeIndex === -1
              ? 'bg-red-600/20 border border-red-600/60 text-white'
              : 'bg-zinc-900/60 border border-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span>Auto ({runningRes}p)</span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 border border-emerald-800/40 rounded">
              Dinamis
            </span>
          </span>
          {activeIndex === -1 && <Check className="w-4 h-4 text-red-500" />}
        </button>

        {qualities.length > 0 ? (
          qualities.map((item, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <button
                key={item || idx}
                type="button"
                onClick={() => {
                  onSelectQuality(idx);
                  onClose();
                }}
                className={`w-full px-3 py-2 rounded-xl text-left font-medium flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-red-600/20 border border-red-600/60 text-white'
                    : 'bg-zinc-900/60 border border-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <span>
                  {item}p {item >= 720 ? '(HD)' : ''}
                </span>
                {isSelected && <Check className="w-4 h-4 text-red-500" />}
              </button>
            );
          })
        ) : (
          <p className="text-zinc-500 italic py-1 text-center">Auto Mode Only</p>
        )}
      </div>
    </div>
  );
}
