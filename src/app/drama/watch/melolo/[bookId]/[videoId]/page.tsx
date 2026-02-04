'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMeloloDetail, useMeloloStream } from '@/hooks/useMelolo';
import { ChevronLeft, ChevronRight, Loader2, List, AlertCircle, Settings, Check } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/common/DropdownMenu';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { SubjectType } from '@/types/api';

interface VideoQuality {
  name: string;
  url: string;
}

export default function MeloloWatchPage() {
  const params = useParams<{ bookId: string; videoId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality | null>(null);
  
  // Auto-hide controls
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    };
  }, [resetHideTimer]);

  // Internal state for videoId to prevent page unmount/remount on navigation
  const [currentVideoId, setCurrentVideoId] = useState(params.videoId || '');

  // Fetch data
  const { data: detailData, isLoading: detailLoading } = useMeloloDetail(params.bookId || '');
  const { data: streamData, isLoading: streamLoading, isFetching: streamFetching } = useMeloloStream(currentVideoId);

  const drama = detailData?.data?.video_data;

  // Handle ?ep= param
  useEffect(() => {
    if (drama?.video_list) {
      const ep = parseInt(searchParams.get('ep') || '', 10);
      if (ep >= 1 && ep <= drama.video_list.length) {
        const targetVid = drama.video_list[ep - 1].vid;
        if (targetVid !== currentVideoId) {
          setCurrentVideoId(targetVid);
        }
      }
    }
  }, [searchParams, drama, currentVideoId]);

  // Sync state with params if they change externally
  useEffect(() => {
    if (params.videoId && params.videoId !== currentVideoId) {
      setCurrentVideoId(params.videoId);
    }
  }, [params.videoId, currentVideoId]);

  const rawVideoModel = streamData?.data?.video_model;

  // Process video qualities
  const qualities = useMemo(() => {
    if (!rawVideoModel) return [];
    try {
      const parsedModel = JSON.parse(rawVideoModel);
      const videoList = parsedModel.video_list;
      if (!videoList) return [];

      const availableQualities: VideoQuality[] = [];
      const qualityMap: Record<string, string> = {
        video_1: '240p',
        video_2: '360p',
        video_3: '480p',
        video_4: '540p',
        video_5: '720p',
      };

      Object.entries(videoList).forEach(([key, value]: [string, any]) => {
        if (value?.main_url) {
          try {
            // Try to decode if base64, otherwise keep as is
            const decoded = atob(value.main_url);
            // Basic check if it looks like a URL
            const url = decoded.startsWith('http') ? decoded : value.main_url;

            availableQualities.push({
              name: qualityMap[key] || key,
              url: url,
            });
          } catch (e) {
            // Fallback if not base64
            availableQualities.push({
              name: qualityMap[key] || key,
              url: value.main_url,
            });
          }
        }
      });

      // Sort qualities (highest resolution first assumed by key order, or we can just reverse)
      return availableQualities.reverse();
    } catch (e) {
      console.error('Error parsing video model', e);
      return [];
    }
  }, [rawVideoModel]);

  // Set default quality
  useEffect(() => {
    if (qualities.length > 0) {
      let nextQuality = null;
      if (selectedQuality) {
        nextQuality = qualities.find((q) => q.name === selectedQuality.name);
      }

      if (!nextQuality) {
        // Prefer 720p as default if available, then 540p, then 480p, otherwise first
        nextQuality = qualities.find((q) => q.name === '720p') || qualities.find((q) => q.name === '540p') || qualities.find((q) => q.name === '480p') || qualities[0];
      }

      if (nextQuality && nextQuality.url !== selectedQuality?.url) {
        setSelectedQuality(nextQuality);
      }
    }
  }, [qualities, selectedQuality]);

  // Find current episode index
  const currentEpisodeIndex = drama?.video_list?.findIndex((v) => v.vid === currentVideoId) ?? -1;
  const totalEpisodes = drama?.video_list?.length || 0;

  const handleEpisodeChange = (index: number) => {
    if (!drama?.video_list?.[index]) return;
    const nextVideoId = drama.video_list[index].vid;

    // Prevent restart if clicking current episode
    if (nextVideoId === currentVideoId) {
      setShowEpisodeList(false);
      return;
    }

    // Update internal state
    setCurrentVideoId(nextVideoId);

    // Update URL with episode number
    router.replace(`/drama/watch/melolo/${params.bookId}/${nextVideoId}?ep=${index + 1}`, { scroll: false });

    setShowEpisodeList(false);
  };

  const handleVideoEnded = () => {
    if (currentEpisodeIndex !== -1 && currentEpisodeIndex < totalEpisodes - 1) {
      handleEpisodeChange(currentEpisodeIndex + 1);
    }
  };

  // Guard: If logic fails completely and we have no data after loading
  if (!detailLoading && !drama) {
    return (
      <main className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Video tidak ditemukan</h2>
        <button onClick={() => router.back()} className="text-primary hover:underline">
          Kembali
        </button>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-black flex flex-col">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-40 h-16 pointer-events-auto">
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md border-b border-white/5" />
        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto pointer-events-auto">
          <Link href={`/drama/melolo/${params.bookId}`} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline shadow-black drop-shadow-md">NobarDrama</span>
          </Link>

          <div className="text-center flex-1 px-2 min-w-0">
            <h1 className="text-white font-bold truncate text-xs sm:text-base drop-shadow-md">{drama?.series_title || 'Loading...'}</h1>
            <p className="text-white/60 text-[10px] sm:text-xs drop-shadow-md">Episode {currentEpisodeIndex !== -1 ? currentEpisodeIndex + 1 : '...'}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quality Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10 flex items-center gap-1">
                  <Settings className="w-6 h-6 drop-shadow-md" />
                  <span className="text-xs font-bold drop-shadow-md hidden sm:inline">{selectedQuality?.name || '...'}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[100] bg-zinc-900 border-zinc-800">
                {qualities.map((q) => (
                  <DropdownMenuItem
                    key={q.name}
                    className={cn('flex items-center justify-between gap-4 cursor-pointer', selectedQuality?.name === q.name ? 'text-primary font-semibold bg-white/5' : '')}
                    onClick={() => setSelectedQuality(q)}
                  >
                    <span>{q.name}</span>
                    {selectedQuality?.name === q.name && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button onClick={() => setShowEpisodeList(!showEpisodeList)} className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10">
              <List className="w-6 h-6 drop-shadow-md" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div className="flex-1 w-full h-full relative bg-black flex flex-col items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* 
                 Video Element:
                 We remove the 'key' to allow the VIDEO element to be reused across renders.
                 This is CRITICAL for maintaining Fullscreen status.
                 We also use a ref to manually update if needed, though React src prop update usually suffices.
             */}
          {selectedQuality ? (
            <VideoPlayer src={selectedQuality.url} onEnded={handleVideoEnded} subjectType={SubjectType.Short} initialTime={0} />
          ) : (
            // Fallback while initializing first time quality
            <div className="w-full h-full flex items-center justify-center text-white/50">{streamLoading ? '' : 'Video unavailable'}</div>
          )}

          {/* Loading Overlay */}
          {(streamLoading || streamFetching || detailLoading) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-30 pointer-events-none">
              <Loader2 className="w-12 h-12 animate-spin text-primary drop-shadow-md" />
            </div>
          )}
        </div>

        {/* Navigation Controls (Auto-hide) */}
        <div 
          className="absolute bottom-20 md:bottom-12 left-0 right-0 z-40 pointer-events-none flex justify-center pb-safe-area-bottom"
          onPointerMove={resetHideTimer}
          onClick={resetHideTimer}
        >
          <div
            className={cn(
              "flex items-center gap-1 pointer-events-auto bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10 shadow-lg transition-all duration-300",
              showControls && !showEpisodeList ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}
          >
            <button
              onClick={() => { currentEpisodeIndex > 0 && handleEpisodeChange(currentEpisodeIndex - 1); resetHideTimer(); }}
              disabled={currentEpisodeIndex <= 0}
              className="p-1 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-white/80 font-medium text-[10px] tabular-nums px-1">
              {currentEpisodeIndex !== -1 ? currentEpisodeIndex + 1 : '-'}/{totalEpisodes}
            </span>

            <button
              onClick={() => { currentEpisodeIndex < totalEpisodes - 1 && handleEpisodeChange(currentEpisodeIndex + 1); resetHideTimer(); }}
              disabled={currentEpisodeIndex >= totalEpisodes - 1}
              className="p-1 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Episode List Sidebar */}
      {showEpisodeList && drama && (
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
              {drama.video_list.map((video, idx) => (
                <button
                  key={video.vid}
                  onClick={() => handleEpisodeChange(idx)}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                    ${idx === currentEpisodeIndex ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}
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
