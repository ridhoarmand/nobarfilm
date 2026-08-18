'use client';

import React, { useState } from 'react';
import { Volume2, MessageSquare, Upload, Sliders, Check, Clock, Type, X } from 'lucide-react';

interface AudioSubtitlePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  // Audio Options
  audioOptions?: Array<{ code: string; label: string }>;
  activeAudioCode?: string;
  onSelectAudio?: (code: string) => void;
  // Subtitle Options
  subtitles?: Array<{
    kind: string;
    label: string;
    srcLang: string;
    src: string;
  }>;
  activeSubtitleIndex?: number | null;
  onSelectSubtitle?: (index: number | null) => void;
  subtitleDelay?: number;
  onDelayChange?: (delay: number) => void;
  subtitlePosition?: number;
  onPositionChange?: (pos: number) => void;
  subtitleFontSize?: 'sm' | 'md' | 'lg' | 'xl';
  onFontSizeChange?: (size: 'sm' | 'md' | 'lg' | 'xl') => void;
  onCustomSubtitleUpload?: (customSub: { label: string; src: string }) => void;
}

export function AudioSubtitlePopover({
  isOpen,
  onClose,
  audioOptions = [],
  activeAudioCode,
  onSelectAudio,
  subtitles = [],
  activeSubtitleIndex = 0,
  onSelectSubtitle,
  subtitleDelay = 0,
  onDelayChange,
  subtitlePosition = 85,
  onPositionChange,
  subtitleFontSize = 'md',
  onFontSizeChange,
  onCustomSubtitleUpload,
}: AudioSubtitlePopoverProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    onCustomSubtitleUpload?.({
      label: file.name.replace(/\.[^/.]+$/, ''),
      src: url,
    });
  };

  return (
    <div
      data-interactive="true"
      data-popover="true"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="absolute bottom-14 sm:bottom-16 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 w-[calc(100vw-1rem)] sm:w-[460px] max-h-[82vh] overflow-y-auto bg-zinc-950/95 border border-zinc-800/90 text-white rounded-2xl shadow-2xl backdrop-blur-2xl p-3.5 sm:p-5 animate-fade-in scrollbar-thin"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-sm sm:text-base text-zinc-100">
            Audio & Subtitle
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* AUDIO TRACKS SECTION */}
        {audioOptions.length > 0 && (
          <div className="bg-zinc-900/60 rounded-xl p-3.5 border border-zinc-850">
            <div className="flex items-center gap-2 mb-2.5 text-red-400 font-bold text-xs uppercase tracking-wider">
              <Volume2 className="w-4 h-4" />
              <span>Bahasa Audio (Suara)</span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {audioOptions.map((opt) => {
                const isActive = opt.code === activeAudioCode;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => onSelectAudio?.(opt.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isActive && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBTITLE SELECTION SECTION */}
        <div className="bg-zinc-900/60 rounded-xl p-3.5 border border-zinc-850">
          <div className="flex items-center justify-between mb-2.5 text-red-400 font-bold text-xs uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>Teks Terjemahan (Subtitle)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 font-semibold normal-case"
            >
              <Sliders className="w-3.5 h-3.5 text-red-500" />
              {showAdvanced ? 'Sembunyikan Pengaturan' : 'Atur Ukuran & Delay'}
            </button>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {/* Option Off / Nonaktif */}
            <button
              type="button"
              onClick={() => onSelectSubtitle?.(null)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubtitleIndex === null
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              <span>Nonaktifkan (Mati)</span>
              {activeSubtitleIndex === null && <Check className="w-4 h-4 text-white flex-shrink-0" />}
            </button>

            {/* Subtitles List (Indonesian & English Filtered) */}
            {subtitles.map((sub, originalIdx) => {
              const isActive = activeSubtitleIndex === originalIdx;
              return (
                <button
                  key={originalIdx}
                  type="button"
                  onClick={() => onSelectSubtitle?.(originalIdx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  <span className="truncate">{sub.label}</span>
                  {isActive && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Manual File Upload (.srt / .vtt) */}
          <label className="mt-3 flex items-center justify-center gap-2 w-full py-2 px-3 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-red-500" />
            <span>Unggah File Subtitle (.srt / .vtt)</span>
            <input type="file" accept=".srt,.vtt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* ADVANCED SUBTITLE CONTROLS (Font Size, Delay, Position) */}
        {showAdvanced && (
          <div className="bg-zinc-900/60 rounded-xl p-3.5 border border-zinc-850 space-y-3.5 animate-fade-in">
            {/* Font Size Selector */}
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-300 mb-1.5 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-red-400" /> Ukuran Teks Subtitle
                </span>
                <span className="text-red-400 font-bold uppercase text-[11px]">{subtitleFontSize}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onFontSizeChange?.(size)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      subtitleFontSize === size
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {size === 'sm' ? 'Kecil' : size === 'md' ? 'Sedang' : size === 'lg' ? 'Besar' : 'Jumbo'}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitle Delay Sync */}
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-300 mb-1.5 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-red-400" /> Sinkronisasi Waktu (Delay)
                </span>
                <span className="text-red-400 font-bold text-[11px]">{subtitleDelay > 0 ? `+${subtitleDelay}s` : `${subtitleDelay}s`}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onDelayChange?.(Math.max(-5, Math.round((subtitleDelay - 0.5) * 10) / 10))}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold text-zinc-200 transition"
                >
                  -0.5s
                </button>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.5"
                  value={subtitleDelay}
                  onChange={(e) => onDelayChange?.(parseFloat(e.target.value))}
                  className="flex-1 accent-red-600 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => onDelayChange?.(Math.min(5, Math.round((subtitleDelay + 0.5) * 10) / 10))}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold text-zinc-200 transition"
                >
                  +0.5s
                </button>
              </div>
            </div>

            {/* Subtitle Vertical Position */}
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-300 mb-1.5 font-semibold">
                <span>Posisi Tinggi Layar</span>
                <span className="text-red-400 font-bold text-[11px]">{subtitlePosition}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="95"
                step="5"
                value={subtitlePosition}
                onChange={(e) => onPositionChange?.(parseInt(e.target.value, 10))}
                className="w-full accent-red-600 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
