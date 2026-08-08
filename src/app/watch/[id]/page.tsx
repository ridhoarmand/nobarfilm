'use client';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useMovieBoxDetail, useMovieBoxPlaybackUrl, useMovieBoxPlayerMetadata } from '@/hooks/useMovieBox';
import { MoviePlayer } from '@/components/player/MoviePlayer';
import { useMovieBoxWatchHistory } from '@/hooks/useMovieBoxWatchHistory';
import { ArrowLeft, Loader2, AlertCircle, Star, Globe, Film, Volume2, MessageSquare, Sliders, Tv, Check, Download, Search, Clock } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SubtitleModal } from '@/components/player/SubtitleModal';

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
  
  const [qualityIndex, setQualityIndex] = useState(0);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(0);
  const [isSubtitleModalOpen, setIsSubtitleModalOpen] = useState(false);
  const [customSubtitles, setCustomSubtitles] = useState<Array<{ label: string; src: string }>>([]);

  const { data: detail, isLoading: isLoadingDetail, error: detailError } = useMovieBoxDetail(subjectId);

  const isSeries = detail?.subject?.subjectType === 2;
  const effectiveSeason = isSeries ? (season ?? 1) : 0;
  const effectiveEpisode = isSeries ? (episode ?? 1) : 0;

  const {
    data: playerMetadata,
    isLoading: isLoadingMetadata,
  } = useMovieBoxPlayerMetadata(subjectId, effectiveSeason, effectiveEpisode, {
    enabled: !!subjectId && !isLoadingDetail,
  });

  const [subtitleDelay, setSubtitleDelay] = useState(0);
  const [subtitlePosition, setSubtitlePosition] = useState(85);
  const [translatedSynopsis, setTranslatedSynopsis] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const availableSeasons = useMemo(() => playerMetadata?.seasons || [], [playerMetadata]);
  const availableEpisodes = useMemo(() => playerMetadata?.episodes || [], [playerMetadata]);
  const availableQualities = useMemo(() => playerMetadata?.qualities || [], [playerMetadata]);
  const audioOptions = useMemo(() => playerMetadata?.audioOptions || [], [playerMetadata]);

  // Audio Filter: Original & Indonesian only
  const filteredAudioOptions = useMemo(() => {
    return audioOptions.filter((opt) => {
      const label = (opt.label || '').toLowerCase();
      return label.includes('original') || label.includes('indonesia');
    });
  }, [audioOptions]);

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

  useEffect(() => {
    if (!isSeries || !playerMetadata?.selected) return;
    const nextSeason = playerMetadata.selected.season;
    const nextEpisode = playerMetadata.selected.episode;
    if (season !== nextSeason || episode !== nextEpisode) {
      const params = new URLSearchParams();
      if (typeof nextSeason === 'number') params.set('season', String(nextSeason));
      if (resumeTime > 0) params.set('t', String(resumeTime));
      const paramStr = params.toString();
      router.replace(`/watch/${subjectId}${paramStr ? `?${paramStr}` : ''}`);
    }
  }, [episode, isSeries, playerMetadata, resumeTime, router, season, subjectId]);

  const {
    data: playbackData,
    isLoading: isLoadingPlayback,
    error: playbackError,
  } = useMovieBoxPlaybackUrl(subjectId, effectiveSeason, effectiveEpisode, qualityIndex, {
    enabled: !!subjectId && !isLoadingDetail,
  });

  // Subtitle Filter: English & Indonesian only
  const filteredCaptions = useMemo(() => {
    const raw = playbackData?.captions || [];
    return raw.filter((cap) => {
      const name = (cap.lanName || '').toLowerCase();
      const code = (cap.lan || '').toLowerCase();
      return name.includes('indonesia') || code.includes('id') || name.includes('english') || code.includes('en');
    });
  }, [playbackData?.captions]);

  // Auto-select Indonesian subtitle (in_id, id, indonesia) as default subtitle
  useEffect(() => {
    if (playbackData?.captions && playbackData.captions.length > 0) {
      const idIdx = playbackData.captions.findIndex(
        (c) => (c.lanName || '').toLowerCase().includes('indonesia') || (c.lan || '').toLowerCase().includes('id')
      );
      queueMicrotask(() => {
        if (idIdx !== -1) {
          setSelectedSubtitleIndex(idIdx);
        } else {
          setSelectedSubtitleIndex(0);
        }
      });
    }
  }, [playbackData?.captions]);

  const formattedSubtitles = useMemo(() => {
    const builtInSubs = filteredCaptions.map((cap) => ({
      kind: 'subtitles',
      label: cap.lanName || cap.lan,
      srcLang: cap.lan,
      src: `/api/subtitle?url=${encodeURIComponent(cap.url)}`,
      default: false,
    }));

    const uploadedSubs = customSubtitles.map((custom) => ({
      kind: 'subtitles',
      label: custom.label,
      srcLang: 'custom',
      src: custom.src,
      default: false,
    }));

    return [...builtInSubs, ...uploadedSubs];
  }, [filteredCaptions, customSubtitles]);

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
            subtitles={formattedSubtitles}
            activeSubtitleIndex={selectedSubtitleIndex}
            subtitleDelay={subtitleDelay}
            subtitlePosition={subtitlePosition}
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

      {/* Control Panel: User-Friendly Dropdowns & Subtitle Controls */}
      {(playerMetadata || playbackData) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-md space-y-5">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Pengaturan Media & Player</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSubtitleModalOpen(true)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border border-red-500/40 bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  Cari / Upload Subtitle...
                </button>
              </div>
            </div>

            {/* Grid 1: Media Selectors (Subtitle, Audio, Quality, Season, Episode) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Subtitle Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-red-500" /> Subtitle
                </label>
                <select
                  value={selectedSubtitleIndex === null ? 'off' : selectedSubtitleIndex}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedSubtitleIndex(val === 'off' ? null : parseInt(val, 10));
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-red-500 transition-all cursor-pointer shadow-inner"
                >
                  <option value="off">🚫 Matikan Subtitle</option>
                  {filteredCaptions.map((cap, idx) => (
                    <option key={cap.id || idx} value={idx}>
                      💬 {cap.lanName || cap.lan}
                    </option>
                  ))}
                  {customSubtitles.map((custom, idx) => (
                    <option key={`custom-${idx}`} value={filteredCaptions.length + idx}>
                      📁 {custom.label} (Custom Upload)
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Audio Dropdown */}
              {filteredAudioOptions.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-red-500" /> Audio / Dubbing
                  </label>
                  <select
                    value={audioIndex}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value, 10);
                      const targetAudio = filteredAudioOptions[idx];
                      if (targetAudio) handleAudioChange(targetAudio.code);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-red-500 transition-all cursor-pointer shadow-inner"
                  >
                    {filteredAudioOptions.map((item, idx) => (
                      <option key={item.code} value={idx}>
                        🔊 {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Resolution Dropdown */}
              {availableQualities.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-red-500" /> Resolusi Video
                  </label>
                  <select
                    value={qualityIndex}
                    onChange={(e) => setQualityIndex(parseInt(e.target.value, 10))}
                    className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-red-500 transition-all cursor-pointer shadow-inner"
                  >
                    {availableQualities.map((item, idx) => (
                      <option key={item} value={idx}>
                        📺 {item}p {item >= 720 ? '(HD WEB-DL)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 4. Season Dropdown (Series) */}
              {isSeries && availableSeasons.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-red-500" /> Season
                  </label>
                  <select
                    value={effectiveSeason}
                    onChange={(e) => {
                      setQualityIndex(0);
                      const params = new URLSearchParams(searchParams.toString());
                      params.set('season', e.target.value);
                      params.set('episode', '1');
                      router.replace(`/watch/${subjectId}?${params.toString()}`);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-red-500 transition-all cursor-pointer shadow-inner"
                  >
                    {availableSeasons.map((item) => (
                      <option key={item} value={item}>
                        Season {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 5. Episode Dropdown (Series) */}
              {isSeries && availableEpisodes.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-red-500" /> Episode
                  </label>
                  <select
                    value={effectiveEpisode}
                    onChange={(e) => {
                      setQualityIndex(0);
                      const params = new URLSearchParams(searchParams.toString());
                      params.set('episode', e.target.value);
                      router.replace(`/watch/${subjectId}?${params.toString()}`);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-red-500 transition-all cursor-pointer shadow-inner"
                  >
                    {availableEpisodes.map((item) => (
                      <option key={item} value={item}>
                        Episode {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Grid 2: Subtitle Controls (Delay & Position) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/60">
              {/* Subtitle Sync Delay */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-red-500" /> Kecepatan / Delay Subtitle (Sync)
                </label>
                <select
                  value={subtitleDelay}
                  onChange={(e) => setSubtitleDelay(parseFloat(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-white rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-red-500 transition-all cursor-pointer shadow-inner"
                >
                  <option value={-5}>⚡ -5.0s (Lebih Cepat 5 Detik)</option>
                  <option value={-3}>⚡ -3.0s (Lebih Cepat 3 Detik)</option>
                  <option value={-2}>⚡ -2.0s (Lebih Cepat 2 Detik)</option>
                  <option value={-1}>⚡ -1.0s (Lebih Cepat 1 Detik)</option>
                  <option value={-0.5}>⚡ -0.5s (Lebih Cepat 0.5 Detik)</option>
                  <option value={0}>⏱️ 0.0s (Normal / Default)</option>
                  <option value={0.5}>🐢 +0.5s (Lambat 0.5 Detik)</option>
                  <option value={1}>🐢 +1.0s (Lambat 1 Detik)</option>
                  <option value={2}>🐢 +2.0s (Lambat 2 Detik)</option>
                  <option value={3}>🐢 +3.0s (Lambat 3 Detik)</option>
                  <option value={5}>🐢 +5.0s (Lambat 5 Detik)</option>
                </select>
              </div>

              {/* Subtitle Vertical Position */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-red-500" /> Posisi Ketinggian Subtitle
                </label>
                <select
                  value={subtitlePosition}
                  onChange={(e) => setSubtitlePosition(parseInt(e.target.value, 10))}
                  className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-white rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-red-500 transition-all cursor-pointer shadow-inner"
                >
                  <option value={90}>⬇️ Sangat Bawah (90%)</option>
                  <option value={85}>📍 Bawah Normal (85%)</option>
                  <option value={75}>⬆️ Sedikit Ke Atas (75%)</option>
                  <option value={20}>🔝 Posisi Atas (20%)</option>
                </select>
              </div>
            </div>

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
              <span className="text-xs px-2 py-0.5 bg-red-600/90 text-white font-extrabold rounded">WEB-DL 1080p</span>
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

            {/* Description & Translation */}
            {subject?.description && (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Sinopsis</span>
                  <button
                    onClick={async () => {
                      if (translatedSynopsis) {
                        setTranslatedSynopsis(null);
                        return;
                      }
                      try {
                        setIsTranslating(true);
                        const res = await fetch('/api/translate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ text: subject.description }),
                        });
                        const data = await res.json();
                        if (data.translatedText) {
                          setTranslatedSynopsis(data.translatedText);
                        }
                      } catch (e) {
                        console.error('Translation error:', e);
                      } finally {
                        setIsTranslating(false);
                      }
                    }}
                    disabled={isTranslating}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-red-500/40 bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-white transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Globe className="w-3 h-3" />
                    {isTranslating ? 'Menerjemahkan...' : translatedSynopsis ? 'Lihat Teks Asli' : 'Terjemahkan ke Indonesia'}
                  </button>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {translatedSynopsis || subject.description}
                </p>
              </div>
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

      {/* Subtitle Search & Upload Modal */}
      <SubtitleModal
        isOpen={isSubtitleModalOpen}
        onClose={() => setIsSubtitleModalOpen(false)}
        title={subject?.title || 'Film'}
        captions={playbackData?.captions || []}
        selectedIndex={selectedSubtitleIndex}
        onSelectSubtitle={(idx) => setSelectedSubtitleIndex(idx)}
        onCustomSubtitleUpload={(newSub) => {
          const newIdx = (playbackData?.captions?.length || 0) + customSubtitles.length;
          setCustomSubtitles((prev) => [...prev, newSub]);
          setSelectedSubtitleIndex(newIdx);
        }}
        customSubtitles={customSubtitles}
      />
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
