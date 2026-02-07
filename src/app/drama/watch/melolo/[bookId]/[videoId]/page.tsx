'use client';import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, List, Settings, Check, Zap, ZapOff, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/common/DropdownMenu';
import { DramaPlayer } from '@/components/player/DramaPlayer';
import { useWatchHistory } from '@/hooks/useWatchHistory';

interface VideoSource {
  quality: string;
  url: string;
}

interface Episode {
  videoId: string;
  videoNo: number;
}

interface DramaDetail {
  bookId: string;
  title: string;
  cover: string;
}

interface WatchData {
  videoSources: VideoSource[];
  episodes: Episode[];
  drama: DramaDetail;
}

async function fetchWatchData(bookId: string, videoId: string): Promise<WatchData> {
  const response = await fetch(`/api/melolo/watch?bookId=${bookId}&videoId=${videoId}`);
  if (!response.ok) throw new Error('Failed to fetch watch data');
  return response.json();
}

export default function MeloloWatchPage() {
  const params = useParams<{ bookId: string; videoId: string }>();
  const bookId = params.bookId;
  const videoId = params.videoId;
  const router = useRouter();
  const { getProgress } = useWatchHistory();

  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  const { data, isLoading, error } = useQuery({
    queryKey: ['melolo', 'watch', bookId, videoId],
    queryFn: () => fetchWatchData(bookId || '', videoId || ''),
    enabled: !!bookId && !!videoId,
  });

  const currentEpisode = useMemo(() => {
    return data?.episodes?.find((ep) => ep.videoId === videoId);
  }, [data?.episodes, videoId]);

  const sortedSources = useMemo(() => {
    if (!data?.videoSources) return [];
    return [...data.videoSources].sort((a, b) => {
      const qA = parseInt(a.quality) || 0;
      const qB = parseInt(b.quality) || 0;
      return qB - qA;
    });
  }, [data?.videoSources]);

  const activeSource = useMemo(() => {
    if (!sortedSources.length) return null;
    return sortedSources.find((s) => s.quality === selectedQuality) || sortedSources[0];
  }, [sortedSources, selectedQuality]);

  const videoSource = useMemo(() => {
    if (!activeSource?.url) return null;
    const type = (activeSource.url.includes('.m3u8') ? 'application/x-mpegurl' : 'video/mp4') as 'application/x-mpegurl' | 'video/mp4';
    return { src: activeSource.url, type };
  }, [activeSource]);

  const handleVideoEnded = useCallback(() => {
    if (!data?.episodes || !autoPlayNext) return;
    const currentIndex = data.episodes.findIndex((ep) => ep.videoId === videoId);
    if (currentIndex !== -1 && currentIndex < data.episodes.length - 1) {
      const nextEp = data.episodes[currentIndex + 1];
      router.replace(`/drama/watch/melolo/${bookId}/${nextEp.videoId}`, { scroll: false });
    }
  }, [data?.episodes, videoId, bookId, autoPlayNext, router]);

  const goToEpisode = useCallback(
    (targetVideoId: string) => {
      if (targetVideoId === videoId) {
        setShowEpisodeList(false);
        return;
      }
      setShowEpisodeList(false);
      router.replace(`/drama/watch/melolo/${bookId}/${targetVideoId}`, { scroll: false });
    },
    [videoId, bookId, router],
  );

  const totalEpisodes = data?.episodes?.length || 0;
  const episodeNumber = currentEpisode?.videoNo || 0;

  return (
    <main className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="relative h-16 flex-shrink-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-white/5">
        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto">
          <Link href={`/drama/melolo/${bookId}`} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline">NobarDrama</span>
          </Link>
          <div className="text-center flex-1 px-2 min-w-0">
            <h1 className="text-white font-bold truncate text-xs sm:text-base">{data?.drama?.title || 'Loading...'}</h1>
            <p className="text-white/60 text-[10px] sm:text-xs">Episode {episodeNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10 flex items-center gap-1">
                  <Settings className="w-5 h-5" />
                  <span className="text-xs font-bold hidden sm:inline">{activeSource?.quality || 'Auto'}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[100] bg-zinc-900 border-zinc-800">
                {sortedSources.map((source) => (
                  <DropdownMenuItem
                    key={source.quality}
                    onClick={() => setSelectedQuality(source.quality)}
                    className={cn(
                      'flex items-center justify-between gap-4 cursor-pointer',
                      selectedQuality === source.quality || (!selectedQuality && source === sortedSources[0]) ? 'text-primary font-semibold bg-white/5' : '',
                    )}
                  >
                    <span>{source.quality}</span>
                    {(selectedQuality === source.quality || (!selectedQuality && source === sortedSources[0])) && <Check className="w-4 h-4" />}
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
        <div className="h-full max-h-full max-w-full aspect-[9/16] md:max-w-[480px] relative">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-white font-medium">Memuat Episode {episodeNumber}...</p>
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
            <DramaPlayer key={`melolo-player-${videoId}`} src={videoSource} onEnded={handleVideoEnded} initialTime={getProgress('melolo', bookId, episodeNumber)} autoPlay={autoPlayNext} />
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="relative h-24 md:h-20 flex-shrink-0 z-40 flex items-center justify-center px-4 pb-safe-area-bottom pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-zinc-900/80 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10 shadow-2xl">
          <button
            onClick={() => {
              const currentIndex = data?.episodes?.findIndex((ep) => ep.videoId === videoId);
              if (currentIndex !== undefined && currentIndex > 0) goToEpisode(data!.episodes[currentIndex - 1].videoId);
            }}
            disabled={!data?.episodes || data.episodes.findIndex((ep) => ep.videoId === videoId) <= 0}
            className="p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <span className="text-white/90 font-bold text-sm tabular-nums px-3 min-w-[60px] text-center">
            {episodeNumber} / {totalEpisodes}
          </span>

          <button
            onClick={() => setAutoPlayNext(!autoPlayNext)}
            className={cn('p-2.5 rounded-full transition-all active:scale-90', autoPlayNext ? 'text-primary bg-primary/20 ring-1 ring-primary/30' : 'text-white/40 hover:bg-white/5')}
            title={autoPlayNext ? 'Autoplay On' : 'Autoplay Off'}
          >
            {autoPlayNext ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
          </button>

          <button
            onClick={() => {
              const currentIndex = data?.episodes?.findIndex((ep) => ep.videoId === videoId);
              if (currentIndex !== undefined && data?.episodes && currentIndex < data.episodes.length - 1) goToEpisode(data.episodes[currentIndex + 1].videoId);
            }}
            disabled={!data?.episodes || data.episodes.findIndex((ep) => ep.videoId === videoId) >= data.episodes.length - 1}
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
                  key={episode.videoId}
                  onClick={() => goToEpisode(episode.videoId)}
                  className={cn(
                    'aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                    episode.videoId === videoId ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {episode.videoNo}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
