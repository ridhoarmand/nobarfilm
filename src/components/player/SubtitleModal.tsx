'use client';

import React, { useState } from 'react';
import { X, Search, Upload, Download, Check, MessageSquare, ExternalLink, FileText } from 'lucide-react';
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
  title,
  captions,
  selectedIndex,
  onSelectSubtitle,
  onCustomSubtitleUpload,
  customSubtitles,
}: SubtitleModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'search' | 'upload'>('list');
  const [isUploading, setIsUploading] = useState(false);

  const encodedTitle = encodeURIComponent(title);

  // Filter captions to English & Indonesian only
  const filteredCaptions = captions.filter((cap) => {
    const name = (cap.lanName || '').toLowerCase();
    const code = (cap.lan || '').toLowerCase();
    return name.includes('indonesia') || code.includes('id') || name.includes('english') || code.includes('en');
  });

  const externalSearchLinks = [
    {
      name: 'Subdl (Rekomendasi Indonesia)',
      url: `https://subdl.com/search/${encodedTitle}`,
      desc: 'Situs subtitle terlengkap dengan dukungan bahasa Indonesia',
    },
    {
      name: 'OpenSubtitles',
      url: `https://www.opensubtitles.org/id/search/sublanguageid-ind/moviename-${encodedTitle}`,
      desc: 'Database subtitle terbesar di dunia',
    },
    {
      name: 'YIFY Subtitles',
      url: `https://yifysubtitles.org/search?q=${encodedTitle}`,
      desc: 'Koleksi subtitle film HD/4K lengkap',
    },
    {
      name: 'Subscene',
      url: `https://subscene.com/subtitles/searchbytitle?query=${encodedTitle}`,
      desc: 'Komunitas penerjemah subtitle alternatif',
    },
  ];

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
      onClose();
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-red-500" />
            <h3 className="text-base font-bold text-white">Menu Subtitle</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/30">
          <button
            onClick={() => setActiveTab('list')}
            className={cn(
              'flex-1 py-3 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5',
              activeTab === 'list'
                ? 'border-red-600 text-red-500 bg-zinc-800/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200',
            )}
          >
            <FileText className="w-4 h-4" /> Bawaan ({filteredCaptions.length})
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={cn(
              'flex-1 py-3 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5',
              activeTab === 'search'
                ? 'border-red-600 text-red-500 bg-zinc-800/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200',
            )}
          >
            <Search className="w-4 h-4" /> Cari Subtitle
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
              'flex-1 py-3 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5',
              activeTab === 'upload'
                ? 'border-red-600 text-red-500 bg-zinc-800/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200',
            )}
          >
            <Upload className="w-4 h-4" /> Upload .SRT
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh]">
          
          {/* TAB 1: Bawaan Subtitle List */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              <button
                onClick={() => {
                  onSelectSubtitle(null);
                  onClose();
                }}
                className={cn(
                  'w-full p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all',
                  selectedIndex === null
                    ? 'bg-red-600/20 border-red-600 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white',
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
                    className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950"
                  >
                    <button
                      onClick={() => {
                        onSelectSubtitle(customIndex);
                        onClose();
                      }}
                      className="flex-1 text-left text-xs font-medium text-white flex items-center gap-2"
                    >
                      {active && <Check className="w-4 h-4 text-green-400" />}
                      <span className="truncate">{custom.label}</span>
                    </button>
                  </div>
                );
              })}

              {filteredCaptions.length > 0 ? (
                filteredCaptions.map((cap, idx) => {
                  const active = selectedIndex === idx;
                  const subtitleFilename = `${title}_${cap.lanName || cap.lan}.srt`;
                  return (
                    <div
                      key={cap.id || idx}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border transition-all',
                        active
                          ? 'bg-red-600/10 border-red-600/60 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-850',
                      )}
                    >
                      <button
                        onClick={() => {
                          onSelectSubtitle(idx);
                          onClose();
                        }}
                        className="flex-1 text-left text-xs font-medium flex items-center gap-2"
                      >
                        {active && <Check className="w-4 h-4 text-red-500" />}
                        <span>{cap.lanName || cap.lan}</span>
                      </button>
                      <a
                        href={`/api/subtitle?url=${encodeURIComponent(cap.url)}&download=true&format=srt&filename=${encodeURIComponent(subtitleFilename)}`}
                        download={subtitleFilename}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-red-600 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Download .SRT
                      </a>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-zinc-500 text-xs italic">
                  Tidak ada subtitle bawaan tersedia untuk judul ini. Silakan cari atau upload file .srt secara manual pada tab di atas.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Cari Subtitle Eksternal */}
          {activeTab === 'search' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Pilih provider subtitle di bawah ini untuk mencari subtitle film <strong className="text-white">&quot;{title}&quot;</strong>:
              </p>
              <div className="space-y-2">
                {externalSearchLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-800 hover:border-red-500/50 hover:bg-zinc-800/80 rounded-xl transition-all group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-red-400 transition-colors flex items-center gap-1.5">
                        {link.name}
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{link.desc}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-red-400 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Upload Subtitle .SRT */}
          {activeTab === 'upload' && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-zinc-400">
                Sudah mengunduh file subtitle dari internet? Pilih file <code className="bg-zinc-800 px-1 py-0.5 rounded text-white">.srt</code> atau <code className="bg-zinc-800 px-1 py-0.5 rounded text-white">.vtt</code> dari smartphone/komputer Anda untuk langsung ditempelkan pada video player:
              </p>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-700 hover:border-red-500 bg-zinc-950 hover:bg-zinc-900 rounded-2xl cursor-pointer transition-all">
                <Upload className="w-8 h-8 text-red-500 mb-2 animate-bounce" />
                <span className="text-xs font-bold text-white">Klik untuk memilih file .srt / .vtt</span>
                <span className="text-[11px] text-zinc-500 mt-1">Mendukung format SRT & WebVTT</span>
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

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
