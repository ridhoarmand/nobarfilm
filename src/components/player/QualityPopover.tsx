'use client';

import React from 'react';
import { Check, X } from 'lucide-react';

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

  return (
    <div
      data-interactive="true"
      data-popover="true"
      role="dialog"
      aria-label="Kualitas video"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="player-panel text-white text-sm"
    >
      <div className="player-panel-header">
        <h2 className="font-semibold">Kualitas video</h2>
        <button type="button" onClick={onClose} aria-label="Tutup kualitas video" className="ml-auto min-h-11 min-w-11 rounded-lg hover:bg-white/10 flex items-center justify-center"><X className="w-4 h-4" aria-hidden="true" /></button>
      </div>

      <div className="space-y-1">
        <button
          type="button"
          aria-pressed={activeIndex === -1}
          onClick={() => {
            onSelectQuality(-1);
            onClose();
          }}
          className="player-option w-full min-h-11 px-3 text-left flex items-center justify-between gap-2"
        >
          <span>{activeHlsHeight ? `Otomatis · ${activeHlsHeight}p` : 'Otomatis'}</span>
          {activeIndex === -1 && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
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
                className="player-option w-full min-h-11 px-3 text-left flex items-center justify-between gap-2"
              >
                <span>
                  {item}p {item >= 720 ? '(HD)' : ''}
                </span>
                {isSelected && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
              </button>
            );
          })
        ) : (
          <p className="text-zinc-400 text-xs py-2">Hanya kualitas otomatis tersedia.</p>
        )}
      </div>
    </div>
  );
}
