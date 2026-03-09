'use client';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useMovieBoxDetail, useMovieBoxPlaybackUrl } from '@/hooks/useMovieBox';
import { MoviePlayer } from '@/components/player/MoviePlayer';
import { useMovieBoxWatchHistory } from '@/hooks/useMovieBoxWatchHistory';
import { ArrowLeft, Loader2, AlertCircle, Star, Globe, Film } from 'lucide-react';
import { Suspense, useCallback, useRef } from 'react';

function WatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const subjectId = params.id as string;

  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');
  const resumeTimeParam = searchParams.get('t');

  // Parse params: season=0&episode=0 for movies, season=1&episode=1 for series
  const season = seasonParam !== null ? parseInt(seasonParam) : undefined;
  const episode = episodeParam !== null ? parseInt(episodeParam) : undefined;
  const resumeTime = resumeTimeParam ? parseInt(resumeTimeParam) : 0;

  const { data: detail, isLoading: isLoadingDetail, error: detailError } = useMovieBoxDetail(subjectId);

  const isSeries = detail?.subject?.subjectType === 2;
  // For series: use provided season/episode or default to S1E1
  // For movies: use provided params (season=0,episode=0) or no season/episode for API
  const effectiveSeason = isSeries ? (season ?? 1) : (season === 0 ? 0 : undefined);
  const effectiveEpisode = isSeries ? (episode ?? 1) : (episode === 0 ? 0 : undefined);

  const {
    data: playbackData,
    isLoading: isLoadingPlayback,
    error: playbackError,
  } = useMovieBoxPlaybackUrl(subjectId, effectiveSeason, effectiveEpisode, 0, {
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

  if (isLoading) {
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
        <button onClick={() => router.back()} className="mt-2 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-sm transition">
          Kembali
        </button>
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
            poster={subject?.cover?.url}
            autoPlay
            initialTime={resumeTime}
            subtitles={playbackData.captions?.map((cap) => ({
              kind: 'subtitles',
              label: cap.lanName || cap.lan,
              srcLang: cap.lan,
              src: cap.url,
              default: cap.lan === 'en',
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
