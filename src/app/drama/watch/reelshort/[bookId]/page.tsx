'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, List, Settings, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import Hls from 'hls.js';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/common/DropdownMenu';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { SubjectType } from '@/types/api';

interface VideoItem {
  url: string;
  encode: string;
  quality: number;
  bitrate: string;
}

interface EpisodeData {
  success: boolean;
  isLocked: boolean;
  videoList: VideoItem[];
}

interface DetailData {
  success: boolean;
  bookId: string;
  title: string;
  cover: string;
  totalEpisodes: number;
}

import { decryptData } from '@/lib/crypto';

// ... existing code

async function fetchEpisode(bookId: string, episodeNumber: number): Promise<EpisodeData> {
  const response = await fetch(`/api/reelshort/watch?bookId=${bookId}&episodeNumber=${episodeNumber}`);
  if (!response.ok) {
    const errorData = await response.json(); // May accept unencrypted error, but trying safeJson approach is better if available.
    // However, since we standardized on encryptedResponse, we should expect encrypted error too.
    throw new Error('Failed to fetch episode');
  }
  const json = await response.json();
  if (json.data && typeof json.data === 'string') {
    return decryptData(json.data);
  }
  return json;
}

async function fetchDetail(bookId: string): Promise<DetailData> {
  const response = await fetch(`/api/reelshort/detail?bookId=${bookId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch detail');
  }
  const json = await response.json();
  if (json.data && typeof json.data === 'string') {
    return decryptData(json.data);
  }
  return json;
}

export default function ReelShortWatchPage() {
  const params = useParams<{ bookId: string }>();
  const searchParams = useSearchParams();
  const bookId = params.bookId;
  const router = useRouter();

  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
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

  // Get episode from URL
  useEffect(() => {
    const ep = searchParams.get('ep');
    if (ep) {
      setCurrentEpisode(parseInt(ep) || 1);
    }
  }, [searchParams]);

  // Fetch detail for title and episode count
  const { data: detailData } = useQuery({
    queryKey: ['reelshort', 'detail', bookId],
    queryFn: () => fetchDetail(bookId || ''),
    enabled: !!bookId,
  });

  // Fetch episode video
  const {
    data: episodeData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['reelshort', 'episode', bookId, currentEpisode],
    queryFn: () => fetchEpisode(bookId || '', currentEpisode),
    enabled: !!bookId && currentEpisode > 0,
  });

  // Get available quality options
  const qualityOptions = useMemo(() => {
    if (!episodeData?.videoList) return [];

    return episodeData.videoList
      .map((video, index) => {
        // quality=0 with H265 means 1080p
        let qualityLabel = '';
        if (video.quality === 0) {
          qualityLabel = `1080p (${video.encode})`;
        } else {
          qualityLabel = `${video.quality}p (${video.encode})`;
        }

        return {
          id: `${video.encode}-${video.quality}-${index}`,
          label: qualityLabel,
          quality: video.quality === 0 ? 1080 : video.quality,
          video,
        };
      })
      .sort((a, b) => b.quality - a.quality); // Sort by quality descending
  }, [episodeData]);

  // Get current video URL based on selected quality
  const getCurrentVideoUrl = useCallback(() => {
    if (!episodeData?.videoList?.length) return null;

    if (selectedQuality === 'auto' || !qualityOptions.length) {
      // Default: prefer H264 for compatibility
      const h264Video = episodeData.videoList.find((v) => v.encode === 'H264');
      return h264Video || episodeData.videoList[0];
    }

    const selected = qualityOptions.find((q) => q.id === selectedQuality);
    return selected?.video || episodeData.videoList[0];
  }, [episodeData, selectedQuality, qualityOptions]);

  // Handle video ended - auto next episode
  const handleVideoEnded = useCallback(() => {
    const totalEpisodes = detailData?.totalEpisodes || 1;
    if (currentEpisode < totalEpisodes) {
      const nextEp = currentEpisode + 1;
      setCurrentEpisode(nextEp);
      router.replace(`/drama/watch/reelshort/${bookId}?ep=${nextEp}`, { scroll: false });
    }
  }, [currentEpisode, detailData?.totalEpisodes, bookId, router]);

  const goToEpisode = (ep: number) => {
    if (ep === currentEpisode) {
      setShowEpisodeList(false);
      return;
    }
    setCurrentEpisode(ep);
    router.replace(`/drama/watch/reelshort/${bookId}?ep=${ep}`, { scroll: false });
    setShowEpisodeList(false);
  };

  const totalEpisodes = detailData?.totalEpisodes || 1;

  return (
    <main className="fixed inset-0 bg-black flex flex-col">
      {/* Header - Fixed Overlay with improved visibility */}
      <div className="absolute top-0 left-0 right-0 z-40 h-16 pointer-events-auto">
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md border-b border-white/5" />

        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto pointer-events-auto">
          {/* Header content... */}
          <Link href={`/drama/reelshort/${bookId}`} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline shadow-black drop-shadow-md">NobarDrama</span>
          </Link>

          <div className="text-center flex-1 px-2 min-w-0">
            <h1 className="text-white font-bold truncate text-xs sm:text-base drop-shadow-md">{detailData?.title || 'Loading...'}</h1>
            <p className="text-white/60 text-[10px] sm:text-xs drop-shadow-md">Episode {currentEpisode}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quality Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10 flex items-center gap-1">
                  <Settings className="w-5 h-5 drop-shadow-md" />
                  <span className="text-xs font-bold drop-shadow-md hidden sm:inline">{selectedQuality === 'auto' ? 'Auto' : qualityOptions.find((o) => o.id === selectedQuality)?.quality + 'p'}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[100] bg-zinc-900 border-zinc-800">
                <DropdownMenuItem
                  onClick={() => setSelectedQuality('auto')}
                  className={cn('flex items-center justify-between gap-4 cursor-pointer', selectedQuality === 'auto' ? 'text-primary font-semibold bg-white/5' : '')}
                >
                  <span>Auto (H264)</span>
                  {selectedQuality === 'auto' && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
                {qualityOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.id}
                    onClick={() => setSelectedQuality(option.id)}
                    className={cn('flex items-center justify-between gap-4 cursor-pointer', selectedQuality === option.id ? 'text-primary font-semibold bg-white/5' : '')}
                  >
                    <span>{option.label}</span>
                    {selectedQuality === option.id && <Check className="w-4 h-4" />}
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
        {/* Video Element Wrapper */}
        <div className="relative w-full h-full flex items-center justify-center">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-20">
              <AlertCircle className="w-10 h-10 text-destructive mb-4" />
              <p className="text-white mb-4">Gagal memuat video</p>
              <button onClick={() => router.refresh()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">
                Coba Lagi
              </button>
            </div>
          )}

          {episodeData?.isLocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-center p-4 z-20">
              <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
              <p className="text-white text-lg font-medium mb-4">Episode ini terkunci</p>
              <Link href={`/drama/reelshort/${bookId}`} className="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors">
                Kembali ke Detail
              </Link>
            </div>
          )}

          {/* Video Player */}
          {getCurrentVideoUrl() && <VideoPlayer src={getCurrentVideoUrl()!.url} onEnded={handleVideoEnded} subjectType={SubjectType.Short} initialTime={0} />}
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
              onClick={() => { currentEpisode > 1 && goToEpisode(currentEpisode - 1); resetHideTimer(); }}
              disabled={currentEpisode <= 1}
              className="p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-white/90 font-medium text-sm tabular-nums px-2">
              {currentEpisode}/{totalEpisodes}
            </span>

            <button
              onClick={() => { currentEpisode < totalEpisodes && goToEpisode(currentEpisode + 1); resetHideTimer(); }}
              disabled={currentEpisode >= totalEpisodes}
              className="p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
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
              {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
                <button
                  key={ep}
                  onClick={() => goToEpisode(ep)}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                    ${ep === currentEpisode ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  {ep}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
