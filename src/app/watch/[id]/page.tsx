'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useMovieBoxDetail, useMovieBoxPlaybackUrl, useMovieBoxPlayerMetadata } from '@/hooks/useMovieBox';
import { MoviePlayer } from '@/components/player/MoviePlayer';
import { useMovieBoxWatchHistory } from '@/hooks/useMovieBoxWatchHistory';
import { useWatchParty } from '@/hooks/useWatchParty';
import { useWatchPartyStore } from '@/stores/watchPartyStore';
import { WatchPartyPanel } from '@/components/party/WatchPartyPanel';
import { WatchPartyControls } from '@/components/party/WatchPartyControls';
import { WatchPartyJoinModal } from '@/components/party/WatchPartyJoinModal';
import { WatchPartyReactions } from '@/components/party/WatchPartyReactions';
import { Loader2, AlertCircle, Film, X, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCachedSubtitleBlobUrl } from '@/lib/subtitleCache';

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
  const [subtitlePosition, setSubtitlePosition] = useState(84);
  const [translatedSynopsis, setTranslatedSynopsis] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showResumeToast, setShowResumeToast] = useState(true);

  // Video Ref for Player & Watch Party Synchronization
  const videoRef = useRef<HTMLVideoElement>(null);

  const partyParam = searchParams.get('party');

  const handleRemoteMediaChange = useCallback(
    (data: { subjectId: string; season: number; episode: number; title: string }) => {
      const urlParams = new URLSearchParams();
      if (partyParam) urlParams.set('party', partyParam);
      if (data.season > 0) urlParams.set('season', String(data.season));
      if (data.episode > 0) urlParams.set('episode', String(data.episode));
      router.replace(`/watch/${data.subjectId}?${urlParams.toString()}`);
    },
    [partyParam, router],
  );

  // Watch Party Hook
  const {
    createRoom,
    joinRoom,
    leaveRoom,
    sendChat,
    sendReaction,
    kickUser,
    notifyBuffering,
    changeMedia,
    uploadStreamPayload,
    streamPayload,
    isHost,
    onPartyPlay,
    onPartyPause,
    onPartySeek,
    isInParty,
  } = useWatchParty(videoRef, {
    subjectId,
    season: effectiveSeason,
    episode: effectiveEpisode,
    partyCode: partyParam,
    onRemoteMediaChange: handleRemoteMediaChange,
  });

  const [partyModalState, setPartyModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'join';
    code?: string;
  }>({
    isOpen: false,
    mode: 'join',
    code: partyParam || undefined,
  });

  useEffect(() => {
    if (!partyParam || isInParty) return;

    let savedName = '';
    try {
      const saved = localStorage.getItem('nobarfilm_party_guest');
      if (saved) savedName = JSON.parse(saved).displayName || '';
    } catch {}

    // 1. Direct room creation intent from detail page
    if (partyParam === 'create') {
      if (savedName.trim()) {
        createRoom(savedName.trim()).then((code) => {
          if (code) {
            const url = new URL(window.location.href);
            url.searchParams.set('party', code);
            router.replace(url.pathname + url.search);
          }
        });
      } else {
        setPartyModalState({
          isOpen: true,
          mode: 'create',
        });
      }
      return;
    }

    // 2. Joining an existing room by code
    const cleanCode = partyParam.trim().toUpperCase();
    let isCreator = false;
    try {
      isCreator = sessionStorage.getItem(`nobarfilm_host_${cleanCode}`) === 'true';
    } catch {}

    if (isCreator && savedName.trim()) {
      joinRoom(cleanCode, savedName.trim()).then((ok) => {
        if (ok) {
          useWatchPartyStore.getState().setPanelOpen(true);
        }
      });
    } else {
      setPartyModalState({
        isOpen: true,
        mode: 'join',
        code: cleanCode,
      });
    }
  }, [partyParam, isInParty, createRoom, joinRoom, router]);

  const handleLeaveParty = useCallback(() => {
    leaveRoom();
    if (partyParam) {
      try {
        sessionStorage.removeItem(`nobarfilm_host_${partyParam}`);
      } catch {}
    }
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('party');
      router.replace(url.pathname + (url.search ? url.search : ''));
    }
  }, [leaveRoom, partyParam, router]);

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

  // Auto-hide resume toast quickly after 2.5 seconds for a clean, non-intrusive UX
  useEffect(() => {
    if (showResumeToast && resumeTime > 5) {
      const timer = setTimeout(() => {
        setShowResumeToast(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showResumeToast, resumeTime]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement) {
        setShowResumeToast(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

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
      if (typeof nextEpisode === 'number') params.set('episode', String(nextEpisode));
      const paramStr = params.toString();
      router.replace(`/watch/${subjectId}${paramStr ? `?${paramStr}` : ''}`);
    }
  }, [episode, isSeries, playerMetadata, router, season, subjectId]);

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
    if (filteredCaptions && filteredCaptions.length > 0) {
      let preferredLang = 'indonesia';
      if (typeof window !== 'undefined') {
        const savedPref = localStorage.getItem('nobarfilm_pref_sub_lang');
        if (savedPref) preferredLang = savedPref.toLowerCase();
      }

      if (preferredLang === 'off') {
        setSelectedSubtitleIndex(null);
        return;
      }

      // Try preferred language match in filteredCaptions
      let matchedIdx = filteredCaptions.findIndex((c) => {
        const name = (c.lanName || '').toLowerCase();
        const code = (c.lan || '').toLowerCase();
        return name.includes(preferredLang) || code.includes(preferredLang);
      });

      // Fallback 1: Indonesian
      if (matchedIdx === -1) {
        matchedIdx = filteredCaptions.findIndex(
          (c) => (c.lanName || '').toLowerCase().includes('indonesia') || (c.lan || '').toLowerCase().includes('id')
        );
      }

      // Fallback 2: English
      if (matchedIdx === -1) {
        matchedIdx = filteredCaptions.findIndex(
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
    } else if (filteredCaptions && filteredCaptions[idx]) {
      const cap = filteredCaptions[idx];
      const langKey = (cap.lanName || cap.lan || 'indonesia').toLowerCase();
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'nobarfilm_pref_sub_lang',
          langKey.includes('indonesia') || langKey.includes('id')
            ? 'indonesia'
            : langKey.includes('english') || langKey.includes('en')
            ? 'english'
            : langKey
        );
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

  const { saveProgress, saveProgressSync } = useMovieBoxWatchHistory({
    subjectId,
    subjectType: subject?.subjectType || 1,
    title: subject?.title || '',
    coverUrl: subject?.cover?.url,
    currentSeason: effectiveSeason,
    currentEpisode: effectiveEpisode,
    totalEpisodes: availableEpisodes.length > 0 ? availableEpisodes.length : undefined,
  });

  const lastProgressRef = useRef<{ time: number; duration: number }>({ time: 0, duration: 0 });

  const handleProgress = useCallback(
    (time: number, duration: number) => {
      lastProgressRef.current = { time, duration };
      // Bypass upstream watch history sync when in party mode
      if (!isInParty && time > 3 && duration > 0) {
        saveProgress(time, duration);
      }
    },
    [isInParty, saveProgress],
  );

  const lastUploadedStreamUrlRef = useRef<string>('');

  // Host uploads stream payload to the room so guests load with 0 upstream API requests
  useEffect(() => {
    if (
      isInParty &&
      isHost &&
      playbackData?.streamUrl &&
      lastUploadedStreamUrlRef.current !== playbackData.streamUrl
    ) {
      lastUploadedStreamUrlRef.current = playbackData.streamUrl;
      uploadStreamPayload({
        streamUrl: playbackData.streamUrl,
        qualities: (playbackData.allDownloads || []).map((q) => ({
          label: `${q.resolution}p`,
          url: q.streamUrl,
          quality: q.resolution,
        })),
        subtitles: formattedSubtitles,
      });
    }
  }, [isInParty, isHost, playbackData?.streamUrl, formattedSubtitles, uploadStreamPayload]);

  const effectiveStreamUrl = useMemo(() => {
    if (isInParty && !isHost && streamPayload?.streamUrl) {
      if (qualityIndex === -1) return streamPayload.streamUrl;
      return streamPayload.qualities?.[qualityIndex]?.url || streamPayload.streamUrl;
    }
    if (!playbackData) return '';
    if (qualityIndex === -1) return playbackData.streamUrl;
    return playbackData.allDownloads?.[qualityIndex]?.streamUrl || playbackData.streamUrl;
  }, [isInParty, isHost, streamPayload, playbackData, qualityIndex]);

  const effectiveQualities = useMemo(() => {
    if (isInParty && !isHost && streamPayload?.qualities && streamPayload.qualities.length > 0) {
      return streamPayload.qualities.map((item: any) => item.quality || item.resolution || parseInt(item.label) || 720);
    }
    return availableQualities;
  }, [isInParty, isHost, streamPayload, availableQualities]);

  const isInitialLoading = !detail && (isLoadingDetail || isLoadingMetadata);
  const isDetailError = detailError || (!isLoadingDetail && !detail);

  if (isInitialLoading) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center p-4 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-sm shadow-2xl">
          <svg
            className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-white/80"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="24"
              cy="24"
              r="19"
              stroke="currentColor"
              strokeWidth="2.5"
              className="opacity-15"
            />
            <path
              d="M24 5C13.5066 5 5 13.5066 5 24"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="opacity-90"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (isDetailError) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center px-6 text-center gap-4">
        <AlertCircle className="w-14 h-14 text-red-600" />
        <h1 className="text-xl text-white font-bold">Tidak dapat memutar konten</h1>
        <p className="text-zinc-400 max-w-md text-sm">{detailError?.message || 'Konten tidak ditemukan atau sumber tidak tersedia.'}</p>
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
    const { time, duration } = lastProgressRef.current;
    if (time > 3 && duration > 0) {
      saveProgressSync(time, duration);
    }
    lastProgressRef.current = { time: 0, duration: 0 };
    setQualityIndex(0);
    const nextEp = effectiveEpisode + 1;
    if (isInParty && useWatchPartyStore.getState().isHost) {
      changeMedia(subjectId, effectiveSeason, nextEp, subject?.title || '');
    }
    const params = new URLSearchParams();
    if (partyParam) params.set('party', partyParam);
    if (typeof effectiveSeason === 'number') params.set('season', String(effectiveSeason));
    params.set('episode', String(nextEp));
    router.replace(`/watch/${subjectId}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white flex flex-col overflow-x-hidden">
      {/* Video Player Container - 16:9 on Mobile, Immersive Theater View (85vh-92vh) on Desktop */}
      <div className="w-full aspect-video sm:h-[82vh] lg:h-[88vh] 2xl:h-[92vh] max-h-[92vh] bg-black relative flex flex-col lg:flex-row items-center justify-center overflow-hidden shrink-0 shadow-2xl z-20">
        <div className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden">
          <MoviePlayer
            ref={videoRef}
            src={effectiveStreamUrl}
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
              if (hasNextEpisode && (!isInParty || isHost)) handleNextEpisode();
            }}
            qualities={effectiveQualities}
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
              if (isInParty && !isHost) {
                toast('Hanya Host yang dapat mengganti season', { icon: '👑' });
                return;
              }
              const { time, duration } = lastProgressRef.current;
              if (!isInParty && time > 3 && duration > 0) {
                saveProgressSync(time, duration);
              }
              lastProgressRef.current = { time: 0, duration: 0 };
              setQualityIndex(0);
              if (isInParty && isHost) {
                changeMedia(subjectId, s, 1, subject?.title || '');
              }
              const params = new URLSearchParams();
              if (partyParam) params.set('party', partyParam);
              params.set('season', String(s));
              params.set('episode', '1');
              router.replace(`/watch/${subjectId}?${params.toString()}`);
            }}
            onEpisodeChange={(e: number) => {
              if (isInParty && !isHost) {
                toast('Hanya Host yang dapat mengganti episode', { icon: '👑' });
                return;
              }
              const { time, duration } = lastProgressRef.current;
              if (!isInParty && time > 3 && duration > 0) {
                saveProgressSync(time, duration);
              }
              lastProgressRef.current = { time: 0, duration: 0 };
              setQualityIndex(0);
              if (isInParty && isHost) {
                changeMedia(subjectId, effectiveSeason, e, subject?.title || '');
              }
              const params = new URLSearchParams();
              if (partyParam) params.set('party', partyParam);
              if (typeof effectiveSeason === 'number') params.set('season', String(effectiveSeason));
              params.set('episode', String(e));
              router.replace(`/watch/${subjectId}?${params.toString()}`);
            }}
            onBack={() => {
              const { time, duration } = lastProgressRef.current;
              if (!isInParty && time > 3 && duration > 0) {
                saveProgressSync(time, duration);
              }
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push(`/${subjectId}`);
              }
            }}
            isInParty={isInParty}
            onPartyPlay={onPartyPlay}
            onPartyPause={onPartyPause}
            onPartySeek={onPartySeek}
            onPartyBuffering={notifyBuffering}
            partySlot={
              <WatchPartyControls
                onOpenCreateModal={() =>
                  setPartyModalState({ isOpen: true, mode: 'create' })
                }
              />
            }
          >
            <WatchPartyReactions />
          </MoviePlayer>
        </div>

        {/* Watch Party Side Panel */}
        <WatchPartyPanel
          onSendChat={sendChat}
          onSendReaction={sendReaction}
          onLeaveRoom={handleLeaveParty}
          onKickUser={kickUser}
        />
      </div>

      {/* Watch Party Join / Create Modal */}
      <WatchPartyJoinModal
        isOpen={partyModalState.isOpen}
        onClose={() => setPartyModalState((prev) => ({ ...prev, isOpen: false }))}
        mode={partyModalState.mode}
        joinCode={partyModalState.code}
        onJoin={joinRoom}
        onCreate={createRoom}
        movieTitle={subject?.title}
      />

      {/* Film Information & Synopsis Panel (Below Player) */}
      <div className="max-w-5xl mx-auto w-full p-4 sm:p-8 lg:p-10 space-y-6">
        {/* Header & Badges */}
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            {subject?.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-400">
            {releaseYear && <span>{releaseYear}</span>}
            {!!subject?.duration && subject.duration > 0 && <span>{Math.floor(subject.duration / 60)}m</span>}
            {genres.map((g, i) => (
              <span key={i} className="bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">
                {g}
              </span>
            ))}
          </div>
        </div>


        {/* Synopsis & Translation */}
        {subject?.description && (
          <div className="bg-zinc-900/50 border border-zinc-850 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-zinc-200 uppercase tracking-wider">
                Sinopsis
              </h2>
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
                    toast.error('Gagal menerjemahkan sinopsis');
                  } finally {
                    setIsTranslating(false);
                  }
                }}
                disabled={isTranslating}
                className="text-xs font-semibold px-3 py-1 rounded-lg border border-red-500/40 bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Globe className="w-3.5 h-3.5" />
                {isTranslating ? 'Menerjemahkan...' : translatedSynopsis ? 'Teks Asli' : 'Terjemahkan'}
              </button>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {translatedSynopsis || subject.description}
            </p>
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
