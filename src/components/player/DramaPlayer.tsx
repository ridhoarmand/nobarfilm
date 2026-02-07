'use client';
import { useEffect, useRef, useState, forwardRef, useCallback } from 'react';
import { MediaPlayer, MediaProvider, Poster, type MediaPlayerInstance, type MediaSrc } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { usePlaybackSpeed } from './hooks/usePlaybackSpeed';

interface DramaPlayerProps {
  src: MediaSrc | string;
  poster?: string;
  onEnded?: () => void;
  initialTime?: number;
  autoPlay?: boolean;
}

/**
 * Drama Player - Simple version.
 * Features:
 * - Persistent playback speed
 * - Standard Vidstack layout
 */
export const DramaPlayer = forwardRef<MediaPlayerInstance, DramaPlayerProps>(({ src, poster, onEnded, initialTime = 0, autoPlay = true }, ref) => {
  const localRef = useRef<MediaPlayerInstance>(null);
  const player = (ref as React.RefObject<MediaPlayerInstance>) || localRef;

  const [isClient, setIsClient] = useState(false);

  // Speed persistence
  const { applyToPlayer } = usePlaybackSpeed();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Player event handlers
  const handleCanPlay = useCallback(() => {
    applyToPlayer(player.current);

    // Trigger autoplay
    if (autoPlay && player.current) {
      player.current.play().catch(() => {});
    }
  }, [applyToPlayer, player, autoPlay]);

  if (!isClient) return <div className="w-full h-full bg-black" />;

  return (
    <div className="w-full h-full">
      <MediaPlayer
        ref={player}
        src={src}
        className="w-full h-full"
        title="NobarFilm Drama Player"
        currentTime={initialTime > 0 ? initialTime : undefined}
        onEnd={onEnded}
        onCanPlay={handleCanPlay}
        autoPlay={autoPlay}
        muted={autoPlay}
        streamType="on-demand"
        playsInline
        crossOrigin
        fullscreenOrientation="landscape"
        logLevel="silent"
      >
        <MediaProvider>{poster && <Poster className="vds-poster" src={poster} alt="Poster" />}</MediaProvider>
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
});
DramaPlayer.displayName = 'DramaPlayer';
