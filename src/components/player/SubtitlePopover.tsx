'use client';

import React, { useState } from 'react';
import { MessageSquare, Upload, Check, Sliders, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Caption } from '@/types/api';

interface CustomSubtitle {
  label: string;
  src: string;
}

interface SubtitlePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: Array<{
    kind: string;
    label: string;
    srcLang: string;
    src: string;
    default?: boolean;
  }>;
  activeIndex: number | null;
  onSelectSubtitle: (index: number | null) => void;
  subtitleDelay: number;
  onDelayChange: (delay: number) => void;
  subtitlePosition: number;
  onPositionChange: (position: number) => void;
  onCustomSubtitleUpload?: (customSub: CustomSubtitle) => void;
}

export function SubtitlePopover({
  isOpen,
  onClose,
  subtitles = [],
  activeIndex,
  onSelectSubtitle,
  subtitleDelay,
  onDelayChange,
  subtitlePosition,
  onPositionChange,
  onCustomSubtitleUpload,
}: SubtitlePopoverProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const isEnabled = activeIndex !== null;

  const handleToggle = () => {
    if (isEnabled) {
      onSelectSubtitle(null);
    } else {
      onSelectSubtitle(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      let content = event.target?.result as string;
      if (!content) {
        setIsUploading(false);
        return;
      }

      content = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
      if (!content.startsWith('WEBVTT')) {
        const vttContent = content
          .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
          .replace(/(\d{2}:\d{2}),(\d{3})/g, '00:$1.$2');
        content = `WEBVTT\n\n${vttContent}`;
      }

      const blob = new Blob([content], { type: 'text/vtt;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);

      const newSub: CustomSubtitle = {
        label: `Lokal (${file.name})`,
        src: blobUrl,
      };

      onCustomSubtitleUpload?.(newSub);
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="absolute bottom-16 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl p-4 animate-fade-in text-white text-xs">
      {/* Header with Toggle Switch */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-red-500" />
          <span className="font-bold uppercase tracking-wider text-zinc-200">Subtitle</span>
        </div>

        {/* Netflix Style Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={handleToggle}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
        </label>
      </div>

      {/* Conditional Subtitle Options (Hidden when OFF for clean hardsub experience) */}
      {isEnabled && (
        <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
          {/* Subtitle Languages */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-400">Pilih Bahasa</span>
            {subtitles.length > 0 ? (
              subtitles.map((sub, idx) => {
                const isSelected = activeIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectSubtitle(idx)}
                    className={`w-full px-3 py-2 rounded-xl text-left font-medium flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-red-600/20 border border-red-600/60 text-white'
                        : 'bg-zinc-900/60 border border-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{sub.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-red-500" />}
                  </button>
                );
              })
            ) : (
              <p className="text-zinc-500 italic py-1">Tidak ada subtitle bawaan</p>
            )}
          </div>

          {/* Upload Custom SRT */}
          <div className="pt-2 border-t border-zinc-800/60">
            <label className="flex items-center justify-center gap-2 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-300 font-medium">{isUploading ? 'Memuat...' : 'Unggah File .SRT'}</span>
              <input type="file" accept=".srt,.vtt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Advanced Sync & Position Accordion */}
          <div className="pt-2 border-t border-zinc-800/60">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full flex items-center justify-between text-zinc-400 hover:text-zinc-200 py-1"
            >
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">Pengaturan Delay & Posisi</span>
              </div>
              {isAdvancedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isAdvancedOpen && (
              <div className="mt-2 space-y-3 pt-2 border-t border-zinc-800/40">
                {/* Delay Sync */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Delay Sync Subtitle
                  </label>
                  <select
                    value={subtitleDelay}
                    onChange={(e) => onDelayChange(parseFloat(e.target.value))}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-600"
                  >
                    <option value={-5}>-5.0s (Cepat 5s)</option>
                    <option value={-2}>-2.0s (Cepat 2s)</option>
                    <option value={-1}>-1.0s (Cepat 1s)</option>
                    <option value={0}>0.0s (Presisi)</option>
                    <option value={1}>+1.0s (Lambat 1s)</option>
                    <option value={2}>+2.0s (Lambat 2s)</option>
                    <option value={5}>+5.0s (Lambat 5s)</option>
                  </select>
                </div>

                {/* Vertical Position */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <Sliders className="w-3 h-3" /> Posisi Vertikal Subtitle
                  </label>
                  <select
                    value={subtitlePosition}
                    onChange={(e) => onPositionChange(parseInt(e.target.value, 10))}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-600"
                  >
                    <option value={90}>Bawah Layar (90%)</option>
                    <option value={85}>Bawah Standar (85%)</option>
                    <option value={75}>Sedikit Ke Atas (75%)</option>
                    <option value={20}>Atas Layar (20%)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
