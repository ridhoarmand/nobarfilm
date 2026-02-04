'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNetShortDetail } from '@/hooks/useNetShort';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, List } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Hls from 'hls.js';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { SubjectType } from '@/types/api';
import { useWatchHistory } from '@/hooks/useWatchHistory';

export default function NetShortWatchPage() {
  const params = useParams<{ shortPlayId: string }>();
  const searchParams = useSearchParams();
  const shortPlayId = params.shortPlayId;
  const router = useRouter();
  const { saveProgress, getProgress } = useWatchHistory();

  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [showEpisodeList, setShowEpisodeList] = useState(false);

  // Debug log state (kept internal for now, can be exposed if needed)
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const addLog = (msg: string) => {
    console.log(msg);
    // setDebugLog(prev => [...prev.slice(-4), msg]);
  };

  // Get episode from URL
  useEffect(() => {
    const ep = searchParams.get('ep');
    if (ep) {
      setCurrentEpisode(parseInt(ep) || 1);
    }
  }, [searchParams]);

  // Fetch detail with all episodes
  const { data, isLoading, error } = useNetShortDetail(shortPlayId || '');

  // Get current episode data
  const currentEpisodeData = data?.episodes?.find((ep) => ep.episodeNo === currentEpisode);

  // Handle video ended - auto next episode
  const handleVideoEnded = useCallback(() => {
    if (!data?.episodes) return;
    const nextEp = currentEpisode + 1;
    const nextEpisodeData = data.episodes.find((ep) => ep.episodeNo === nextEp);

    if (nextEpisodeData) {
      setCurrentEpisode(nextEp);
      router.replace(`/drama/watch/netshort/${shortPlayId}?ep=${nextEp}`, { scroll: false });
    }
  }, [currentEpisode, data?.episodes, shortPlayId]);

  const goToEpisode = (ep: number) => {
    setCurrentEpisode(ep);
    router.replace(`/drama/watch/netshort/${shortPlayId}?ep=${ep}`, { scroll: false });
    setShowEpisodeList(false);
  };

  const totalEpisodes = data?.totalEpisodes || 1;

  return (
    <main className="fixed inset-0 bg-black flex flex-col">
      {/* Header - Fixed Overlay */}
      <div className="absolute top-0 left-0 right-0 z-40 h-16 pointer-events-auto">
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md border-b border-white/5" />

        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto pointer-events-auto">
          <Link href={`/drama/netshort/${shortPlayId}`} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline shadow-black drop-shadow-md">NobarDrama</span>
          </Link>

          <div className="text-center flex-1 px-2 min-w-0">
            <h1 className="text-white font-bold truncate text-xs sm:text-base drop-shadow-md">{data?.title || 'Loading...'}</h1>
            <p className="text-white/60 text-[10px] sm:text-xs drop-shadow-md">Episode {currentEpisode}</p>
          </div>

          <button onClick={() => setShowEpisodeList(!showEpisodeList)} className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10">
            <List className="w-6 h-6 drop-shadow-md" />
          </button>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 w-full h-full relative bg-black flex flex-col items-center justify-center">
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

          {currentEpisodeData?.videoUrl && (
            <VideoPlayer
              src={currentEpisodeData.videoUrl}
              subtitles={
                currentEpisodeData.subtitleUrl
                  ? [
                      {
                        kind: 'subtitles',
                        label: 'Indonesia',
                        srcLang: 'id',
                        src: `/api/proxy/video?url=${encodeURIComponent(currentEpisodeData.subtitleUrl)}`,
                        default: true,
                      },
                    ]
                  : []
              }
              onEnded={handleVideoEnded}
              onProgress={(time) => {
                if (time > 5) {
                  saveProgress('netshort', shortPlayId, currentEpisode, time);
                }
              }}
              subjectType={SubjectType.Short}
              initialTime={getProgress('netshort', shortPlayId, currentEpisode)}
            />
          )}
        </div>

        {/* Navigation Controls Overlay - Bottom */}
        <div className="absolute bottom-20 md:bottom-12 left-0 right-0 z-40 pointer-events-none flex justify-center pb-safe-area-bottom">
          <div className="flex items-center gap-2 md:gap-6 pointer-events-auto bg-black/60 backdrop-blur-md px-3 py-1.5 md:px-6 md:py-3 rounded-full border border-white/10 shadow-lg transition-all scale-90 md:scale-100 origin-bottom">
            <button
              onClick={() => currentEpisode > 1 && goToEpisode(currentEpisode - 1)}
              disabled={currentEpisode <= 1}
              className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
            </button>

            <span className="text-white font-medium text-xs md:text-sm tabular-nums min-w-[60px] md:min-w-[80px] text-center">
              Ep {currentEpisode} / {totalEpisodes}
            </span>

            <button
              onClick={() => currentEpisode < totalEpisodes && goToEpisode(currentEpisode + 1)}
              disabled={currentEpisode >= totalEpisodes}
              className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
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
              {data?.episodes?.map((episode) => (
                <button
                  key={episode.episodeId}
                  onClick={() => goToEpisode(episode.episodeNo)}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                    ${episode.episodeNo === currentEpisode ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}
                  `}
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
