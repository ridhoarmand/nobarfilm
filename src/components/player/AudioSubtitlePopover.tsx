'use client';

import React, { useState } from 'react';
import { Volume2, MessageSquare, Upload, Sliders, Check, Clock, ChevronUp, ChevronDown, Type } from 'lucide-react';

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
  const [subView, setSubView] = useState<'main' | 'other'>('main');

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

  // Separate Indonesian subtitles from other languages
  const isIndo = (s: { srcLang: string; label: string; kind?: string }) =>
    s.kind === 'custom' ||
    (s.srcLang || '').toLowerCase().includes('id') ||
    (s.label || '').toLowerCase().includes('indonesia') ||
    (s.label || '').toLowerCase().includes('indo');

  const indoSubtitles = subtitles
    .map((sub, originalIdx) => ({ sub, originalIdx }))
    .filter(({ sub }) => isIndo(sub));

  const otherSubtitles = subtitles
    .map((sub, originalIdx) => ({ sub, originalIdx }))
    .filter(({ sub }) => !isIndo(sub));

  return (
    <div className="absolute bottom-16 right-4 sm:right-16 z-50 w-[calc(100vw-2rem)] sm:w-[580px] max-h-[80vh] overflow-y-auto bg-zinc-950/95 border border-zinc-800/90 text-white rounded-2xl shadow-2xl backdrop-blur-xl p-4 sm:p-5 animate-fade-in scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
        <div className="flex items-center gap-2">
          {subView === 'other' ? (
            <button
              type="button"
              onClick={() => setSubView('main')}
              className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg transition"
            >
              ← Kembali
            </button>
          ) : (
            <MessageSquare className="w-5 h-5 text-red-500" />
          )}
          <h3 className="font-bold text-sm sm:text-base text-zinc-100">
            {subView === 'other' ? 'Subtitle Bahasa Lainnya' : 'Audio & Subtitle'}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
        >
          Tutup
        </button>
      </div>

      {subView === 'other' ? (
        /* ==================================== */
        /* SECONDARY VIEW: SUBTITLE LAINNYA */
        /* ==================================== */
        <div className="space-y-4 animate-fade-in">
          <div className="bg-zinc-900/60 rounded-xl p-3.5 border border-zinc-850">
            <div className="flex items-center justify-between mb-3 text-red-400 font-bold text-xs uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>Bahasa Lain (English, JP, KR, dll.)</span>
              </div>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {otherSubtitles.length > 0 ? (
                otherSubtitles.map(({ sub, originalIdx }) => {
                  const isActive = activeSubtitleIndex === originalIdx;
                  return (
                    <button
                      key={originalIdx}
                      type="button"
                      onClick={() => {
                        onSelectSubtitle?.(originalIdx);
                        try {
                          localStorage.setItem('nobarfilm_pref_sub_lang', sub.srcLang || sub.label);
                        } catch (e) {}
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-red-600/90 text-white shadow-md'
                          : 'bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                      {isActive && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                    </button>
                  );
                })
              ) : (
                <div className="text-xs text-zinc-500 p-4 text-center italic">
                  Tidak ada subtitle bahasa lain yang tersedia untuk judul ini
                </div>
              )}
            </div>

            {/* Custom File Upload Button */}
            <label className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 rounded-lg text-xs font-semibold text-zinc-200 hover:text-white cursor-pointer transition shadow-sm">
              <Upload className="w-4 h-4 text-red-500" />
              <span>Unggah Subtitle Manual (.srt / .vtt)</span>
              <input type="file" accept=".srt,.vtt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      ) : (
        /* ==================================== */
        /* MAIN VIEW: AUDIO & SUBTITLE INDONESIA */
        /* ==================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* BOX 1: AUDIO TRACKS */}
          <div className="bg-zinc-900/60 rounded-xl p-3.5 border border-zinc-850 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 text-red-400 font-bold text-xs uppercase tracking-wider">
                <Volume2 className="w-4 h-4" />
                <span>Trek Suara (Audio)</span>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {audioOptions.length > 0 ? (
                  audioOptions.map((opt) => {
                    const isActive = opt.code === activeAudioCode;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => onSelectAudio?.(opt.code)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-red-600/90 text-white shadow-md'
                            : 'bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isActive && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-zinc-500 p-2 text-center italic">Audio standar aktif</div>
                )}
              </div>
            </div>
          </div>

          {/* BOX 2: SUBTITLE TRACKS (INDONESIA ONLY) */}
          <div className="bg-zinc-900/60 rounded-xl p-3.5 border border-zinc-850 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 text-red-400 font-bold text-xs uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Subtitle Bahasa Indonesia</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 font-normal lowercase tracking-normal"
                >
                  <Sliders className="w-3 h-3 text-red-500" />
                  {showAdvanced ? 'Tutup Atur' : 'Atur Teks'}
                </button>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {/* Option Off / Mati */}
                <button
                  type="button"
                  onClick={() => onSelectSubtitle?.(null)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeSubtitleIndex === null
                      ? 'bg-red-600/90 text-white shadow-md'
                      : 'bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  <span>Nonaktifkan (Mati)</span>
                  {activeSubtitleIndex === null && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                </button>

                {/* Indonesian Subtitle List */}
                {indoSubtitles.map(({ sub, originalIdx }) => {
                  const isActive = activeSubtitleIndex === originalIdx;
                  return (
                    <button
                      key={originalIdx}
                      type="button"
                      onClick={() => onSelectSubtitle?.(originalIdx)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-red-600/90 text-white shadow-md'
                          : 'bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                      {isActive && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Subtitle Lainnya Navigation Button */}
              <button
                type="button"
                onClick={() => setSubView('other')}
                className="mt-3 flex items-center justify-between w-full py-2.5 px-3 bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 rounded-lg text-xs text-red-200 hover:text-white font-semibold transition shadow-sm group"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-red-400" />
                  <span>Subtitle Lainnya (English, JP, dll.)</span>
                </div>
                <span className="text-red-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED SUBTITLE CONTROLS (Font Size, Delay, Position) */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-zinc-800/80 bg-zinc-900/40 rounded-xl p-3.5 space-y-3.5 animate-fade-in">
          {/* Font Size Selector */}
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-300 mb-1.5 font-semibold">
              <span className="flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-red-400" /> Ukuran Teks Desktop
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
                  {size.toUpperCase()}
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
              <span>Posisi Vertikal Layar</span>
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
  );
}
