'use client';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useFreeReelsDetail } from '@/hooks/useFreeReels';
import { ChevronLeft, ChevronRight, Loader2, List, AlertCircle, Zap, ZapOff } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { SubjectType } from '@/types/api';

export default function FreeReelsWatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookId = params.bookId as string;

  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [videoQuality, setVideoQuality] = useState<'h264' | 'h265'>('h264');
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  const { data, isLoading, error } = useFreeReelsDetail(bookId);

  useEffect(() => {
    const epParam = searchParams.get('ep');
    if (epParam) {
      const epIndex = parseInt(epParam, 10) - 1;
      if (!isNaN(epIndex) && epIndex >= 0) setCurrentEpisodeIndex(epIndex);
    }
  }, [searchParams]);

  const drama = data?.data;
  const episodes = useMemo(() => drama?.episodes || [], [drama]);
  const totalEpisodes = episodes.length;

  const currentEpisodeData = useMemo(() => {
    return episodes[currentEpisodeIndex] || episodes[0] || null;
  }, [episodes, currentEpisodeIndex]);

  // MEMOIZED video source
  const videoSource = useMemo(() => {
    if (!currentEpisodeData) return null;
    let sourceUrl = '';
    if (videoQuality === 'h265' && currentEpisodeData.external_audio_h265_m3u8) {
      sourceUrl = currentEpisodeData.external_audio_h265_m3u8;
    } else {
      sourceUrl = currentEpisodeData.external_audio_h264_m3u8 || currentEpisodeData.videoUrl || '';
    }
    if (!sourceUrl) return null;
    const proxiedUrl = `/api/proxy/video?url=${encodeURIComponent(sourceUrl)}`;
    const type = (sourceUrl.includes('.m3u8') ? 'application/x-mpegurl' : 'video/mp4') as 'application/x-mpegurl' | 'video/mp4';
    return { src: proxiedUrl, type };
  }, [currentEpisodeData, videoQuality]);

  // MEMOIZED subtitles
  const subtitles = useMemo(() => {
    if (!currentEpisodeData?.subtitleUrl) return [];
    return [
      {
        kind: 'subtitles',
        label: 'Indonesia',
        srcLang: 'id',
        src: `/api/proxy/video?url=${encodeURIComponent(currentEpisodeData.subtitleUrl)}`,
        default: true,
      },
    ];
  }, [currentEpisodeData?.subtitleUrl]);

  const handleEpisodeChange = useCallback(
    (index: number) => {
      if (index === currentEpisodeIndex) {
        setShowEpisodeList(false);
        return;
      }
      const nextEp = index + 1;
      setShowEpisodeList(false);
      router.push(`/drama/watch/freereels/${bookId}?ep=${nextEp}`);
    },
    [currentEpisodeIndex, bookId, router],
  );

  const handleVideoEnded = useCallback(() => {
    if (!autoPlayNext) return;
    const nextIndex = currentEpisodeIndex + 1;
    if (nextIndex < totalEpisodes) {
      router.replace(`/drama/watch/freereels/${bookId}?ep=${nextIndex + 1}`);
    }
  }, [autoPlayNext, currentEpisodeIndex, totalEpisodes, bookId, router]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <h3 className="text-white font-medium text-lg">Memuat video...</h3>
          <p className="text-white/60 text-sm">Mohon tunggu sebentar...</p>
        </div>
      </div>
    );
  }

  if (error || !drama) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Video tidak ditemukan</h2>
        <Link href="/" className="text-primary hover:underline">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-40 h-16 pointer-events-auto">
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md border-b border-white/5" />
        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto pointer-events-auto">
          <Link href={`/drama/freereels/${bookId}`} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline">NobarDrama</span>
          </Link>
          <div className="text-center flex-1 px-2 min-w-0">
            <h1 className="text-white font-bold truncate text-xs sm:text-base">{drama.title}</h1>
            <p className="text-white/60 text-[10px] sm:text-xs">{currentEpisodeData ? `Episode ${(currentEpisodeData.index || currentEpisodeIndex) + 1}` : 'Episode ?'}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-800 rounded-lg p-1 border border-white/10 shadow-xl">
              <button
                onClick={() => setVideoQuality('h264')}
                className={cn('text-[10px] px-2.5 py-1 rounded-md transition-all font-bold', videoQuality === 'h264' ? 'bg-primary text-white shadow-sm' : 'text-white/50 hover:text-white')}
              >
                H.264
              </button>
              <button
                onClick={() => setVideoQuality('h265')}
                className={cn('text-[10px] px-2.5 py-1 rounded-md transition-all font-bold', videoQuality === 'h265' ? 'bg-primary text-white shadow-sm' : 'text-white/50 hover:text-white')}
              >
                H.265
              </button>
            </div>
            <button onClick={() => setShowEpisodeList(!showEpisodeList)} className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10">
              <List className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 w-full h-full relative bg-black flex flex-col items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center bg-black group">
          {!videoSource && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-white font-medium">Memuat video...</p>
            </div>
          )}

          {videoSource && (
            <VideoPlayer src={videoSource} subtitles={subtitles} poster={drama.cover} onEnded={handleVideoEnded} subjectType={SubjectType.Short} initialTime={0} autoPlay={autoPlayNext} />
          )}
        </div>

        {/* Navigation Controls - ALWAYS VISIBLE */}
        <div className="absolute bottom-20 md:bottom-12 left-0 right-0 z-40 pointer-events-none flex justify-center pb-safe-area-bottom">
          <div className="flex items-center gap-1 pointer-events-auto bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10 shadow-lg">
            <button
              onClick={() => handleEpisodeChange(currentEpisodeIndex - 1)}
              disabled={currentEpisodeIndex <= 0}
              className="p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-white/90 font-medium text-sm tabular-nums px-2">
              {currentEpisodeData ? (currentEpisodeData.index || currentEpisodeIndex) + 1 : 1}/{totalEpisodes}
            </span>

            <button
              onClick={() => handleEpisodeChange(currentEpisodeIndex + 1)}
              disabled={currentEpisodeIndex >= totalEpisodes - 1}
              className="p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => setAutoPlayNext(!autoPlayNext)}
              className={cn('p-2 rounded-full transition-colors active:scale-95', autoPlayNext ? 'text-primary bg-primary/20 hover:bg-primary/30' : 'text-white/50 hover:bg-white/10')}
            >
              {autoPlayNext ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
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
              {episodes.map((ep: any, idx: number) => (
                <button
                  key={ep.id}
                  onClick={() => handleEpisodeChange(idx)}
                  className={cn(
                    'aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                    idx === currentEpisodeIndex ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {(ep.index || idx) + 1}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
