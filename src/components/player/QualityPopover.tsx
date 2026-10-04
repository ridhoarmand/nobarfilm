'use client';

import React from 'react';
import { Film, Check, X } from 'lucide-react';

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
      role="dialog"
      aria-label="Kualitas video"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="absolute inset-y-3 right-3 z-50 w-80 max-w-[calc(100%-1.5rem)] overflow-y-auto overscroll-contain bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl p-3.5 sm:p-4 animate-fade-in text-white text-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/80 mb-3">
        <Film className="w-4 h-4 text-red-500" />
        <span className="font-bold uppercase tracking-wider text-zinc-200">Kualitas Resolusi</span>
        <button type="button" onClick={onClose} aria-label="Tutup kualitas video" className="ml-auto rounded-lg hover:bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
      </div>

      {/* Quality List */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {/* Auto (Dinamis) Option */}
        <button
          type="button"
          aria-pressed={activeIndex === -1}
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
                aria-pressed={isSelected}
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
          <p className="text-zinc-500 italic py-1 text-center">Hanya kualitas otomatis tersedia</p>
        )}
      </div>
    </div>
  );
}
