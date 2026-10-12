'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { ApiError, fetchJson } from '@/lib/fetcher';
import type { OtherSubtitleContext, OtherSubtitleResult, OtherSubtitleTitle } from '@/types/other-subtitles';

type Props = {
  context: OtherSubtitleContext;
  onSelect: (result: OtherSubtitleResult, signal: AbortSignal) => Promise<void>;
  onBack: () => void;
  onClose: () => void;
};

export function OtherSubtitlesPopover({ context, onSelect, onBack, onClose }: Props) {
  const [query, setQuery] = useState(context.title);
  const [titles, setTitles] = useState<OtherSubtitleTitle[] | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<OtherSubtitleTitle | null>(null);
  const [subtitles, setSubtitles] = useState<OtherSubtitleResult[] | null>(null);
  const [busy, setBusy] = useState<'search' | 'download' | null>(null);
  const [error, setError] = useState('');
  const [retryResult, setRetryResult] = useState<OtherSubtitleResult | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);

  useEffect(() => () => {
    sequenceRef.current++;
    controllerRef.current?.abort();
  }, []);

  const cancelRequest = () => {
    sequenceRef.current++;
    controllerRef.current?.abort();
    controllerRef.current = null;
  };

  const showError = (cause: unknown, fallback: string) => {
    setError(cause instanceof Error ? cause.message : fallback);
    if (cause instanceof ApiError && cause.status === 410) {
      setSelectedTitle(null);
      setTitles(null);
      setSubtitles(null);
      setRetryResult(null);
    }
  };

  const search = async (title?: OtherSubtitleTitle) => {
    cancelRequest();
    const sequence = sequenceRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy('search');
    setError('');
    setRetryResult(null);
    setSelectedTitle(title || null);
    setSubtitles(null);
    if (!title) setTitles(null);
    const params = new URLSearchParams({ type: context.type });
    if (title) {
      params.set('titleId', title.id);
      if (context.type === 'tv') {
        params.set('season', String(context.season));
        params.set('episode', String(context.episode));
      }
    } else {
      params.set('query', query.trim());
    }
    try {
      if (title) {
        const data = await fetchJson<{ subtitles: OtherSubtitleResult[] }>(`/api/subtitles/search?${params}`, { signal: controller.signal });
        if (sequence === sequenceRef.current && !controller.signal.aborted) setSubtitles(data.subtitles);
      } else {
        const data = await fetchJson<{ titles: OtherSubtitleTitle[] }>(`/api/subtitles/search?${params}`, { signal: controller.signal });
        if (sequence === sequenceRef.current && !controller.signal.aborted) setTitles(data.titles);
      }
    } catch (cause) {
      if (sequence === sequenceRef.current && !controller.signal.aborted) showError(cause, 'Pencarian subtitle gagal. Coba lagi.');
    } finally {
      if (sequence === sequenceRef.current) setBusy(null);
    }
  };

  const useSubtitle = async (result: OtherSubtitleResult) => {
    cancelRequest();
    const sequence = sequenceRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy('download');
    setError('');
    setRetryResult(result);
    try {
      await onSelect(result, controller.signal);
      if (sequence === sequenceRef.current && !controller.signal.aborted) onBack();
    } catch (cause) {
      if (sequence === sequenceRef.current && !controller.signal.aborted) showError(cause, 'Subtitle tidak dapat diambil. Coba lagi.');
    } finally {
      if (sequence === sequenceRef.current) setBusy(null);
    }
  };

  return (
    <div data-popover data-interactive role="dialog" aria-label="Cari subtitle lain"
      onClick={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()}
      className="player-panel text-sm text-white">
      <div className="player-panel-header">
        <button type="button" onClick={onBack} aria-label="Kembali ke audio dan subtitle" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800">
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </button>
        <h3 className="min-w-0 flex-1 break-words font-semibold">Subtitle lain</h3>
        <button type="button" onClick={onClose} aria-label="Tutup pencarian subtitle" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <p className="mb-3 break-words text-xs text-zinc-300">
        Bahasa Indonesia{context.year ? ` · ${context.year}` : ''}{context.type === 'tv' ? ` · S${context.season} E${context.episode}` : ''}
      </p>
      <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); if (busy !== 'download') void search(); }}>
        <label htmlFor="other-subtitle-query" className="block text-zinc-200">Judul film atau serial</label>
        <input id="other-subtitle-query" data-initial-focus type="text" value={query} minLength={2} maxLength={150} required disabled={busy === 'download'}
          onChange={(event) => {
            cancelRequest();
            setQuery(event.target.value);
            setBusy(null);
            setError('');
            setTitles(null);
            setSelectedTitle(null);
            setSubtitles(null);
            setRetryResult(null);
          }}
          className="min-h-11 w-full min-w-0 rounded-lg border border-zinc-500 bg-zinc-950 px-3 text-sm text-white" />
        <button type="submit" disabled={busy === 'download' || query.trim().length < 2} className="player-option border border-zinc-500">
          Cari
        </button>
      </form>
      {busy && <p role="status" aria-live="polite" className="mt-3 text-zinc-200">{busy === 'download' ? 'Mengambil subtitle…' : 'Mencari subtitle Indonesia…'}</p>}
      {error && (
        <div className="mt-3 space-y-2">
          <p role="alert" className="break-words text-zinc-200">{error}</p>
          <button type="button" disabled={busy !== null} className="player-option border border-zinc-500"
            onClick={() => { if (retryResult) void useSubtitle(retryResult); else void search(selectedTitle || undefined); }}>Coba lagi</button>
        </div>
      )}
      {selectedTitle ? (
        <section className="player-section">
          <h4 className="break-words font-semibold">{selectedTitle.title}{selectedTitle.year ? ` (${selectedTitle.year})` : ''}</h4>
          <button type="button" disabled={busy === 'download'} className="player-option mt-2" onClick={() => {
            cancelRequest();
            setBusy(null);
            setError('');
            setSelectedTitle(null);
            setSubtitles(null);
            setRetryResult(null);
          }}>Ganti judul</button>
          {subtitles?.length === 0 && <p className="mt-2 text-zinc-300">Subtitle Indonesia untuk judul dan episode ini belum tersedia.</p>}
          <div className="mt-2 space-y-2">
            {subtitles?.map((result) => (
              <div key={result.id} className="min-w-0 rounded-lg border border-zinc-700 p-3">
                <p className="break-words text-zinc-200 [overflow-wrap:anywhere]">{result.release}</p>
                <button type="button" disabled={busy === 'download'} className="player-option mt-2 border border-zinc-500" onClick={() => void useSubtitle(result)}>Gunakan</button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="player-section">
          {titles === null && !busy && !error && <p className="text-zinc-300">Cari judul, lalu pilih film atau serial yang sesuai.</p>}
          {titles?.length === 0 && <p className="text-zinc-300">Judul tidak ditemukan. Coba judul asli atau nama lain.</p>}
          <div className="space-y-1">
            {titles?.map((title) => (
              <button key={`${title.type}:${title.id}`} type="button" className="player-option" onClick={() => void search(title)}>
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="block text-zinc-100">{title.title}</span>
                  <span className="block text-xs text-zinc-300">{title.type === 'movie' ? 'Film' : 'Serial'}{title.year ? ` · ${title.year}` : ''}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
