'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useDramaDetail, useEpisodes } from '@/hooks/useDramaDetail';
import { ChevronLeft, ChevronRight, Loader2, Settings, List, AlertCircle, Check } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/common/DropdownMenu';
import type { DramaDetailDirect, DramaDetailResponseLegacy } from '@/types/drama';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { SubjectType } from '@/types/api';

// Helper to check if response is new format
function isDirectFormat(data: unknown): data is DramaDetailDirect {
  return data !== null && typeof data === 'object' && 'bookId' in data && 'coverWap' in data;
}

// Helper to check if response is legacy format
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after 3 seconds
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Initial timer and cleanup
  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    };
  }, [resetHideTimer]);

  const { data: detailData, isLoading: detailLoading } = useDramaDetail(bookId || '');
  const { data: episodes, isLoading: episodesLoading } = useEpisodes(bookId || '');

  // Initialize from URL params - ensure it's reactive
  useEffect(() => {
    const ep = parseInt(searchParams.get('ep') || '1', 10);
    if (ep >= 1 && episodes && ep <= episodes.length) {
      setCurrentEpisode(ep - 1); // 1-indexed to 0-indexed
    }
  }, [searchParams, episodes]);

  // Update URL when episode changes
  const handleEpisodeChange = (index: number) => {
    if (index === currentEpisode) {
      setShowEpisodeList(false);
      return;
    }
    setCurrentEpisode(index);
    setShowEpisodeList(false);
    // Use replace to avoid polluting history on every episode click
    router.replace(`/drama/watch/dramabox/${bookId}?ep=${index + 1}`, { scroll: false });
  };

  // All useMemo hooks must be called BEFORE any early returns
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

  // Keep selected quality valid for the current episode
  useEffect(() => {
    if (!availableQualities.length) return;
    if (!availableQualities.includes(quality)) {
      setQuality(availableQualities[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableQualities]);

  // Get video URL with selected quality
  const getVideoUrl = () => {
    if (!currentEpisodeData || !defaultCdn) return '';

    const videoPath = defaultCdn.videoPathList.find((v) => v.quality === quality) || defaultCdn.videoPathList.find((v) => v.isDefault === 1) || defaultCdn.videoPathList[0];

    return videoPath?.videoPath || '';
  };

  const handleVideoEnded = () => {
    if (!episodes) return;
    const next = currentEpisode + 1;
    if (next < episodes.length) {
      handleEpisodeChange(next);
    }
  };

  // Handle both new and legacy API formats
  let book: { bookId: string; bookName: string } | null = null;

  if (detailData) {
    if (isDirectFormat(detailData)) {
      book = { bookId: detailData.bookId, bookName: detailData.bookName };
    } else if (isLegacyFormat(detailData)) {
      book = { bookId: detailData.data.book.bookId, bookName: detailData.data.book.bookName };
    }
  }

  const totalEpisodes = episodes?.length || 0;

  // Loading state
  if (detailLoading || episodesLoading) {
    return (
      <main className="fixed inset-0 bg-black flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <h3 className="text-white font-medium text-lg">Memuat video...</h3>
          <p className="text-white/60 text-sm">Mohon tunggu sebentar, data sedang diambil.</p>
        </div>
      </main>
    );
  }

  // Error state
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
    <main className="fixed inset-0 bg-black flex flex-col">
      {/* Header - Fixed Overlay with improved visibility */}
      <div className="absolute top-0 left-0 right-0 z-40 h-16 pointer-events-auto">
        {/* Solid background for readability */}
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md border-b border-white/5" />

        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto pointer-events-auto">
          {/* Header content unchanged... */}
          <Link href={`/drama/dramabox/${bookId}`} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline shadow-black drop-shadow-md">NobarDrama</span>
          </Link>

          <div className="text-center flex-1 px-2 min-w-0">
            <h1 className="text-white font-bold truncate text-xs sm:text-base drop-shadow-md">{book.bookName}</h1>
            <p className="text-white/60 text-[10px] sm:text-xs drop-shadow-md">{currentEpisodeData?.chapterName || `Episode ${currentEpisode + 1}`}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quality Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10 flex items-center gap-1">
                  <Settings className="w-5 h-5 drop-shadow-md" />
                  <span className="text-xs font-bold drop-shadow-md hidden sm:inline">{quality}p</span>
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

            {/* Episode List Toggle */}
            <button onClick={() => setShowEpisodeList(!showEpisodeList)} className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10">
              <List className="w-6 h-6 drop-shadow-md" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 w-full h-full relative bg-black flex flex-col items-center justify-center">
        {/* Video Player Area */}
        <div className="relative w-full h-full flex items-center justify-center p-0 md:p-4">
          {currentEpisodeData ? (
            <VideoPlayer src={getVideoUrl()} poster={currentEpisodeData.chapterImg} onEnded={handleVideoEnded} subjectType={SubjectType.Short} initialTime={0} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          )}
        </div>

        {/* Navigation Controls Overlay - Bottom (Auto-hide) */}
        <div 
          className="absolute bottom-20 md:bottom-12 left-0 right-0 z-40 pointer-events-none flex justify-center pb-safe-area-bottom"
          onPointerMove={resetHideTimer}
          onClick={resetHideTimer}
        >
          <div className={cn(
            "flex items-center gap-1 pointer-events-auto bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10 shadow-lg transition-all duration-300",
            showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          )}>
            <button
              onClick={() => { currentEpisode > 0 && handleEpisodeChange(currentEpisode - 1); resetHideTimer(); }}
              disabled={currentEpisode <= 0}
              className="p-1 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-white/80 font-medium text-[10px] tabular-nums px-1">
              {currentEpisode + 1}/{totalEpisodes}
            </span>

            <button
              onClick={() => { currentEpisode < totalEpisodes - 1 && handleEpisodeChange(currentEpisode + 1); resetHideTimer(); }}
              disabled={currentEpisode >= totalEpisodes - 1}
              className="p-1 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
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
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                    ${idx === currentEpisode ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}
                  `}
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
