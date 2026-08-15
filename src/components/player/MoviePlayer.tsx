'use client';

import React, { useEffect, useRef, forwardRef, useSyncExternalStore, useState } from 'react';
import Hls from 'hls.js';
import { usePlaybackSpeed } from './hooks/usePlaybackSpeed';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { PlayerOverlay } from './PlayerOverlay';

interface MoviePlayerProps {
  src: string;
  title?: string;
  subtitles?: Array<{
    kind: string;
    label: string;
    srcLang: string;
    src: string;
    default?: boolean;
  }>;
  activeSubtitleIndex?: number | null;
  onSubtitleSelect?: (index: number | null) => void;
  subtitleDelay?: number;
  onSubtitleDelayChange?: (delay: number) => void;
  subtitlePosition?: number;
  onSubtitlePositionChange?: (pos: number) => void;
  onCustomSubtitleUpload?: (sub: { label: string; src: string }) => void;
  poster?: string;
  onEnded?: () => void;
  onProgress?: (time: number, duration: number) => void;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  initialTime?: number;
  autoPlay?: boolean;
  // Qualities
  qualities?: number[];
  activeQualityIndex?: number;
  onQualityChange?: (index: number) => void;
  // Audio
  audioOptions?: Array<{ code: string; label: string }>;
  activeAudioCode?: string;
  onAudioChange?: (code: string) => void;
  // Series
  isSeries?: boolean;
  seasons?: number[];
  episodes?: number[];
  activeSeason?: number;
  activeEpisode?: number;
  onSeasonChange?: (season: number) => void;
  onEpisodeChange?: (episode: number) => void;
  onBack?: () => void;
}

