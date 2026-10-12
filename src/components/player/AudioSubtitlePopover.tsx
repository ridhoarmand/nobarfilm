'use client';

import React, { useState, useRef } from 'react';
import { Upload, Sliders, Check, X } from 'lucide-react';

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
  onCustomSubtitleUpload?: (file: File) => Promise<void>;
  onSearchOtherSubtitles?: () => void;
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
  onSearchOtherSubtitles,
}: AudioSubtitlePopoverProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);


  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file || !onCustomSubtitleUpload) return;
    setIsUploading(true);
    setUploadError('');
    try {
      await onCustomSubtitleUpload(file);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'File subtitle tidak dapat dibaca.');
    } finally {
      input.value = '';
      setIsUploading(false);
    }
  };

  const hasAdjustments = Boolean(onFontSizeChange || onDelayChange || onPositionChange);

  return (
    <div
      data-interactive="true"
      data-popover="true"
      role="dialog"
      aria-label="Pengaturan audio dan subtitle"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="player-panel text-sm text-white"
    >
      <div className="player-panel-header">
        <h3 className="font-semibold">Audio & subtitle</h3>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white"
          aria-label="Tutup"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      {audioOptions.length > 0 && onSelectAudio && (
        <section className="player-section">
          <h4 className="mb-2 font-semibold">Bahasa audio</h4>
          <div className="space-y-1">
            {audioOptions.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => onSelectAudio(opt.code)}
                aria-pressed={opt.code === activeAudioCode}
                className="player-option"
              >
                <span className="min-w-0 break-words text-left">{opt.label}</span>
                {opt.code === activeAudioCode && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="player-section">
        <h4 className="mb-2 font-semibold">Subtitle</h4>
        {subtitles.length === 0 && (
          <p className="mb-2 text-sm text-zinc-300">
            {onSearchOtherSubtitles
              ? 'Subtitle bawaan tidak tersedia. Cari subtitle lain dalam bahasa Indonesia.'
              : onCustomSubtitleUpload
              ? 'Subtitle bawaan tidak tersedia. Anda dapat mengunggah file .srt atau .vtt.'
              : 'Subtitle bawaan tidak tersedia.'}
          </p>
        )}
        {onSelectSubtitle && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onSelectSubtitle(null)}
              aria-pressed={activeSubtitleIndex === null}
              className="player-option"
            >
              <span>Nonaktif</span>
              {activeSubtitleIndex === null && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
            </button>
            {subtitles.map((sub, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onSelectSubtitle(index)}
                aria-pressed={activeSubtitleIndex === index}
                className="player-option"
              >
                <span className="min-w-0 break-words text-left">{sub.label}</span>
                {activeSubtitleIndex === index && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
        )}
        {onSearchOtherSubtitles && (
          <button type="button" data-search-other-subtitles onClick={onSearchOtherSubtitles} className="player-option mt-2 border border-zinc-500">
            Cari subtitle lain
          </button>
        )}
      </section>

      {(hasAdjustments || onCustomSubtitleUpload) && (
        <section className="player-section">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-expanded={showAdvanced}
            className="player-option"
          >
            <span className="flex items-center gap-2">
              <Sliders aria-hidden="true" className="h-4 w-4 shrink-0" />
              {showAdvanced ? 'Sembunyikan pengaturan subtitle' : 'Pengaturan subtitle'}
            </span>
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-4">
              {onCustomSubtitleUpload && (
                <>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="player-option mt-2 disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2 text-left">
                      <Upload aria-hidden="true" className="h-4 w-4 shrink-0" />
                      {isUploading ? 'Membaca subtitle…' : 'Unggah subtitle (.srt / .vtt)'}
                    </span>
                  </button>
                  <input ref={fileInputRef} disabled={isUploading} type="file" accept=".srt,.vtt" onChange={handleFileUpload} className="hidden" aria-label="File subtitle" />
                </>
              )}
              {uploadError && <p role="alert" className="mt-2 text-sm text-zinc-200">{uploadError}</p>}
              {onFontSizeChange && (
                <div>
                  <p className="mb-2 text-zinc-300">Ukuran teks subtitle</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => onFontSizeChange(size)}
                        aria-pressed={subtitleFontSize === size}
                        className="player-option"
                      >
                        <span>{size === 'sm' ? 'Kecil' : size === 'md' ? 'Sedang' : size === 'lg' ? 'Besar' : 'Jumbo'}</span>
                        {subtitleFontSize === size && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {onDelayChange && (
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-zinc-300">
                    <span>Sinkronisasi waktu</span>
                    <span className="tabular-nums">{subtitleDelay > 0 ? '+' : ''}{subtitleDelay} detik</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDelayChange(Math.max(-5, Math.round((subtitleDelay - 0.5) * 10) / 10))}
                      aria-label="Kurangi delay subtitle 0,5 detik"
                      className="min-h-11 min-w-11 shrink-0 rounded-lg px-2 text-sm hover:bg-zinc-800"
                    >
                      −0.5s
                    </button>
                    <input
                      type="range"
                      aria-label="Penyesuaian waktu subtitle"
                      aria-valuetext={`${subtitleDelay} detik`}
                      min="-5"
                      max="5"
                      step="0.5"
                      value={subtitleDelay}
                      onChange={(e) => onDelayChange(parseFloat(e.target.value))}
                      className="h-11 min-w-0 flex-1 cursor-pointer accent-red-600"
                    />
                    <button
                      type="button"
                      onClick={() => onDelayChange(Math.min(5, Math.round((subtitleDelay + 0.5) * 10) / 10))}
                      aria-label="Tambah delay subtitle 0,5 detik"
                      className="min-h-11 min-w-11 shrink-0 rounded-lg px-2 text-sm hover:bg-zinc-800"
                    >
                      +0.5s
                    </button>
                  </div>
                </div>
              )}
              {onPositionChange && (
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-zinc-300">
                    <span>Posisi tinggi layar</span>
                    <span className="tabular-nums">{subtitlePosition}%</span>
                  </div>
                  <input
                    type="range"
                    aria-label="Posisi tinggi subtitle"
                    aria-valuetext={`${subtitlePosition} persen dari tinggi layar`}
                    min="20"
                    max="95"
                    step="5"
                    value={subtitlePosition}
                    onChange={(e) => onPositionChange(parseInt(e.target.value, 10))}
                    className="h-11 w-full cursor-pointer accent-red-600"
                  />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
