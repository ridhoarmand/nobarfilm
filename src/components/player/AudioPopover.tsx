'use client';

import React from 'react';
import { Volume2, Check } from 'lucide-react';

interface AudioOption {
  code: string;
  label: string;
}

interface AudioPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  audioOptions: AudioOption[];
  activeCode?: string;
  onSelectAudio: (code: string) => void;
}

export function AudioPopover({
  isOpen,
  onClose,
  audioOptions = [],
  activeCode,
  onSelectAudio,
}: AudioPopoverProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-16 right-4 z-40 w-64 max-w-[calc(100vw-2rem)] bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl p-4 animate-fade-in text-white text-xs">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/80 mb-3">
        <Volume2 className="w-4 h-4 text-red-500" />
        <span className="font-bold uppercase tracking-wider text-zinc-200">Suara Audio</span>
      </div>

      {/* Audio Options List */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {audioOptions.length > 0 ? (
          audioOptions.map((opt, idx) => {
            const isSelected = activeCode ? opt.code === activeCode : idx === 0;
            return (
              <button
                key={opt.code || idx}
                type="button"
                onClick={() => {
                  onSelectAudio(opt.code);
                  onClose();
                }}
                className={`w-full px-3 py-2 rounded-xl text-left font-medium flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-red-600/20 border border-red-600/60 text-white'
                    : 'bg-zinc-900/60 border border-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 text-red-500" />}
              </button>
            );
          })
        ) : (
          <p className="text-zinc-500 italic py-1">Original Audio</p>
        )}
      </div>
    </div>
  );
}