export const MoviePlayer = forwardRef<HTMLVideoElement, MoviePlayerProps>(({
  src,
  title,
  subtitles = [],
  activeSubtitleIndex,
  onSubtitleSelect,
  subtitleDelay = 0,
  onSubtitleDelayChange,
  subtitlePosition = 85,
  onSubtitlePositionChange,
  onCustomSubtitleUpload,
  poster,
  onEnded,
  onProgress,
  onNextEpisode,
  hasNextEpisode = false,
  initialTime = 0,
  autoPlay = false,
  qualities = [],
  activeQualityIndex = 0,
  onQualityChange,
  audioOptions = [],
  activeAudioCode,
  onAudioChange,
  isSeries = false,
  seasons = [],
  episodes = [],
  activeSeason = 1,
  activeEpisode = 1,
  onSeasonChange,
  onEpisodeChange,
  onBack,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Playback & player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Client-side detection without SSR mismatch
  const isClient = useSyncExternalStore(() => () => {}, () => true, () => false);

  // Speed persistence hook
  const { speed, setSpeed } = usePlaybackSpeed();

  // Normalize source URL
  const currentSrc = typeof src === 'string' ? src : (src as { src: string }).src;

  // Preserve position when changing resolutions
  const savedTimeRef = useRef<number>(0);

  // Reset playback position when changing episodes or seasons
  const prevEpisodeRef = useRef({ season: activeSeason, episode: activeEpisode });
  useEffect(() => {
    if (
      prevEpisodeRef.current.season !== activeSeason ||
      prevEpisodeRef.current.episode !== activeEpisode
    ) {
      prevEpisodeRef.current = { season: activeSeason, episode: activeEpisode };
      savedTimeRef.current = 0;
      hasResumed.current = false;
      setCurrentTime(0);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    }
  }, [activeSeason, activeEpisode]);

  // Handle native player setup & sync
  const hasResumed = useRef(false);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      if (initialTime > 0 && !hasResumed.current) {
        videoRef.current.currentTime = initialTime;
        hasResumed.current = true;
      }
    }
  }, [speed, initialTime]);

  // Ref to hold current HLS instance for quality control
  const hlsRef = useRef<Hls | null>(null);

  // Handle HLS Quality Level Switching (Auto = -1, Manual = 0,1,2...)
  useEffect(() => {
    if (!hlsRef.current) return;
    if (activeQualityIndex === -1) {
      hlsRef.current.currentLevel = -1; // Auto ABR Mode
    } else if (activeQualityIndex >= 0 && activeQualityIndex < hlsRef.current.levels.length) {
      hlsRef.current.currentLevel = activeQualityIndex;
    }
  }, [activeQualityIndex]);

  const [activeHlsHeight, setActiveHlsHeight] = useState<number | null>(null);

  // Handle stream loading via hls.js (only for .m3u8) with native fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSrc) return;

    const isEpisodeChanged = prevEpisodeRef.current.season !== activeSeason || prevEpisodeRef.current.episode !== activeEpisode;
    if (!isEpisodeChanged && video.currentTime > 0) {
      savedTimeRef.current = video.currentTime;
    }

    const restoreTimeAndPlay = () => {
      if (savedTimeRef.current > 0) {
        video.currentTime = savedTimeRef.current;
      }
      if (autoPlay) {
        video.play().catch(() => {});
      }
    };

    let hls: Hls | null = null;
    const lowerSrc = currentSrc.toLowerCase();
    const isHls = lowerSrc.includes('.m3u8') || lowerSrc.includes('format=m3u8');

    if (isHls && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        capLevelToPlayerSize: true, // YouTube-like optimization: don't load 4K on small screens
      });

      hlsRef.current = hls;

      hls.loadSource(currentSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (activeQualityIndex === -1) {
          hls!.currentLevel = -1;
        }
        restoreTimeAndPlay();
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event: any, data: any) => {
        if (data?.level !== undefined && hls?.levels?.[data.level]) {
          setActiveHlsHeight(hls.levels[data.level].height || null);
        }
      });

      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          if (data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR || data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
            console.warn('[HLS] Stream is not HLS manifest, falling back to native src load');
            hls?.destroy();
            hls = null;
            hlsRef.current = null;
            video.src = currentSrc;
            restoreTimeAndPlay();
            return;
          }
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HLS] Network error, attempting load restart...');
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS] Media error, attempting recovery...');
              hls?.recoverMediaError();
              break;
            default:
              console.warn('[HLS] Fatal error, falling back to native video src');
              hls?.destroy();
              hls = null;
              hlsRef.current = null;
              video.src = currentSrc;
              restoreTimeAndPlay();
              break;
          }
        }
      });
    } else {
      const savedTime = video.currentTime > 0 ? video.currentTime : savedTimeRef.current;
      const wasPlaying = !video.paused;

      // Pause video to resolve any pending play() promises
      video.pause();

      let handled = false;
      const handleCanPlay = () => {
        if (handled) return;
        handled = true;

        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('loadedmetadata', handleCanPlay);

        if (savedTime > 0) {
          try {
            const targetTime = Math.min(savedTime, video.duration || savedTime);
            if (Number.isFinite(targetTime) && targetTime > 0) {
              video.currentTime = targetTime;
            }
          } catch (err) {
            console.warn('[Player] Restoring currentTime deferred safely:', err);
          }
        }

        if (wasPlaying || autoPlay) {
          video.play().catch((playErr) => {
            console.warn('[Player] Auto-resume after quality change handled safely:', playErr);
          });
        }
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('loadedmetadata', handleCanPlay);

      video.src = currentSrc;
      video.load();

      if (video.readyState >= 2) {
        handleCanPlay();
      }

      return () => {
        if (hls) {
          hls.destroy();
          hlsRef.current = null;
        }
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('loadedmetadata', handleCanPlay);
      };
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentSrc, autoPlay]);

  const [subtitleFontSize, setSubtitleFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nobarfilm_pref_sub_size') as 'sm' | 'md' | 'lg' | 'xl';
      if (saved) return saved;
    }
    return 'md';
  });

  const handleFontSizeChange = (size: 'sm' | 'md' | 'lg' | 'xl') => {
    setSubtitleFontSize(size);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nobarfilm_pref_sub_size', size);
    }
  };

  const getFontSizeRem = (size: 'sm' | 'md' | 'lg' | 'xl') => {
    switch (size) {
      case 'sm': return '0.95rem';
      case 'lg': return '1.4rem';
      case 'xl': return '1.65rem';
      default: return '1.15rem';
    }
  };

  // Ref to preserve original VTTCue timing before delay offset
  const originalCueTimesRef = useRef<WeakMap<VTTCue, { start: number; end: number }>>(new WeakMap());

  // Handle active subtitle track selection, position styling & delay timing
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !video.textTracks) return;

    let styleEl = document.getElementById('nobar-subtitle-style') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'nobar-subtitle-style';
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      video::cue {
        font-size: ${getFontSizeRem(subtitleFontSize)};
        line-height: 1.35;
        background: rgba(0, 0, 0, 0.55);
        color: #f8fafc;
        text-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.9);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 0.15em 0.5em;
        border-radius: 0.25em;
      }
    `;

    // In-memory track mode switching, position & subtitleDelay offset mutation
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (activeSubtitleIndex === i) {
        track.mode = 'showing';
        if (track.cues) {
          for (let c = 0; c < track.cues.length; c++) {
            const cue = track.cues[c] as VTTCue;
            if (cue) {
              cue.line = subtitlePosition;
              cue.snapToLines = false;

              if (!originalCueTimesRef.current.has(cue)) {
                originalCueTimesRef.current.set(cue, { start: cue.startTime, end: cue.endTime });
              }
              const orig = originalCueTimesRef.current.get(cue)!;
              cue.startTime = Math.max(0, orig.start + subtitleDelay);
              cue.endTime = Math.max(0, orig.end + subtitleDelay);
            }
          }
        }
      } else {
        track.mode = 'disabled';
      }
    }
  }, [activeSubtitleIndex, subtitles, subtitlePosition, subtitleFontSize, subtitleDelay]);

  // Expose video DOM element to the ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(videoRef.current);
      } else {
        (ref as React.MutableRefObject<any>).current = videoRef.current;
      }
    }
  }, [ref]);

  // Track Fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleSeek = (targetTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleVolumeChange = (newVol: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    video.volume = clamped;
    video.muted = clamped === 0;
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const [brightness, setBrightness] = useState(1.0);

  useKeyboardShortcuts({
    onTogglePlay: togglePlay,
    onSeek: (seconds) => handleSeek(Math.max(0, Math.min(duration || 0, currentTime + seconds))),
    onSeekPercent: (percent) => handleSeek((duration || 0) * percent),
    onVolumeChange: (delta) => handleVolumeChange(volume + delta),
    onToggleMute: toggleMute,
    onToggleFullscreen: () => toggleFullscreen(),
    onToggleSubtitle: () => {
      if (onSubtitleSelect) {
        onSubtitleSelect(activeSubtitleIndex === null ? 0 : null);
      }
    },
    onEscape: () => {
      if (document.fullscreenElement) {
        toggleFullscreen();
      } else {
        onBack?.();
      }
    },
    isActive: true,
  });

  const [hasVideoError, setHasVideoError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Track fullscreen state only (no auto-lock orientation), prevent finishing
  // buttons from disappearing when exiting fullscreen on mobile.
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      const webkitFs = (videoRef.current as any)?.webkitDisplayingFullscreen === true;
      setIsFullscreen((prev) => prev || webkitFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);



  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    if (!document.fullscreenElement && !(video as any).webkitDisplayingFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
          .then(() => {
            try {
              if ('orientation' in screen && (screen.orientation as any)?.lock) {
                (screen.orientation as any).lock('landscape').catch(() => {});
              }
            } catch {}
          })
          .catch(() => {
            if ((video as any).webkitEnterFullscreen) {
              (video as any).webkitEnterFullscreen();
            }
          });
      } else if ((video as any).webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((video as any).webkitExitFullscreen) {
        (video as any).webkitExitFullscreen();
      }
    }
  };

  const handleRetryVideo = () => {
    setHasVideoError(false);
    setIsBuffering(true);
    const video = videoRef.current;
    if (video) {
      video.load();
      video.play().catch(() => {});
    }
  };

  const hasAttemptedProxy = useRef(false);

  useEffect(() => {
    hasAttemptedProxy.current = false;
  }, [currentSrc]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden group/player flex items-center justify-center"
    >
      <video
        ref={videoRef}
        poster={poster || ''}
        playsInline
        crossOrigin="anonymous"
        {...({ referrerPolicy: 'no-referrer' } as any)}
        style={{
          filter: brightness !== 1.0 ? `brightness(${brightness})` : undefined,
        }}
        className="w-full h-full object-contain bg-black block"
        onPlay={() => {
          setIsPlaying(true);
          setIsBuffering(false);
          setHasVideoError(false);
        }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onSeeking={() => setIsBuffering(true)}
        onSeeked={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => {
          setIsPlaying(true);
          setIsBuffering(false);
          setHasVideoError(false);
        }}
        onError={() => {
          // Attempt proxy fallback ONLY ONCE per stream URL to prevent infinite fallback loop
          if (videoRef.current && currentSrc && !hasAttemptedProxy.current && !currentSrc.includes('/api/proxy/video')) {
            hasAttemptedProxy.current = true;
            console.warn('[Player] Direct CDN load failed, falling back to proxy stream...');
            const proxyFallbackUrl = `/api/proxy/video?url=${encodeURIComponent(currentSrc)}&referer=${encodeURIComponent('https://lok-lok.cc/')}`;
            videoRef.current.src = proxyFallbackUrl;
            videoRef.current.load();
            videoRef.current.play().catch(() => {});
            return;
          }
          setHasVideoError(true);
          setIsBuffering(false);
        }}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          setCurrentTime(video.currentTime);
          setDuration(video.duration || 0);
          if (video.buffered.length > 0) {
            setBuffered(video.buffered.end(video.buffered.length - 1));
          }
          onProgress?.(video.currentTime, video.duration || 0);
        }}
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;
          setDuration(video.duration || 0);
          setHasVideoError(false);
        }}
        onEnded={onEnded}
        onRateChange={(e) => {
          setSpeed(e.currentTarget.playbackRate);
        }}
      >
        {subtitles.map((sub, idx) => (
          <track
            key={idx}
            kind="subtitles"
            label={sub.label}
            srcLang={sub.srcLang}
            src={sub.src}
            default={sub.default}
          />
        ))}
      </video>

      {/* Soft & Minimalist Buffering / Loading Indicator */}
      {isBuffering && !hasVideoError && (
        <div className="absolute inset-0 z-35 pointer-events-none flex items-center justify-center transition-opacity duration-300">
          <div className="relative flex items-center justify-center p-3 rounded-full bg-black/40 backdrop-blur-sm shadow-xl border border-white/5 animate-fade-in">
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-white/90"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Subtle background track */}
              <circle
                cx="24"
                cy="24"
                r="19"
                stroke="currentColor"
                strokeWidth="2.5"
                className="opacity-15"
              />
              {/* Soft rotating arc */}
              <path
                d="M24 5C13.5066 5 5 13.5066 5 24"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="opacity-90 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Error Recovery UI Overlay */}
      {hasVideoError && (
        <div className="absolute inset-0 z-40 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
          <div className="p-3 bg-red-600/20 text-red-500 rounded-full border border-red-500/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-zinc-100">Gagal Memuat Video</h3>
          <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
            Sumber pemutaran video terputus atau koneksi mengalami masalah. Silakan coba muat ulang stream.
          </p>
          <button
            type="button"
            onClick={handleRetryVideo}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center gap-2"
          >
            <span>Muat Ulang Video</span>
          </button>
        </div>
      )}

      {/* Netflix Custom Player Overlay */}
      <PlayerOverlay
        title={title}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        onSeek={handleSeek}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
        brightness={brightness}
        onBrightnessChange={setBrightness}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onBack={onBack}
        subtitles={subtitles}
        activeSubtitleIndex={activeSubtitleIndex}
        onSelectSubtitle={onSubtitleSelect}
        subtitleDelay={subtitleDelay}
        onDelayChange={onSubtitleDelayChange}
        subtitlePosition={subtitlePosition}
        onPositionChange={onSubtitlePositionChange}
        subtitleFontSize={subtitleFontSize}
        onFontSizeChange={handleFontSizeChange}
        onCustomSubtitleUpload={onCustomSubtitleUpload}
        qualities={qualities}
        activeQualityIndex={activeQualityIndex}
        activeHlsHeight={activeHlsHeight}
        onSelectQuality={onQualityChange}
        audioOptions={audioOptions}
        activeAudioCode={activeAudioCode}
        onSelectAudio={onAudioChange}
        isSeries={isSeries}
        seasons={seasons}
        episodes={episodes}
        activeSeason={activeSeason}
        activeEpisode={activeEpisode}
        onSeasonChange={onSeasonChange}
        onEpisodeChange={onEpisodeChange}
        hasNextEpisode={hasNextEpisode}
        onNextEpisode={onNextEpisode}
      />
    </div>
  );
});

MoviePlayer.displayName = 'MoviePlayer';

