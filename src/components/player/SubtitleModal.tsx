'use client';

import React, { useState } from 'react';
import { X, Upload, Check, MessageSquare, FileText, Sparkles } from 'lucide-react';
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
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all animate-fade-in mt-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-900/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-red-500" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Kelola Subtitle (Memory Cache API)</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          title="Tutup Panel Subtitle"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-800 bg-zinc-950/30">
        <button
          onClick={() => setActiveTab('list')}
          className={cn(
            'flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5',
            activeTab === 'list'
              ? 'border-red-600 text-red-500 bg-zinc-900/40'
              : 'border-transparent text-zinc-400 hover:text-zinc-200',
          )}
        >
          <FileText className="w-3.5 h-3.5" /> Subtitle API ({filteredCaptions.length})
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={cn(
            'flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5',
            activeTab === 'upload'
              ? 'border-red-600 text-red-500 bg-zinc-900/40'
              : 'border-transparent text-zinc-400 hover:text-zinc-200',
          )}
        >
          <Upload className="w-3.5 h-3.5" /> Upload File .SRT
        </button>
      </div>

      {/* Content Body */}
      <div className="p-4 overflow-y-auto space-y-3 max-h-72">
        {/* TAB 1: Subtitle API List (Auto Download & Cache in Browser Memory) */}
        {activeTab === 'list' && (
          <div className="space-y-2">
            <button
              onClick={() => {
                onSelectSubtitle(null);
              }}
              className={cn(
                'w-full p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all',
                selectedIndex === null
                  ? 'bg-red-600/20 border-red-600 text-white'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white',
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
                  className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/80"
                >
                  <button
                    onClick={() => {
                      onSelectSubtitle(customIndex);
                    }}
                    className="flex-1 text-left text-xs font-medium text-white flex items-center gap-2"
                  >
                    {active && <Check className="w-4 h-4 text-green-400" />}
                    <span className="truncate">{custom.label}</span>
                  </button>
                  <span className="text-[10px] bg-green-950 text-green-400 border border-green-800/60 px-2 py-0.5 rounded font-mono">
                    Blob Cache Active
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
                        ? 'bg-red-600/10 border-red-600/60 text-white'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-850',
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

                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                      <Sparkles className="w-3 h-3 text-yellow-400" />
                      <span>Auto API Blob Cache</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-zinc-500 text-xs italic">
                Tidak ada subtitle API tersedia untuk judul ini. Silakan upload file .srt secara manual pada tab di atas.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Upload Subtitle .SRT */}
        {activeTab === 'upload' && (
          <div className="space-y-3 py-1">
            <p className="text-xs text-zinc-400">
              Pilih file <code className="bg-zinc-800 px-1 py-0.5 rounded text-white">.srt</code> atau <code className="bg-zinc-800 px-1 py-0.5 rounded text-white">.vtt</code>. File akan di-cache secara otomatis di memori sementara browser:
            </p>
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-700 hover:border-red-500 bg-zinc-900/80 hover:bg-zinc-850 rounded-2xl cursor-pointer transition-all">
              <Upload className="w-6 h-6 text-red-500 mb-1 animate-bounce" />
              <span className="text-xs font-bold text-white">Klik untuk memilih file .srt / .vtt</span>
              <span className="text-[11px] text-zinc-500 mt-0.5">Disimpan di Browser Temp Memory (Blob URL)</span>
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
