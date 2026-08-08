'use client';

import React, { useState } from 'react';
import { X, Upload, Check, MessageSquare, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaptionItem {
  id?: string;
  lan: string;
  lanName: string;
  url: string;
  size?: string;
}

interface CustomSubtitle {
  label: string;
  src: string;
}

interface SubtitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  captions: CaptionItem[];
  selectedIndex: number | null;
  onSelectSubtitle: (index: number | null) => void;
  onCustomSubtitleUpload: (customSub: CustomSubtitle) => void;
  customSubtitles: CustomSubtitle[];
}

export function SubtitleModal({
  isOpen,
  onClose,
  captions,
  selectedIndex,
  onSelectSubtitle,
  onCustomSubtitleUpload,
  customSubtitles,
}: SubtitleModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'upload'>('list');
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  // Filter captions to English & Indonesian only
  const filteredCaptions = captions.filter((cap) => {
    const name = (cap.lanName || '').toLowerCase();
    const code = (cap.lan || '').toLowerCase();
    return name.includes('indonesia') || code.includes('id') || name.includes('english') || code.includes('en');
  });

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

      // Convert SRT to WebVTT format if needed
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

      onCustomSubtitleUpload(newSub);
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden flex flex-col transition-all animate-fade-in mt-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60 bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-red-500" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Pengaturan Subtitle</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          title="Tutup Panel Subtitle"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Segmented Control Pill Bar - Human Centric */}
      <div className="flex px-4 pt-3 pb-1 border-b border-zinc-800/40 bg-zinc-950">
        <div className="inline-flex p-1 bg-zinc-900/90 rounded-xl border border-zinc-800/80 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('list')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5',
              activeTab === 'list'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <FileText className="w-3.5 h-3.5 text-red-500" /> Subtitle Resmi ({filteredCaptions.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5',
              activeTab === 'upload'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" /> Unggah File .SRT
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 overflow-y-auto space-y-2 max-h-72">
        {/* TAB 1: Subtitle API List */}
        {activeTab === 'list' && (
          <div className="space-y-2">
            <button
              onClick={() => {
                onSelectSubtitle(null);
              }}
              className={cn(
                'w-full p-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all',
                selectedIndex === null
                  ? 'bg-red-600/10 border-red-600/60 text-white font-semibold'
                  : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:bg-zinc-850 hover:text-white',
              )}
            >
              <span>Matikan Subtitle</span>
              {selectedIndex === null && <Check className="w-4 h-4 text-red-500" />}
            </button>

            {customSubtitles.map((custom, idx) => {
              const customIndex = filteredCaptions.length + idx;
              const active = selectedIndex === customIndex;
              return (
                <div
                  key={`custom-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60"
                >
                  <button
                    onClick={() => {
                      onSelectSubtitle(customIndex);
                    }}
                    className="flex-1 text-left text-xs font-medium text-white flex items-center gap-2"
                  >
                    {active && <Check className="w-4 h-4 text-red-500" />}
                    <span className="truncate">{custom.label}</span>
                  </button>
                  <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded font-medium">
                    File Lokal
                  </span>
                </div>
              );
            })}

            {filteredCaptions.length > 0 ? (
              filteredCaptions.map((cap, idx) => {
                const active = selectedIndex === idx;
                return (
                  <div
                    key={cap.id || idx}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-xl border transition-all',
                      active
                        ? 'bg-red-600/10 border-red-600/60 text-white font-semibold'
                        : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-850 hover:text-white',
                    )}
                  >
                    <button
                      onClick={() => {
                        onSelectSubtitle(idx);
                      }}
                      className="flex-1 text-left text-xs font-medium flex items-center gap-2"
                    >
                      {active && <Check className="w-4 h-4 text-red-500" />}
                      <span>{cap.lanName || cap.lan}</span>
                    </button>

                    <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      Tersedia
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-zinc-500 text-xs italic">
                Tidak ada subtitle otomatis untuk judul ini. Silakan unggah file .srt secara manual pada tab di atas.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Upload Subtitle .SRT */}
        {activeTab === 'upload' && (
          <div className="space-y-3 py-1">
            <p className="text-xs text-zinc-400">
              Pilih file <code className="bg-zinc-800 px-1 py-0.5 rounded text-white">.srt</code> atau <code className="bg-zinc-800 px-1 py-0.5 rounded text-white">.vtt</code> dari perangkat Anda:
            </p>
            <label className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/60 hover:bg-zinc-850 rounded-xl cursor-pointer transition-all">
              <Upload className="w-5 h-5 text-zinc-400 mb-1" />
              <span className="text-xs font-medium text-white">Klik untuk memilih file .srt / .vtt</span>
              <span className="text-[11px] text-zinc-500 mt-0.5">Disimpan sementara di browser</span>
              <input
                type="file"
                accept=".srt,.vtt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
