'use client';import { useEffect, useRef, useState, useMemo, forwardRef, useCallback } from 'react';
import { MediaPlayer, MediaProvider, Track, Poster, useMediaState, type MediaPlayerInstance, type MediaSrc } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { FastForward, Rewind, Volume2 } from 'lucide-react';
import { SubjectType } from '@/types/api';
import { cn } from '@/lib/utils';
import { usePlaybackSpeed } from './hooks/usePlaybackSpeed';

interface VideoPlayerProps {
  src: MediaSrc | string;
  subtitles?: Array<{
    kind: string;
    label: string;
    srcLang: string;
    src: string;
    default?: boolean;
  }>;
  poster?: string;
  onEnded?: () => void;
  onProgress?: (time: number) => void;
  subjectType?: SubjectType;
  initialTime?: number;
  autoPlay?: boolean;
}

/**
 * Optimized Video Player for Movie and Drama.
 * - Persistent playback speed via usePlaybackSpeed hook
 * - Auto-resume after seek
 * - Gesture controls (brightness/volume)
 * - No party sync logic (use PartyPlayer for that)
 */
export const VideoPlayer = forwardRef<MediaPlayerInstance, VideoPlayerProps>(({ src, subtitles = [], poster, onEnded, onProgress, subjectType, initialTime = 0, autoPlay }, ref) => {
  const localRef = useRef<MediaPlayerInstance>(null);
  const player = (ref as React.RefObject<MediaPlayerInstance>) || localRef;

  const [isClient, setIsClient] = useState(false);
  const isFullscreen = useMediaState('fullscreen', player);

  // Speed persistence
  const { speedRef, setSpeed, applyToPlayer } = usePlaybackSpeed();
  const isSwitchingSource = useRef(false);
  const lastSrcRef = useRef<string | null>(null);

  // Gesture State
  const [brightness, setBrightness] = useState(1);
  const [showFeedback, setShowFeedback] = useState<{ Icon: React.ComponentType<any>; text: string } | null>(null);
  const feedbackTimeout = useRef<NodeJS.Timeout | null>(null);
  const touchStart = useRef<{ x: number; y: number; time: number; val: number } | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Track source changes
  const currentSrc = useMemo(() => {
    if (!src) return null;
    return typeof src === 'string' ? src : (src as any).src;
  }, [src]);

  useEffect(() => {
    if (currentSrc && currentSrc !== lastSrcRef.current) {
      isSwitchingSource.current = true;
      lastSrcRef.current = currentSrc;
    }
  }, [currentSrc]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!player.current) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key.toLowerCase()) {
        case 'arrowright':
          player.current.currentTime += 10;
          displayFeedback(FastForward, '+10s');
          break;
        case 'arrowleft':
          player.current.currentTime -= 10;
          displayFeedback(Rewind, '-10s');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player]);

  // Auto-play on source change
  useEffect(() => {
    if (player.current && src && autoPlay) {
      const timer = setTimeout(() => {
        player.current?.play().catch(() => {});
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [src, autoPlay, player]);

  // Helpers
  const displayFeedback = useCallback((Icon: React.ComponentType<any>, text: string) => {
    setShowFeedback({ Icon, text });
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = setTimeout(() => setShowFeedback(null), 800);
  }, []);

  // Gesture handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!player.current) return;
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      touchStart.current = {
        x: clientX,
        y: clientY,
        time: Date.now(),
        val: clientX < window.innerWidth / 2 ? brightness : player.current.volume,
      };
    },
    [brightness, player],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current || !player.current) return;
      const deltaY = touchStart.current.y - e.touches[0].clientY;
      const deltaX = touchStart.current.x - e.touches[0].clientX;

      if (Math.abs(deltaY) < 15 && Math.abs(deltaX) < 15) return;

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        const sensitivity = 0.005;
        if (touchStart.current.x < window.innerWidth / 2) {
          const newBright = Math.min(Math.max(touchStart.current.val + deltaY * sensitivity, 0.2), 1.5);
          setBrightness(newBright);
        } else {
          const newVol = Math.min(Math.max(touchStart.current.val + deltaY * sensitivity, 0), 1);
          player.current.volume = newVol;
          displayFeedback(Volume2, `${Math.round(newVol * 100)}%`);
        }
      }
    },
    [player, displayFeedback],
  );

  const handleTouchEnd = useCallback(() => {
    touchStart.current = null;
  }, []);

  // Player event handlers
  const handleCanPlay = useCallback(() => {
    applyToPlayer(player.current);
    setTimeout(() => {
      isSwitchingSource.current = false;
    }, 1000);
  }, [applyToPlayer, player]);

  const handleRateChange = useCallback(
    (rate: number) => {
      if (!isSwitchingSource.current) {
        setSpeed(rate);
      }
    },
    [setSpeed],
  );

  const handleSeeked = useCallback(() => {
    // Auto-resume after seek
    if (player.current && autoPlay) {
      player.current.play().catch(() => {});
    }
  }, [player, autoPlay]);

  const tracks = useMemo(
    () => subtitles.map((sub, i) => <Track key={String(i)} src={sub.src} kind={sub.kind as any} label={sub.label} lang={String(sub.srcLang)} default={!!sub.default} />),
    [subtitles],
  );

  const containerClasses = useMemo(() => {
    const baseClasses = 'relative w-full bg-black rounded-xl overflow-hidden shadow-2xl group mx-auto transition-all duration-500';

    if (isFullscreen) {
      return cn(baseClasses, 'w-full h-full rounded-none max-w-none max-h-none');
    }

    if (subjectType === SubjectType.Short) {
      return cn(baseClasses, 'w-full h-full md:w-auto');
    }

    return cn(baseClasses, 'max-w-7xl aspect-video');
  }, [isFullscreen, subjectType]);

  if (!isClient) return <div className="aspect-video bg-black rounded-xl" />;

  return (
    <div className={containerClasses} data-fullscreen={isFullscreen} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Brightness Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-100 mix-blend-multiply bg-black" style={{ opacity: Math.max(0, 1 - brightness) }} />
      <div className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-100 mix-blend-overlay bg-white" style={{ opacity: Math.max(0, brightness - 1) }} />

      <MediaPlayer
        ref={player}
        src={src}
        className="w-full h-full"
        title="NobarFilm Player"
        currentTime={initialTime > 0 ? initialTime : undefined}
        onEnd={onEnded}
        onTimeUpdate={(detail) => onProgress?.(detail.currentTime)}
        onCanPlay={handleCanPlay}
        onRateChange={handleRateChange}
        onSeeked={handleSeeked}
        autoplay={autoPlay}
        streamType="on-demand"
        playsInline
        crossOrigin
        fullscreenOrientation="none"
        logLevel="silent"
      >
        <MediaProvider>
          {poster && <Poster className="vds-poster object-contain" src={poster} alt="Poster" />}
          {tracks}
        </MediaProvider>
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>

      {/* Visual Feedback */}
      {showFeedback && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md p-6 rounded-full flex flex-col items-center animate-in fade-in zoom-in duration-200">
            <showFeedback.Icon className="w-12 h-12 text-white fill-white/20" />
            <span className="text-white font-bold mt-2">{showFeedback.text}</span>
          </div>
        </div>
      )}
    </div>
  );
});
VideoPlayer.displayName = 'VideoPlayer';
