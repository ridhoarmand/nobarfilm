'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useDetail, useSources, useGenerateStreamLink } from '@/lib/hooks/useMovieBox';
import { useWatchHistory } from '@/lib/hooks/useWatchHistory';
import { Navbar } from '@/components/layout/Navbar';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { movieBoxAPI } from '@/lib/api/moviebox';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

function WatchContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = params.id as string;

  // For movies: season=0, episode=0
  // For series: season>=1, episode>=1
  const seasonParam = parseInt(searchParams.get('season') || '0');
  const episodeParam = parseInt(searchParams.get('episode') || '0');

  const [currentSeason, setCurrentSeason] = useState(seasonParam);
  const [currentEpisode, setCurrentEpisode] = useState(episodeParam);
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [savedTime, setSavedTime] = useState<number>(0); // Save current playback time

  const { data: detailData, isLoading: isLoadingDetail } = useDetail(subjectId);
  const { data: sourcesData, isLoading: isLoadingSources, error: sourcesError } = useSources(subjectId, currentSeason, currentEpisode);

  // Derive selected source URL
  const selectedSourceUrl = sourcesData?.downloads?.[selectedQuality]?.url;

  // Use cached stream generation
  const { data: streamData, isLoading: isLoadingStream, error: streamErrorData } = useGenerateStreamLink(selectedSourceUrl);

  const streamUrl = streamData?.streamUrl;
  const streamError = streamErrorData?.message || (sourcesData?.downloads?.length === 0 ? 'No video sources available' : null);

  // Update URL when season/episode changes
  useEffect(() => {
    const query = new URLSearchParams();
    if (currentSeason > 0) query.set('season', currentSeason.toString());
    if (currentEpisode > 1) query.set('episode', currentEpisode.toString());
    const queryString = query.toString();
    const newUrl = `/watch/${subjectId}${queryString ? `?${queryString}` : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [currentSeason, currentEpisode, subjectId, router]);

  const handleEpisodeChange = (newEpisode: number) => {
    setCurrentEpisode(newEpisode);
    setSavedTime(0); // Reset saved time for new episode
  };

  const handleNextEpisode = () => {
    if (detailData?.resource?.seasons) {
      const season = detailData.resource.seasons.find((s) => s.se === currentSeason);
      if (season && currentEpisode < season.maxEp) {
        handleEpisodeChange(currentEpisode + 1);
      }
    }
  };

  const handlePreviousEpisode = () => {
    if (currentEpisode > 1) {
      handleEpisodeChange(currentEpisode - 1);
    }
  };

  // Watch History Hook
  const { saveProgress } = useWatchHistory({
    subjectId,
    subjectType: detailData?.subject?.subjectType || 1, // Default Movie
    title: detailData?.subject?.title || 'Unknown Title',
    coverUrl: detailData?.subject?.cover?.url,
    currentEpisode,
    totalEpisodes: detailData?.resource?.seasons?.find((s) => s.se === currentSeason)?.maxEp,
  });

  // Update current playback time
  const handleProgress = (time: number) => {
    setSavedTime(time);
    // Estimate total duration from stream or metadata if available,
    // but the hook needs explicit duration.
    // VideoPlayer onProgress usually just gives currentTime.
    // Ideally VideoPlayer should pass duration too, or we get it from metadata (subject.duration * 60).
    const duration = detailData?.subject?.duration ? detailData.subject.duration * 60 : 0;
    if (duration > 0) {
      saveProgress(time, duration);
    }
  };

  // Prepare subtitles for player
  const subtitles = useMemo(
    () =>
      sourcesData?.captions?.map((caption) => ({
        kind: 'captions' as const,
        label: caption.lanName,
        srcLang: caption.lan,
        // Use our own proxy to bypass CORS and convert SRT to VTT
        src: `/api/subtitle?url=${encodeURIComponent(caption.url)}`,
        default: caption.lan.includes('id') || caption.lanName.toLowerCase().includes('indonesia'),
      })) || [],
    [sourcesData],
  );

  // Memoize video source to prevent flickering on focus/re-render
  const videoSource = useMemo(
    () => ({
      src: streamUrl,
      subtitles,
      poster: detailData?.subject?.cover?.url || '',
    }),
    [streamUrl, subtitles, detailData?.subject?.cover?.url],
  );

  const isMovie = detailData?.subject?.subjectType === 1;
  const isSeries = detailData?.subject?.subjectType === 2;
  const currentSeasonData = detailData?.resource?.seasons?.find((s) => s.se === currentSeason);

  if (isLoadingDetail) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-white">Loading...</p>
        </div>
      </>
    );
  }

  if (!detailData) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Content Not Found</h1>
            <button onClick={() => router.push('/')} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition">
              Back to Homepage
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black pt-20 flex flex-col items-center">
        {/* Unified Container for Player & Controls - Constrained Width to prevent scroll on large screens */}
        <div className="w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Title - Compact */}
          <div className="py-2 mb-2">
            <Link href={`/movie/${subjectId}`} className="text-lg sm:text-xl font-bold text-white hover:text-gray-300 transition">
              {detailData.subject.title}
            </Link>
            {isSeries && (
              <span className="text-gray-400 ml-2 text-sm">
                S{currentSeason}:E{currentEpisode}
              </span>
            )}
          </div>

          <div className="w-full shadow-2xl rounded-xl overflow-hidden border border-zinc-900 bg-black">
            {streamError ? (
              <div className="aspect-video w-full bg-zinc-900 flex items-center justify-center">
                <div className="text-center max-w-md px-4">
                  <h2 className="text-2xl font-bold text-red-500 mb-4">⚠️ Playback Error</h2>
                  <p className="text-gray-300 mb-2">{streamError}</p>
                  {sourcesError && <p className="text-sm text-gray-400 mb-4">API Error: {sourcesError.message}</p>}
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
                    >
                      Try Again
                    </button>
                    <button onClick={() => router.push(`/movie/${subjectId}`)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition">
                      Back to Details
                    </button>
                  </div>
                </div>
              </div>
            ) : isLoadingStream || !streamUrl ? (
              <div className="aspect-video w-full bg-zinc-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
                  <p className="text-white">{isLoadingSources ? 'Loading sources...' : 'Preparing stream...'}</p>
                  <p className="text-sm text-gray-400 mt-2">This may take a few seconds...</p>
                </div>
              </div>
            ) : (
              <VideoPlayer
                src={videoSource.src || ''}
                subtitles={videoSource.subtitles}
                poster={videoSource.poster}
                onEnded={handleNextEpisode}
                onProgress={handleProgress}
                initialTime={savedTime}
                subjectType={detailData.subject.subjectType}
              />
            )}
          </div>

          {/* Controls Immediately Below */}
          <div className="pt-3 pb-8">
            {/* Quality Selector */}
            {sourcesData && sourcesData.downloads && sourcesData.downloads.length > 1 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Quality</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sourcesData.downloads.map((source, index) => (
                    <button
                      key={source.id}
                      onClick={() => {
                        setSelectedQuality(index);
                      }}
                      className={`px-3 py-1 text-sm rounded-md font-medium transition ${selectedQuality === index ? 'bg-red-600 text-white' : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-white'}`}
                    >
                      {source.resolution}p
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Episode Navigation (Series only) */}
            {isSeries && currentSeasonData && (
              <div className="flex items-center justify-between py-3 border-t border-zinc-800">
                <button
                  onClick={handlePreviousEpisode}
                  disabled={currentEpisode <= 1}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>

                <span className="text-gray-400 text-sm">
                  Ep {currentEpisode} / {currentSeasonData.maxEp}
                </span>

                <button
                  onClick={handleNextEpisode}
                  disabled={currentEpisode >= currentSeasonData.maxEp}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Description */}
            {detailData.subject.description && (
              <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                <p className="text-zinc-400 text-sm leading-relaxed">{detailData.subject.description}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <>
          <Navbar />
          <div className="min-h-screen bg-black pt-16 flex items-center justify-center">
            <p className="text-white">Loading...</p>
          </div>
        </>
      }
    >
      <WatchContent />
    </Suspense>
  );
}
