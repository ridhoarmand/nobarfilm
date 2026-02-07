'use client';
import { useEffect, useRef, useMemo, forwardRef, useCallback } from 'react';
import { MediaPlayer, MediaProvider, Track, Poster, type MediaPlayerInstance, type MediaSrc } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { SubjectType } from '@/types/api';
import { cn } from '@/lib/utils';
import { usePlaybackSpeed } from './hooks/usePlaybackSpeed';

interface PartyPlayerProps {
  src: MediaSrc | null;
  subtitles?: Array<{
    kind: string;
    label: string;
    srcLang: string;
    src: string;
    default?: boolean;
  }>;
  poster?: string;
  subjectType?: SubjectType;
  // Party sync callbacks
  onPlay?: () => void;
  onPause?: () => void;
  onSeeked?: (time: number) => void;
  onWaiting?: () => void;
  onPlaying?: () => void;
}

/**
 * Optimized player for Watch Party.
 * - Memoized to prevent unnecessary re-renders
 * - Auto-resume after seek
 * - Persistent playback speed
 * - Minimal API calls
 */
export const PartyPlayer = forwardRef<MediaPlayerInstance, PartyPlayerProps>(({ src, subtitles = [], poster, subjectType, onPlay, onPause, onSeeked, onWaiting, onPlaying }, ref) => {
  const localRef = useRef<MediaPlayerInstance>(null);
  const player = (ref as React.RefObject<MediaPlayerInstance>) || localRef;
  const { speedRef, setSpeed, applyToPlayer } = usePlaybackSpeed();
  const isSwitchingSource = useRef(false);
  const lastSrcRef = useRef<string | null>(null);

  // Track source changes to manage speed restoration
  const currentSrc = useMemo(() => {
    if (!src) return null;
    if (typeof src === 'string') return src;
    const srcVal = (src as { src: string }).src;
    return typeof srcVal === 'string' ? srcVal : null;
  }, [src]);

  useEffect(() => {
    if (currentSrc && currentSrc !== lastSrcRef.current) {
      isSwitchingSource.current = true;
      lastSrcRef.current = currentSrc;
    }
  }, [currentSrc]);

  const handleCanPlay = useCallback(() => {
    applyToPlayer(player.current);
    // Allow rate changes after short delay
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

  const handleSeeked = useCallback(
    (time: number) => {
      onSeeked?.(time);
      // Auto-resume after seek
      if (player.current && !player.current.paused) {
        player.current.play().catch(() => {});
      }
    },
    [onSeeked, player],
  );

  const tracks = useMemo(
    () => subtitles.map((sub, i) => <Track key={String(i)} src={sub.src} kind={sub.kind as any} label={sub.label} lang={String(sub.srcLang)} default={!!sub.default} />),
    [subtitles],
  );

  const containerClasses = useMemo(() => {
    const base = 'relative w-full bg-black rounded-xl overflow-hidden shadow-2xl group mx-auto';
    if (subjectType === SubjectType.Short) {
      return cn(base, 'w-full h-full md:w-auto');
    }
    return cn(base, 'max-w-7xl aspect-video');
  }, [subjectType]);

  if (!src) {
    return <div className="aspect-video bg-black rounded-xl animate-pulse" />;
  }

  return (
    <div className={containerClasses}>
      <MediaPlayer
        ref={player}
        src={src}
        className="w-full h-full"
        title="NobarFilm Party Player"
        onPlay={onPlay}
        onPause={onPause}
        onSeeked={handleSeeked}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onCanPlay={handleCanPlay}
        onRateChange={handleRateChange}
        streamType="on-demand"
        playsInline
        crossOrigin
        fullscreenOrientation="landscape"
        logLevel="silent"
      >
        <MediaProvider>
          {poster && <Poster className="vds-poster object-contain" src={poster} alt="Poster" />}
          {tracks}
        </MediaProvider>
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
});
PartyPlayer.displayName = 'PartyPlayer';
