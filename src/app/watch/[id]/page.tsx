'use client';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useMovieBoxDetail, useMovieBoxPlaybackUrl, useMovieBoxPlayerMetadata } from '@/hooks/useMovieBox';
import { MoviePlayer } from '@/components/player/MoviePlayer';
import { useMovieBoxWatchHistory } from '@/hooks/useMovieBoxWatchHistory';
import { ArrowLeft, Loader2, AlertCircle, Star, Globe, Film, Volume2 } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';

function WatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const subjectId = params.id as string;
  const { isAuthenticated } = useAuth();

  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');
  const resumeTimeParam = searchParams.get('t');

  // Parse params: season=0&episode=0 for movies, season=1&episode=1 for series
  const season = seasonParam !== null ? parseInt(seasonParam) : undefined;
  const episode = episodeParam !== null ? parseInt(episodeParam) : undefined;
  const resumeTime = resumeTimeParam ? parseInt(resumeTimeParam) : 0;
  
  const [qualityIndex, setQualityIndex] = useState(0);

  const { data: detail, isLoading: isLoadingDetail, error: detailError } = useMovieBoxDetail(subjectId);

  const isSeries = detail?.subject?.subjectType === 2;
  // For series: use provided URL params or default to S1E1
  // For movies: always use season=0, episode=0 (no URL params needed)
  const effectiveSeason = isSeries ? (season ?? 1) : 0;
  const effectiveEpisode = isSeries ? (episode ?? 1) : 0;

  const {
    data: playerMetadata,
    isLoading: isLoadingMetadata,
  } = useMovieBoxPlayerMetadata(subjectId, effectiveSeason, effectiveEpisode, {
    enabled: !!subjectId && !isLoadingDetail,
  });

  const availableSeasons = useMemo(() => playerMetadata?.seasons || [], [playerMetadata]);
  const availableEpisodes = useMemo(() => playerMetadata?.episodes || [], [playerMetadata]);
  const availableQualities = useMemo(() => playerMetadata?.qualities || [], [playerMetadata]);
  const audioOptions = useMemo(() => playerMetadata?.audioOptions || [], [playerMetadata]);

  const [activeEpisodeRange, setActiveEpisodeRange] = useState(0);

  const episodeChunks = useMemo(() => {
    if (availableEpisodes.length <= 15) return [availableEpisodes];
    const chunks = [];
    const size = 25;
    for (let i = 0; i < availableEpisodes.length; i += size) {
      chunks.push(availableEpisodes.slice(i, i + size));
    }
    return chunks;
  }, [availableEpisodes]);

  useEffect(() => {
    if (episodeChunks.length > 1 && effectiveEpisode) {
      const idx = episodeChunks.findIndex((chunk) => chunk.includes(effectiveEpisode));
      if (idx !== -1) {
        queueMicrotask(() => {
          setActiveEpisodeRange(idx);
        });
      }
    }
  }, [effectiveEpisode, episodeChunks]);

  const audioIndex = useMemo(() => {
    const idx = audioOptions.findIndex((opt) => opt.code === subjectId);
    return idx !== -1 ? idx : 0;
  }, [audioOptions, subjectId]);

  const handleAudioChange = useCallback((newSubjectId: string) => {
    if (newSubjectId === subjectId) return;
    
    const videoElement = document.querySelector('video');
    const currentTime = videoElement ? Math.floor(videoElement.currentTime) : 0;
    
    const params = new URLSearchParams();
    if (isSeries) {
      if (typeof effectiveSeason === 'number') params.set('season', String(effectiveSeason));
      if (typeof effectiveEpisode === 'number') params.set('episode', String(effectiveEpisode));
    }
    if (currentTime > 0) {
      params.set('t', String(currentTime));
    } else if (resumeTime > 0) {
      params.set('t', String(resumeTime));
    }
    
    router.replace(`/watch/${newSubjectId}?${params.toString()}`);
  }, [subjectId, isSeries, effectiveSeason, effectiveEpisode, resumeTime, router]);

  // Only redirect URL for series to canonicalize S/E in the address bar.
  // Movies always use season=0/episode=0 and don't need URL params.
  // NOTE: isSeries is intentionally excluded from deps — it's only an early-exit guard
  // and subjectType is stable once the detail response arrives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isSeries || !playerMetadata?.selected) return;
    const nextSeason = playerMetadata.selected.season;
    const nextEpisode = playerMetadata.selected.episode;
    if (season !== nextSeason || episode !== nextEpisode) {
      const params = new URLSearchParams();
      if (typeof nextSeason === 'number') params.set('season', String(nextSeason));
      if (typeof nextEpisode === 'number') params.set('episode', String(nextEpisode));
      if (resumeTime > 0) params.set('t', String(resumeTime));
      router.replace(`/watch/${subjectId}?${params.toString()}`);
    }
  }, [episode, playerMetadata, resumeTime, router, season, subjectId]);


  const {
    data: playbackData,
    isLoading: isLoadingPlayback,
    error: playbackError,
  } = useMovieBoxPlaybackUrl(subjectId, effectiveSeason, effectiveEpisode, qualityIndex, {
    // Wait for detail to load first so isSeries is known, preventing wrong fetches
    enabled: !!subjectId && !isLoadingDetail,
  });

  const subject = detail?.subject;

  const { saveProgress } = useMovieBoxWatchHistory({
    subjectId,
    subjectType: subject?.subjectType || 1,
    title: subject?.title || '',
    coverUrl: subject?.cover?.url,
    currentEpisode: effectiveEpisode,
    totalEpisodes: undefined,
  });

  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleProgress = useCallback(
    (time: number, duration: number) => {
      if (saveTimeout.current) return;
      saveTimeout.current = setTimeout(() => {
        saveTimeout.current = null;
        if (time > 5 && duration > 0) {
          saveProgress(time, duration);
        }
      }, 10000);
    },
    [saveProgress],
  );

  const isLoading = isLoadingDetail || isLoadingPlayback;
  const error = detailError || playbackError;

  if (isLoading || isLoadingMetadata) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-zinc-500 text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center px-6 text-center gap-4">
        <AlertCircle className="w-14 h-14 text-red-600" />
        <h1 className="text-xl text-white font-bold">Tidak dapat memutar konten</h1>
        <p className="text-zinc-400 max-w-md text-sm">{error?.message || 'Konten tidak ditemukan atau sumber tidak tersedia.'}</p>
        <div className="flex gap-3 mt-2">
          <button onClick={() => router.back()} className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-sm transition">
            Kembali
          </button>
          {!isAuthenticated && (
            <button onClick={() => router.push('/login')} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-semibold transition">
              Sign In Akun MovieBox
            </button>
          )}
        </div>
      </div>
    );
  }

  const genres = subject?.genre ? subject.genre.split(',').map((g) => g.trim()).filter(Boolean) : [];
  const releaseYear = subject?.releaseDate ? new Date(subject.releaseDate).getFullYear() : null;
  const displayTitle = isSeries ? `${subject?.title} — S${effectiveSeason} E${effectiveEpisode}` : subject?.title;
  const directors = subject?.staffList?.filter((s) => s.staffType === 1) ?? [];
  const cast = subject?.staffList?.filter((s) => s.staffType === 2).slice(0, 6) ?? [];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800/60">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
        <div className="h-4 w-px bg-zinc-700/60" />
        <span className="text-zinc-300 text-sm font-medium truncate">{displayTitle}</span>
      </div>

      {/* Player Section */}
      <div className="bg-black">
        {playbackData?.streamUrl ? (
          <MoviePlayer
            src={playbackData.streamUrl}
            poster={subject?.coverHorizontalUrl || subject?.cover?.url}
            autoPlay
            initialTime={resumeTime}
            subtitles={playbackData.captions?.map((cap) => ({
              kind: 'subtitles',
              label: cap.lanName || cap.lan,
              srcLang: cap.lan,
              src: `/api/subtitle?url=${encodeURIComponent(cap.url)}`,
              default: (cap.lan || '').includes('id') || (cap.lanName || '').toLowerCase().includes('indonesia'),
            }))}
            onProgress={handleProgress}
            onEnded={() => {}}
          />
        ) : (
          <div className="w-full max-w-7xl mx-auto aspect-video flex flex-col items-center justify-center gap-3 text-zinc-500">
            <Film className="w-12 h-12" />
            <p className="text-sm">Sumber video tidak tersedia</p>
          </div>
        )}
      </div>

      {/* Quality Selector */}
      {(playerMetadata || playbackData) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            {availableSeasons.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mr-1">Season</span>
                {availableSeasons.map((item) => {
                  const active = item === (effectiveSeason ?? item);
                  return (
                    <button
                      key={item}
                      onClick={() => {
                        setQualityIndex(0);
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('season', String(item));
                        params.set('episode', '1');
                        router.replace(`/watch/${subjectId}?${params.toString()}`);
                      }}
                      className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium border transition-all',
                        active ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white',
                      )}
                    >
                      S{item}
                    </button>
                  );
                })}
              </div>
            )}

            {availableEpisodes.length > 0 && (
              <div className="flex flex-col gap-2 w-full">
                {episodeChunks.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mr-1">Range</span>
                    {episodeChunks.map((chunk, idx) => {
                      const start = chunk[0];
                      const end = chunk[chunk.length - 1];
                      const active = idx === activeEpisodeRange;
                      return (
                        <button
                          key={idx}
                          onClick={() => setActiveEpisodeRange(idx)}
                          className={cn(
                            'px-2.5 py-0.5 rounded text-xs font-medium border transition-all',
                            active ? 'bg-zinc-700 border-zinc-500 text-white font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          )}
                        >
                          {start} - {end}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mr-1">Episode</span>
                  {(episodeChunks[activeEpisodeRange] || availableEpisodes).map((item) => {
                    const active = item === (effectiveEpisode ?? item);
                    return (
                      <button
                        key={item}
                        onClick={() => {
                          setQualityIndex(0);
                          const params = new URLSearchParams(searchParams.toString());
                          params.set('episode', String(item));
                          router.replace(`/watch/${subjectId}?${params.toString()}`);
                        }}
                        className={cn(
                          'px-3 py-1 rounded-md text-xs font-medium border transition-all',
                          active ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white',
                        )}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {availableQualities.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mr-1">Quality</span>
                {availableQualities.map((item, idx) => {
                  const active = qualityIndex === idx;
                  return (
                    <button
                      key={item}
                      onClick={() => setQualityIndex(idx)}
                      className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium border transition-all',
                        active ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white',
                      )}
                    >
                      {item}p
                    </button>
                  );
                })}
              </div>
            )}

            {audioOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mr-1 flex items-center gap-1"><Volume2 className="w-3.5 h-3.5" /> Audio</span>
                {audioOptions.map((item, idx) => {
                  const active = audioIndex === idx;
                  return (
                    <button
                      key={item.code}
                      onClick={() => handleAudioChange(item.code)}
                      className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium border transition-all',
                        active ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white',
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Movie Info Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-5">
          {/* Cover Thumbnail - hidden on mobile */}
          {subject?.cover?.url && (
            <div className="hidden sm:block flex-none w-28 md:w-36 rounded-xl overflow-hidden bg-zinc-900 shadow-lg self-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={subject.cover.url} alt={subject.title} className="w-full h-auto object-cover" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{subject?.title}</h1>

            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
              {releaseYear && (
                <span className="text-sm text-zinc-400">{releaseYear}</span>
              )}
              {subject?.imdbRatingValue && parseFloat(subject.imdbRatingValue) > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm text-zinc-300 font-medium">{subject.imdbRatingValue}</span>
                  <span className="text-xs text-zinc-500">IMDb</span>
                </div>
              )}
              {subject?.countryName && (
                <div className="flex items-center gap-1 text-zinc-400 text-sm">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{subject.countryName}</span>
                </div>
              )}
              {isSeries && (
                <span className="text-xs px-2 py-0.5 bg-red-600/20 text-red-400 rounded-full border border-red-600/30">
                  Series · S{effectiveSeason} E{effectiveEpisode}
                </span>
              )}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {genres.map((g) => (
                  <span key={g} className="text-xs px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-full">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {subject?.description && (
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed line-clamp-4 sm:line-clamp-none">
                {subject.description}
              </p>
            )}

            {/* Directors */}
            {directors.length > 0 && (
              <div className="mt-4">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Sutradara</span>
                <p className="mt-1 text-sm text-zinc-300">{directors.map((d) => d.name).join(', ')}</p>
              </div>
            )}

            {/* Cast */}
            {cast.length > 0 && (
              <div className="mt-4">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Pemeran</span>
                <p className="mt-1 text-sm text-zinc-300">{cast.map((c) => c.name).join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center"><Loader2 className="w-10 h-10 text-red-600 animate-spin" /></div>}>
      <WatchContent />
    </Suspense>
  );
}
