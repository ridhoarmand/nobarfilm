'use client';import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNetShortDetail } from '@/hooks/useNetShort';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, List, Zap, ZapOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DramaPlayer } from '@/components/player/DramaPlayer';
import { useWatchHistory } from '@/hooks/useWatchHistory';

export default function NetShortWatchPage() {
  const params = useParams<{ shortPlayId: string }>();
  const searchParams = useSearchParams();
  const shortPlayId = params.shortPlayId;
  const router = useRouter();
  const { saveProgress, getProgress } = useWatchHistory();

  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  // Get episode from URL
  useEffect(() => {
    const ep = searchParams.get('ep');
    if (ep) {
      setCurrentEpisode(parseInt(ep) || 1);
    }
  }, [searchParams]);

  const { data, isLoading, error } = useNetShortDetail(shortPlayId || '');

  const currentEpisodeData = useMemo(() => {
    return data?.episodes?.find((ep) => ep.episodeNo === currentEpisode);
  }, [data?.episodes, currentEpisode]);

  // MEMOIZED video source
  const videoSource = useMemo(() => {
    if (!currentEpisodeData?.videoUrl) return null;
    const type = (currentEpisodeData.videoUrl.includes('.m3u8') ? 'application/x-mpegurl' : 'video/mp4') as 'application/x-mpegurl' | 'video/mp4';
    return { src: currentEpisodeData.videoUrl, type };
  }, [currentEpisodeData?.videoUrl]);

  const handleVideoEnded = useCallback(() => {
    if (!data?.episodes || !autoPlayNext) return;
    const nextEp = currentEpisode + 1;
    const nextEpisodeData = data.episodes.find((ep) => ep.episodeNo === nextEp);
    if (nextEpisodeData) {
      setCurrentEpisode(nextEp);
      router.replace(`/drama/watch/netshort/${shortPlayId}?ep=${nextEp}`, { scroll: false });
    }
  }, [currentEpisode, data?.episodes, shortPlayId, autoPlayNext, router]);

  const goToEpisode = useCallback(
    (ep: number) => {
      if (ep === currentEpisode) {
        setShowEpisodeList(false);
        return;
      }
      setCurrentEpisode(ep);
      router.replace(`/drama/watch/netshort/${shortPlayId}?ep=${ep}`, { scroll: false });
      setShowEpisodeList(false);
    },
    [currentEpisode, router, shortPlayId],
  );

  const totalEpisodes = data?.totalEpisodes || 1;

  return (
    <main className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="relative h-16 flex-shrink-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-white/5">
        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto">
          <Link href={`/drama/netshort/${shortPlayId}`} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline">NobarDrama</span>
          </Link>
          <div className="text-center flex-1 px-2 min-w-0">
            <h1 className="text-white font-bold truncate text-xs sm:text-base">{data?.title || 'Loading...'}</h1>
            <p className="text-white/60 text-[10px] sm:text-xs">Episode {currentEpisode}</p>
          </div>
          <button onClick={() => setShowEpisodeList(!showEpisodeList)} className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10">
            <List className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative min-h-0 bg-black flex items-center justify-center p-2 sm:p-4">
        {/* Bounds Wrapper - prevents "kegedean" on desktop */}
        <div className="h-full max-h-full max-w-full aspect-[9/16] md:max-w-[480px] relative">
          {(isLoading || !currentEpisodeData) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-white font-medium">Memuat Episode {currentEpisode}...</p>
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

          {videoSource && (
            <DramaPlayer
              key={`netshort-player-${currentEpisode}`}
              src={videoSource}
              onEnded={handleVideoEnded}
              initialTime={getProgress('netshort', shortPlayId, currentEpisode)}
              autoPlay={autoPlayNext}
            />
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="relative h-24 md:h-20 flex-shrink-0 z-40 flex items-center justify-center px-4 pb-safe-area-bottom pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-zinc-900/80 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10 shadow-2xl">
          <button
            onClick={() => currentEpisode > 1 && goToEpisode(currentEpisode - 1)}
            disabled={currentEpisode <= 1}
            className="p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <span className="text-white/90 font-bold text-sm tabular-nums px-3 min-w-[60px] text-center">
            {currentEpisode} / {totalEpisodes}
          </span>

          <button
            onClick={() => setAutoPlayNext(!autoPlayNext)}
            className={cn('p-2.5 rounded-full transition-all active:scale-90', autoPlayNext ? 'text-primary bg-primary/20 ring-1 ring-primary/30' : 'text-white/40 hover:bg-white/5')}
            title={autoPlayNext ? 'Autoplay On' : 'Autoplay Off'}
          >
            {autoPlayNext ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
          </button>

          <button
            onClick={() => currentEpisode < totalEpisodes && goToEpisode(currentEpisode + 1)}
            disabled={currentEpisode >= totalEpisodes}
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
              {data?.episodes?.map((episode) => (
                <button
                  key={episode.episodeId}
                  onClick={() => goToEpisode(episode.episodeNo)}
                  className={cn(
                    'aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                    episode.episodeNo === currentEpisode ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {episode.episodeNo}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
