'use client';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useMovieBoxDetail, useMovieBoxPlaybackUrl, useMovieBoxPlayerMetadata } from '@/hooks/useMovieBox';
import { MoviePlayer } from '@/components/player/MoviePlayer';
import { useMovieBoxWatchHistory } from '@/hooks/useMovieBoxWatchHistory';
import { Loader2, AlertCircle, Film, X } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SubtitleModal } from '@/components/player/SubtitleModal';
import { getCachedSubtitleBlobUrl, cleanSubtitleCache } from '@/lib/subtitleCache';

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
  
  const [qualityIndex, setQualityIndex] = useState(-1);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(null);
  const pendingSubtitleRef = useRef<number | null>(null);
  const [cachedSubtitleUrls, setCachedSubtitleUrls] = useState<Record<string, string>>({});
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
  const [subtitlePosition, setSubtitlePosition] = useState(75);
  const [translatedSynopsis, setTranslatedSynopsis] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showResumeToast, setShowResumeToast] = useState(true);
  const [isAdvancedSubtitleOpen, setIsAdvancedSubtitleOpen] = useState(false);

  const availableSeasons = useMemo(() => playerMetadata?.seasons || [], [playerMetadata]);
  const availableEpisodes = useMemo(() => playerMetadata?.episodes || [], [playerMetadata]);
  const audioOptions = useMemo(() => playerMetadata?.audioOptions || [], [playerMetadata]);

  // Audio Filter: Ensure audio options are always available
  const filteredAudioOptions = useMemo(() => {
    if (!audioOptions || audioOptions.length === 0) {
      return [{ code: subjectId, label: 'Suara Utama (Original Audio)' }];
    }
    return audioOptions;
  }, [audioOptions, subjectId]);

  // Auto-hide resume toast after 4 seconds for a clean UX
  useEffect(() => {
    if (showResumeToast && resumeTime > 5) {
      const timer = setTimeout(() => {
        setShowResumeToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showResumeToast, resumeTime]);

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

  const availableQualities = useMemo(() => {
    if (playbackData?.allDownloads && playbackData.allDownloads.length > 0) {
      return playbackData.allDownloads.map((item) => item.resolution);
    }
    return playerMetadata?.qualities || [];
  }, [playbackData?.allDownloads, playerMetadata?.qualities]);

  // Cleanly filter captions to Indonesian and English only to avoid clutter
  const filteredCaptions = useMemo(() => {
    const raw = playbackData?.captions || [];
    const mainList = raw.filter((c) => {
      const name = (c.lanName || c.lan || '').toLowerCase();
      const isIndo = name.includes('indonesia') || name.includes('id');
      const isEng = name.includes('english') || name.includes('en');
      return isIndo || isEng;
    });
    return mainList.length > 0 ? mainList : raw;
  }, [playbackData?.captions]);

  const captionUrlsKey = useMemo(() => {
    return filteredCaptions.map((c) => c.url).join('|');
  }, [filteredCaptions]);

  // Request a subtitle switch: fetch the target subtitle content FIRST,
  // then swap the active track once it is ready. This avoids the blink/flicker
  // when switching languages (old sub stays until the new one has loaded).
  const requestSubtitle = useCallback(
    async (idx: number | null) => {
      pendingSubtitleRef.current = idx;

      if (idx === null) {
        setSelectedSubtitleIndex(null);
        return;
      }

      const cap = filteredCaptions[idx];
      if (!cap?.url) {
        setSelectedSubtitleIndex(idx);
        return;
      }

      // Already cached -> switch instantly without any transition gap
      if (cachedSubtitleUrls[cap.url]) {
        setSelectedSubtitleIndex(idx);
        return;
      }

      // Otherwise fetch the subtitle content before switching
      try {
        const blobUrl = await getCachedSubtitleBlobUrl(cap.url);
        // Ignore stale requests if user switched again while this was loading
        if (pendingSubtitleRef.current !== idx) return;
        if (blobUrl) {
          setCachedSubtitleUrls((prev) => ({ ...prev, [cap.url]: blobUrl }));
        }
        setSelectedSubtitleIndex(idx);
      } catch (e) {
        console.error('[Subtitle] Active load error:', e);
        if (pendingSubtitleRef.current !== idx) return;
        setSelectedSubtitleIndex(idx);
      }
    },
    [filteredCaptions, cachedSubtitleUrls]
  );

  // Auto-select subtitle based on user preference (stored in localStorage), fallback to Indonesian -> English -> First available
  useEffect(() => {
    if (playbackData?.captions && playbackData.captions.length > 0) {
      let preferredLang = 'indonesia';
      if (typeof window !== 'undefined') {
        const savedPref = localStorage.getItem('nobarfilm_pref_sub_lang');
        if (savedPref) preferredLang = savedPref.toLowerCase();
      }

      // Try preferred language match
      let matchedIdx = playbackData.captions.findIndex((c) => {
        const name = (c.lanName || '').toLowerCase();
        const code = (c.lan || '').toLowerCase();
        return name.includes(preferredLang) || code.includes(preferredLang);
      });

      // Fallback 1: Indonesian
      if (matchedIdx === -1) {
        matchedIdx = playbackData.captions.findIndex(
          (c) => (c.lanName || '').toLowerCase().includes('indonesia') || (c.lan || '').toLowerCase().includes('id')
        );
      }

      // Fallback 2: English
      if (matchedIdx === -1) {
        matchedIdx = playbackData.captions.findIndex(
          (c) => (c.lanName || '').toLowerCase().includes('english') || (c.lan || '').toLowerCase().includes('en')
        );
      }

      // Fallback 3: First available caption
      const finalIdx = matchedIdx !== -1 ? matchedIdx : 0;
      requestSubtitle(finalIdx);
    }
  }, [captionUrlsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handler for subtitle selection that persists user's language choice
  const handleSubtitleSelect = (idx: number | null) => {
    requestSubtitle(idx);
    if (idx === null) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('nobarfilm_pref_sub_lang', 'off');
      }
    } else if (playbackData?.captions && playbackData.captions[idx]) {
      const cap = playbackData.captions[idx];
      const langKey = (cap.lanName || cap.lan || 'indonesia').toLowerCase();
      if (typeof window !== 'undefined') {
        localStorage.setItem('nobarfilm_pref_sub_lang', langKey.includes('indonesia') || langKey.includes('id') ? 'indonesia' : langKey.includes('english') || langKey.includes('en') ? 'english' : langKey);
      }
    }
  };

  const formattedSubtitles = useMemo(() => {
    const builtInSubs = filteredCaptions.map((cap) => ({
      kind: 'subtitles',
      label: cap.lanName || cap.lan,
      srcLang: cap.lan,
      src: cachedSubtitleUrls[cap.url] || `/api/subtitle?url=${encodeURIComponent(cap.url)}`,
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
  }, [filteredCaptions, customSubtitles, cachedSubtitleUrls]);

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

  const activeStreamUrl = useMemo(() => {
    if (!playbackData) return '';
    if (qualityIndex === -1) return playbackData.streamUrl;
    return playbackData.allDownloads?.[qualityIndex]?.streamUrl || playbackData.streamUrl;
  }, [playbackData, qualityIndex]);

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

  const hasNextEpisode = isSeries && availableEpisodes.length > 0 && effectiveEpisode < availableEpisodes.length;

  const handleNextEpisode = () => {
    if (!hasNextEpisode) return;
    setQualityIndex(0);
    const params = new URLSearchParams(searchParams.toString());
    params.set('episode', String(effectiveEpisode + 1));
    router.replace(`/watch/${subjectId}?${params.toString()}`);
  };

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative flex flex-col justify-center">
      {/* Pure Full-Bleed Player Container */}
      <div className="w-full h-full bg-black flex items-center justify-center">
        {playbackData?.streamUrl ? (
          <MoviePlayer
            src={activeStreamUrl || playbackData.streamUrl}
            title={displayTitle}
            poster={subject?.coverHorizontalUrl || subject?.cover?.url}
            autoPlay
            initialTime={resumeTime}
            subtitles={formattedSubtitles}
            activeSubtitleIndex={selectedSubtitleIndex}
            onSubtitleSelect={(idx: number | null) => handleSubtitleSelect(idx)}
            subtitleDelay={subtitleDelay}
            onSubtitleDelayChange={(delay: number) => setSubtitleDelay(delay)}
            subtitlePosition={subtitlePosition}
            onSubtitlePositionChange={(pos: number) => setSubtitlePosition(pos)}
            onCustomSubtitleUpload={(customSub: { label: string; src: string }) => {
              setCustomSubtitles((prev) => [...prev, customSub]);
              setSelectedSubtitleIndex(filteredCaptions.length + customSubtitles.length);
            }}
            onProgress={handleProgress}
            hasNextEpisode={hasNextEpisode}
            onNextEpisode={handleNextEpisode}
            onEnded={() => {
              if (hasNextEpisode) handleNextEpisode();
            }}
            qualities={availableQualities}
            activeQualityIndex={qualityIndex}
            onQualityChange={(idx: number) => setQualityIndex(idx)}
            audioOptions={filteredAudioOptions}
            activeAudioCode={subjectId}
            onAudioChange={handleAudioChange}
            isSeries={isSeries}
            seasons={availableSeasons}
            episodes={availableEpisodes}
            activeSeason={effectiveSeason}
            activeEpisode={effectiveEpisode}
            onSeasonChange={(s: number) => {
              setQualityIndex(0);
              const params = new URLSearchParams(searchParams.toString());
              params.set('season', String(s));
              params.set('episode', '1');
              router.replace(`/watch/${subjectId}?${params.toString()}`);
            }}
            onEpisodeChange={(e: number) => {
              setQualityIndex(0);
              const params = new URLSearchParams(searchParams.toString());
              params.set('episode', String(e));
              router.replace(`/watch/${subjectId}?${params.toString()}`);
            }}
            onBack={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.replace(`/${subjectId}`);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-500 bg-black">
            <Film className="w-12 h-12" />
            <p className="text-sm">Sumber video tidak tersedia</p>
          </div>
        )}
      </div>

      {/* Floating Resume Toast Notification */}
      {showResumeToast && resumeTime > 5 && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-zinc-900/95 border border-red-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold">
              Melanjutkan dari {Math.floor(resumeTime / 60)}:{String(Math.floor(resumeTime % 60)).padStart(2, '0')}
            </span>
          </div>
          <button
            onClick={() => {
              const video = document.querySelector('video');
              if (video) video.currentTime = 0;
              setShowResumeToast(false);
            }}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md"
          >
            Putar Awal
          </button>
          <button
            onClick={() => setShowResumeToast(false)}
            className="text-zinc-400 hover:text-white p-0.5"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
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
