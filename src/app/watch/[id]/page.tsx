'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useMovieBoxDetail, useMovieBoxSources, useMovieBoxPlaybackUrl } from '@/hooks/useMovieBox';
import { useMovieBoxWatchHistory } from '@/hooks/useMovieBoxWatchHistory';
import { Navbar } from '@/components/layout/Navbar';
import { VideoPlayer } from '@/components/player/VideoPlayer';
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

  const { data: detailData, isLoading: isLoadingDetail } = useMovieBoxDetail(subjectId);
  const isMovie = detailData?.subject?.subjectType === 1;
  const isSeries = detailData?.subject?.subjectType === 2;

  const sourcesSeason = isMovie ? 0 : currentSeason;
  const sourcesEpisode = isMovie ? 0 : currentEpisode;

  const { data: sourcesData, isLoading: isLoadingSources, error: sourcesError } = useMovieBoxSources(
    subjectId,
    sourcesSeason,
    sourcesEpisode,
  );

  // Use cached stream generation
  const { data: streamData, isLoading: isLoadingStream, error: streamErrorData } = useMovieBoxPlaybackUrl(
    subjectId,
    sourcesSeason,
    sourcesEpisode,
    selectedQuality,
  );

  const streamUrl = streamData?.streamUrl;
  const streamError = streamErrorData?.message || (sourcesData?.downloads?.length === 0 ? 'No video sources available' : null);

  // Normalize season/episode for movie vs series
  useEffect(() => {
    if (!detailData?.subject) return;

    if (isMovie) {
      if (currentSeason !== 0) setCurrentSeason(0);
      if (currentEpisode !== 0) setCurrentEpisode(0);
      return;
    }

    if (isSeries) {
      if (currentSeason < 1) setCurrentSeason(1);
      if (currentEpisode < 1) setCurrentEpisode(1);
    }
  }, [detailData?.subject?.subjectType, isMovie, isSeries, currentSeason, currentEpisode]);

  // Update URL when season/episode changes
  useEffect(() => {
    if (isMovie) {
      router.replace(`/watch/${subjectId}`, { scroll: false });
      return;
    }

    const query = new URLSearchParams();
    if (currentSeason > 0) query.set('season', currentSeason.toString());
    if (currentEpisode > 0) query.set('episode', currentEpisode.toString());
    const queryString = query.toString();
    const newUrl = `/watch/${subjectId}${queryString ? `?${queryString}` : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [currentSeason, currentEpisode, subjectId, router, isMovie]);

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
  const { saveProgress } = useMovieBoxWatchHistory({
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

      <main className="min-h-screen bg-black pt-20 pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Title Section */}
          <div className="mb-6">
            <Link href={`/movie/${subjectId}`} className="inline-flex items-center gap-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-white hover:text-red-500 transition group">
              <ChevronLeft className="w-8 h-8 opacity-0 group-hover:opacity-100 transition -ml-8 group-hover:-ml-2" />
              {detailData.subject.title}
            </Link>
            {isSeries && (
              <p className="text-gray-400 mt-2 text-lg">
                Season {currentSeason} • Episode {currentEpisode} / {currentSeasonData?.maxEp}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {/* Player Section - Full width */}
            <div>
              <div className="w-full shadow-2xl rounded-2xl overflow-hidden border border-zinc-800 bg-black">
                {streamError ? (
                  <div className="aspect-video w-full bg-zinc-900 flex items-center justify-center">
                    <div className="text-center max-w-md px-4">
                      <h2 className="text-2xl font-bold text-red-500 mb-4">⚠️ Playback Error</h2>
                      <p className="text-gray-300 mb-2">{streamError}</p>
                      {sourcesError && <p className="text-sm text-gray-400 mb-4">API Error: {sourcesError.message}</p>}
                      <div className="flex gap-3 justify-center flex-wrap">
                        <button
                          onClick={() => {
                            window.location.reload();
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                        >
                          Try Again
                        </button>
                        <button onClick={() => router.push(`/movie/${subjectId}`)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition">
                          Back to Details
                        </button>
                      </div>
                    </div>
                  </div>
                ) : isLoadingStream || !streamUrl ? (
                  <div className="aspect-video w-full bg-zinc-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
                      <p className="text-white font-medium">{isLoadingSources ? 'Loading sources...' : 'Preparing stream...'}</p>
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

              {/* Controls Below Player */}
              <div className="mt-6 space-y-4">
                {/* Quality Selector */}
                {sourcesData && sourcesData.downloads && sourcesData.downloads.length > 1 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Quality</span>
                      <span className="text-xs text-gray-500">({sourcesData.downloads.length} options)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sourcesData.downloads.map((source, index) => (
                        <button
                          key={source.id}
                          onClick={() => {
                            setSelectedQuality(index);
                          }}
                          className={`px-4 py-2 text-sm rounded-lg font-semibold transition ${selectedQuality === index ? 'bg-red-600 text-white shadow-lg shadow-red-600/50' : 'bg-zinc-900 text-gray-300 hover:bg-zinc-800 hover:text-white border border-zinc-800'}`}
                        >
                          {source.resolution}p
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Episode Navigation (Series only) */}
                {isSeries && currentSeasonData && (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <button
                        onClick={handlePreviousEpisode}
                        disabled={currentEpisode <= 1}
                        className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs sm:text-sm"
                      >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Previous Episode</span>
                      </button>

                      <span className="text-gray-300 font-semibold text-sm sm:text-base text-center">
                        Ep {currentEpisode} of {currentSeasonData.maxEp}
                      </span>

                      <button
                        onClick={handleNextEpisode}
                        disabled={currentEpisode >= currentSeasonData.maxEp}
                        className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs sm:text-sm"
                      >
                        <span>Next Episode</span>
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - Below player */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Description */}
              {detailData.subject.description && (
                <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-3">Synopsis</h3>
                  <p className="text-zinc-300 text-sm leading-relaxed line-clamp-6">{detailData.subject.description}</p>
                  {detailData.subject.description.length > 200 && (
                    <Link href={`/movie/${subjectId}`} className="text-red-500 hover:text-red-400 text-xs mt-3 inline-block font-semibold">
                      Read More →
                    </Link>
                  )}
                </div>
              )}

              {/* Info Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                {detailData.subject.releaseDate && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Release Date</p>
                    <p className="text-white font-semibold">{new Date(detailData.subject.releaseDate).getFullYear()}</p>
                  </div>
                )}
                {detailData.subject.duration && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Duration</p>
                    <p className="text-white font-semibold">{detailData.subject.duration} min</p>
                  </div>
                )}
                {detailData.subject.imdbRatingValue && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">IMDb Rating</p>
                    <p className="text-white font-semibold flex items-center gap-1">
                      ⭐ {parseFloat(String(detailData.subject.imdbRatingValue)).toFixed(1)}/10
                    </p>
                  </div>
                )}
              </div>

              {/* Back Button */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/movie/${subjectId}`)}
                  className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition font-semibold text-sm"
                >
                  ← Back to Details
                </button>
              </div>
            </div>
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
