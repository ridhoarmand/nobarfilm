'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { ApiError, fetchJson } from '@/lib/fetcher';
import type { OtherSubtitleContext, OtherSubtitleResult, OtherSubtitleTitle } from '@/types/other-subtitles';

type Props = {
  context: OtherSubtitleContext;
  onSelect: (result: OtherSubtitleResult, signal: AbortSignal) => Promise<void>;
  onBack: () => void;
  onClose: () => void;
};

type ErrorState = { message: string; status?: number } | null;

export function OtherSubtitlesPopover({ context, onSelect, onBack, onClose }: Props) {
  const [query, setQuery] = useState(context.title);
  const [editingQuery, setEditingQuery] = useState(false);
  const [titles, setTitles] = useState<OtherSubtitleTitle[] | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<OtherSubtitleTitle | null>(null);
  const [subtitles, setSubtitles] = useState<OtherSubtitleResult[] | null>(null);
  const [busy, setBusy] = useState<'search' | 'download' | null>(null);
  const [error, setError] = useState<ErrorState>(null);
  const [retryResult, setRetryResult] = useState<OtherSubtitleResult | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);
  const lastQueryRef = useRef(context.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const cancelRequest = useCallback(() => {
    sequenceRef.current++;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const showError = useCallback((cause: unknown, fallback: string) => {
    const status = cause instanceof ApiError ? cause.status : undefined;
    const message = cause instanceof Error ? cause.message : fallback;
    setError({ message, status });
    if (cause instanceof ApiError && cause.status === 410) {
      setSelectedTitle(null);
      setTitles(null);
      setSubtitles(null);
      setRetryResult(null);
    }
  }, []);

  const search = useCallback(
    async (title?: OtherSubtitleTitle, searchQuery: string = context.title) => {
      if (!title) {
        const trimmed = searchQuery.trim();
        if (trimmed.length < 2 || trimmed.length > 150) {
          cancelRequest();
          setEditingQuery(true);
          setError({ message: 'Masukkan judul sepanjang 2–150 karakter.' });
          setBusy(null);
          return;
        }
      }

      cancelRequest();
      const sequence = sequenceRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      setBusy('search');
      setError(null);
      setRetryResult(null);
      setSelectedTitle(title || null);
      setSubtitles(null);
      if (!title) setTitles(null);

      const trimmedQuery = searchQuery.trim();
      if (!title) {
        lastQueryRef.current = trimmedQuery;
      }

      try {
        if (title) {
          const params = new URLSearchParams({ type: context.type, titleId: title.id });
          if (context.type === 'tv') {
            params.set('season', String(context.season));
            params.set('episode', String(context.episode));
          }
          const data = await fetchJson<{ subtitles: OtherSubtitleResult[] }>(
            `/api/subtitles/search?${params}`,
            { signal: controller.signal }
          );
          if (sequence === sequenceRef.current && !controller.signal.aborted) {
            setSubtitles(data.subtitles);
          }
        } else {
          const params = new URLSearchParams({ type: context.type, query: trimmedQuery });
          const data = await fetchJson<{ titles: OtherSubtitleTitle[] }>(
            `/api/subtitles/search?${params}`,
            { signal: controller.signal }
          );
          if (sequence !== sequenceRef.current || controller.signal.aborted) {
            return;
          }
          const candidates = data.titles;
          setTitles(candidates);

          if (candidates.length === 1) {
            const singleTitle = candidates[0];
            setSelectedTitle(singleTitle);
            const subParams = new URLSearchParams({ type: context.type, titleId: singleTitle.id });
            if (context.type === 'tv') {
              subParams.set('season', String(context.season));
              subParams.set('episode', String(context.episode));
            }
            const subData = await fetchJson<{ subtitles: OtherSubtitleResult[] }>(
              `/api/subtitles/search?${subParams}`,
              { signal: controller.signal }
            );
            if (sequence === sequenceRef.current && !controller.signal.aborted) {
              setSubtitles(subData.subtitles);
            }
          }
        }
      } catch (cause) {
        if (sequence === sequenceRef.current && !controller.signal.aborted) {
          showError(cause, 'Pencarian subtitle gagal. Coba lagi.');
        }
      } finally {
        if (sequence === sequenceRef.current) {
          setBusy(null);
        }
      }
    },
    [context.title, context.type, context.season, context.episode, cancelRequest, showError]
  );

  const useSubtitle = useCallback(
    async (result: OtherSubtitleResult) => {
      cancelRequest();
      const sequence = sequenceRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      setBusy('download');
      setError(null);
      setRetryResult(result);
      try {
        await onSelect(result, controller.signal);
        if (sequence === sequenceRef.current && !controller.signal.aborted) onBack();
      } catch (cause) {
        if (sequence === sequenceRef.current && !controller.signal.aborted) {
          showError(cause, 'Subtitle tidak dapat diambil. Coba lagi.');
        }
      } finally {
        if (sequence === sequenceRef.current) setBusy(null);
      }
    },
    [onBack, onSelect, cancelRequest, showError]
  );

  const handleStartEdit = () => {
    cancelRequest();
    setBusy(null);
    setError(null);
    setRetryResult(null);
    setSelectedTitle(null);
    setSubtitles(null);
    setEditingQuery(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleFormSubmit = () => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed.length > 150) {
      setError({ message: 'Masukkan judul sepanjang 2–150 karakter.' });
      return;
    }
    setEditingQuery(false);
    void search(undefined, trimmed);
  };

  useEffect(() => {
    void search();
    return () => {
      sequenceRef.current++;
      controllerRef.current?.abort();
    };
  }, [search]);

  return (
    <div data-popover data-interactive role="dialog" aria-label="Cari subtitle lain"
      onClick={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()}
      className="player-panel text-sm text-white">
      <div className="player-panel-header">
        <button
          type="button"
          data-initial-focus
          onClick={onBack}
          aria-label="Kembali ke audio dan subtitle"
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800"
        >
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
      {editingQuery ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (busy !== 'download') handleFormSubmit();
          }}
        >
          <label htmlFor="other-subtitle-query" className="block text-zinc-200">Judul film atau serial</label>
          <input
            ref={inputRef}
            id="other-subtitle-query"
            type="text"
            value={query}
            minLength={2}
            maxLength={150}
            required
            disabled={busy === 'download'}
            onChange={(event) => {
              cancelRequest();
              setQuery(event.target.value);
              setBusy(null);
              setError(null);
              setTitles(null);
              setSelectedTitle(null);
              setSubtitles(null);
              setRetryResult(null);
            }}
            className="min-h-11 w-full min-w-0 rounded-lg border border-zinc-500 bg-zinc-950 px-3 text-sm text-white"
          />
          <button
            type="submit"
            disabled={busy === 'download' || query.trim().length < 2 || query.trim().length > 150}
            className="player-option border border-zinc-500"
          >
            Cari
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-xs text-zinc-300">
            Judul: <span className="font-medium text-white">{lastQueryRef.current || context.title}</span>
          </p>
          {!selectedTitle && (
            <button
              type="button"
              disabled={busy === 'download'}
              onClick={handleStartEdit}
              className="player-option w-auto min-h-11 shrink-0 border border-zinc-600 px-3 text-xs"
            >
              Ubah judul
            </button>
          )}
        </div>
      )}
      {busy && (
        <p role="status" aria-live="polite" className="mt-3 text-zinc-200">
          {busy === 'download' ? 'Mengambil subtitle…' : 'Mencari subtitle Indonesia…'}
        </p>
      )}
      {error && (
        <div className="mt-3 space-y-2">
          <p role="alert" className="break-words text-zinc-200">
            {error.message}
            {error.status === 503 ? ' Pengelola server perlu memasang API key SubDL yang valid.' : ''}
          </p>
          {error.status !== 503 && (
            <button
              type="button"
              disabled={busy !== null}
              className="player-option border border-zinc-500"
              onClick={() => {
                if (retryResult) void useSubtitle(retryResult);
                else void search(selectedTitle || undefined, lastQueryRef.current);
              }}
            >
              Coba lagi
            </button>
          )}
        </div>
      )}
      {selectedTitle ? (
        <section className="player-section">
          <div className="flex items-start justify-between gap-2">
            <h4 className="min-w-0 flex-1 break-words font-semibold">{selectedTitle.title}{selectedTitle.year ? ` (${selectedTitle.year})` : ''}</h4>
            <button
              type="button"
              disabled={busy === 'download'}
              className="player-option w-auto min-h-11 shrink-0 border border-zinc-600 px-3 text-xs"
              onClick={handleStartEdit}
            >
              Ubah judul
            </button>
          </div>
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
