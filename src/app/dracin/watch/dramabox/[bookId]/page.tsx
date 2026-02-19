'use client';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useDramaDetail, useEpisodes } from '@/hooks/useDramaDetail';
import { ChevronLeft, ChevronRight, Loader2, Settings, List, AlertCircle, Check, Zap, ZapOff } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/common/DropdownMenu';
import type { DramaDetailDirect, DramaDetailResponseLegacy } from '@/types/drama';
import { DracinPlayer } from '@/components/dracin/DracinPlayer';

function isDirectFormat(data: unknown): data is DramaDetailDirect {
  return data !== null && typeof data === 'object' && 'bookId' in data && 'coverWap' in data;
}

function isLegacyFormat(data: unknown): data is DramaDetailResponseLegacy {
  return data !== null && typeof data === 'object' && 'data' in data && (data as DramaDetailResponseLegacy).data?.book !== undefined;
}

export default function DramaBoxWatchPage() {
  const params = useParams<{ bookId: string }>();
  const bookId = params.bookId;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [quality, setQuality] = useState(720);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  const { data: detailData, isLoading: detailLoading } = useDramaDetail(bookId || '');
  const { data: episodes, isLoading: episodesLoading } = useEpisodes(bookId || '');

  useEffect(() => {
    const ep = parseInt(searchParams.get('ep') || '1', 10);
    if (ep >= 1 && episodes && ep <= episodes.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentEpisode(ep - 1);
    }
  }, [searchParams, episodes]);

  const handleEpisodeChange = useCallback(
    (index: number) => {
      if (index === currentEpisode) {
        setShowEpisodeList(false);
        return;
      }
      setCurrentEpisode(index);
      setShowEpisodeList(false);
      router.replace(`/dracin/watch/dramabox/${bookId}?ep=${index + 1}`, { scroll: false });
    },
    [currentEpisode, bookId, router],
  );

  const currentEpisodeData = useMemo(() => {
    if (!episodes) return null;
    return episodes[currentEpisode] || null;
  }, [episodes, currentEpisode]);

  const defaultCdn = useMemo(() => {
    if (!currentEpisodeData) return null;
    return currentEpisodeData.cdnList.find((cdn) => cdn.isDefault === 1) || currentEpisodeData.cdnList[0] || null;
  }, [currentEpisodeData]);

  const availableQualities = useMemo(() => {
    const list = defaultCdn?.videoPathList?.map((v) => v.quality).filter((q): q is number => typeof q === 'number');
    const unique = Array.from(new Set(list && list.length ? list : [720]));
    return unique.sort((a, b) => b - a);
  }, [defaultCdn]);

  useEffect(() => {
    if (!availableQualities.length) return;
    if (!availableQualities.includes(quality)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuality(availableQualities.includes(720) ? 720 : availableQualities[0]);
    }
  }, [availableQualities, quality]);

  const videoSource = useMemo(() => {
    if (!currentEpisodeData || !defaultCdn) return null;
    if (!defaultCdn.videoPathList || defaultCdn.videoPathList.length === 0) return null;

    const videoPath = defaultCdn.videoPathList.find((v) => v.quality === quality) || defaultCdn.videoPathList.find((v) => v.isDefault === 1) || defaultCdn.videoPathList[0];
    if (!videoPath?.videoPath) return null;

    const url = `/api/proxy/video?url=${encodeURIComponent(videoPath.videoPath)}`;
    const type = (videoPath.videoPath.includes('.m3u8') ? 'application/x-mpegurl' : 'video/mp4') as 'application/x-mpegurl' | 'video/mp4';
    return { src: url, type };
  }, [currentEpisodeData, defaultCdn, quality]);

  const handleVideoEnded = useCallback(() => {
    if (!episodes || !autoPlayNext) return;
    const next = currentEpisode + 1;
    if (next < episodes.length) handleEpisodeChange(next);
  }, [episodes, autoPlayNext, currentEpisode, handleEpisodeChange]);

  let book: { bookId: string; bookName: string } | null = null;
  if (detailData) {
    if (isDirectFormat(detailData)) {
      book = { bookId: detailData.bookId, bookName: detailData.bookName };
    } else if (isLegacyFormat(detailData)) {
      book = { bookId: detailData.data.book.bookId, bookName: detailData.data.book.bookName };
    }
  }

  const totalEpisodes = episodes?.length || 0;

  if (detailLoading || episodesLoading) {
    return (
      <main className="fixed inset-0 bg-black flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <h3 className="text-white font-medium text-lg">Memuat video...</h3>
          <p className="text-white/60 text-sm">Mohon tunggu sebentar.</p>
        </div>
      </main>
    );
  }

  if (!book || !episodes) {
    return (
      <main className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Drama tidak ditemukan</h2>
        <Link href="/" className="text-primary hover:underline">
          Kembali ke beranda
        </Link>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="relative h-16 flex-shrink-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-white/5">
        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto">
          <Link href={`/dracin/dramabox/${bookId}`} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline">SekaiDrama</span>
          </Link>
          <div className="text-center flex-1 px-2 min-w-0">
            <h1 className="text-white font-bold truncate text-xs sm:text-base">{book.bookName}</h1>
            <p className="text-white/60 text-[10px] sm:text-xs">{currentEpisodeData?.chapterName || `Episode ${currentEpisode + 1}`}</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10 flex items-center gap-1">
                  <Settings className="w-5 h-5" />
                  <span className="text-xs font-bold hidden sm:inline">{quality}p</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[100] bg-zinc-900 border-zinc-800">
                {availableQualities.map((q) => (
                  <DropdownMenuItem key={q} onClick={() => setQuality(q)} className={cn('flex items-center justify-between gap-4', quality === q ? 'text-primary font-semibold bg-white/5' : '')}>
                    <span>{q}p</span>
                    {quality === q && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={() => setShowEpisodeList(!showEpisodeList)} className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10">
              <List className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative min-h-0 bg-black flex items-center justify-center p-2 sm:p-4">
        {/* Bounds Wrapper - fits within available space, 9:16 aspect, max 480px wide */}
        <div className="h-full max-h-full max-w-full aspect-[9/16] md:max-w-[480px] relative">
          {(detailLoading || episodesLoading || !currentEpisodeData) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-white font-medium">{episodesLoading ? 'Memuat Data...' : `Menyiapkan Episode ${currentEpisode + 1}...`}</p>
            </div>
          )}

          {videoSource && <DracinPlayer key={`dramabox-player-${currentEpisode}`} src={videoSource} poster={currentEpisodeData?.chapterImg} onEnded={handleVideoEnded} autoPlay={autoPlayNext} />}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="relative h-24 md:h-20 flex-shrink-0 z-40 flex items-center justify-center pb-safe-area-bottom pointer-events-none px-4">
        <div className="flex items-center gap-2 pointer-events-auto bg-zinc-900/80 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10 shadow-2xl">
          <button
            onClick={() => currentEpisode > 0 && handleEpisodeChange(currentEpisode - 1)}
            disabled={currentEpisode <= 0}
            className="p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <span className="text-white/90 font-bold text-sm tabular-nums px-3 min-w-[60px] text-center">
            {currentEpisode + 1} / {totalEpisodes}
          </span>

          <button
            onClick={() => setAutoPlayNext(!autoPlayNext)}
            className={cn('p-2.5 rounded-full transition-all active:scale-90', autoPlayNext ? 'text-primary bg-primary/20 ring-1 ring-primary/30' : 'text-white/40 hover:bg-white/5')}
            title={autoPlayNext ? 'Autoplay On' : 'Autoplay Off'}
          >
            {autoPlayNext ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
          </button>

          <button
            onClick={() => currentEpisode < totalEpisodes - 1 && handleEpisodeChange(currentEpisode + 1)}
            disabled={currentEpisode >= totalEpisodes - 1}
            className="p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors active:scale-95"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Episode List Sidebar */}
      {showEpisodeList && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => setShowEpisodeList(false)} />
          <div className="fixed inset-y-0 right-0 w-72 bg-zinc-900 z-[70] overflow-y-auto border-l border-white/10 shadow-2xl animate-in slide-in-from-right">
            <div className="p-4 border-b border-white/10 sticky top-0 bg-zinc-900 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white">Daftar Episode</h2>
                <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full">Total {totalEpisodes}</span>
              </div>
              <button onClick={() => setShowEpisodeList(false)} className="p-1 text-white/70 hover:text-white">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <div className="p-3 grid grid-cols-5 gap-2">
              {episodes.map((episode, idx) => (
                <button
                  key={episode.chapterId}
                  onClick={() => handleEpisodeChange(idx)}
                  className={cn(
                    'aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                    idx === currentEpisode ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
