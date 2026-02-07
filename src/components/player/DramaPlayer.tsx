'use client';import { useEffect, useRef, useState, forwardRef, useCallback } from 'react';
import { MediaPlayer, MediaProvider, Poster, type MediaPlayerInstance, type MediaSrc } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

const STORAGE_KEYS = {
  MUTED: 'nobar-player-muted',
  VOLUME: 'nobar-player-volume',
  SPEED: 'nobar-playback-rate',
};

// Helper to get saved mute state
function getSavedMuteState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEYS.MUTED) === 'true';
  } catch {
    return false;
  }
}

// Helper to get saved volume
function getSavedVolume(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.VOLUME);
    if (saved) {
      const vol = parseFloat(saved);
      if (!isNaN(vol) && vol >= 0 && vol <= 1) return vol;
    }
  } catch {}
  return 1;
}

// Helper to get saved speed
function getSavedSpeed(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SPEED);
    if (saved) {
      const rate = parseFloat(saved);
      if (!isNaN(rate) && rate > 0 && rate <= 16) return rate;
    }
  } catch {}
  return 1;
}

interface DramaPlayerProps {
  src: MediaSrc | string;
  poster?: string;
  onEnded?: () => void;
  initialTime?: number;
  autoPlay?: boolean;
}

/**
 * Drama Player with persistent settings.
 * Settings persisted: playback speed, volume, mute state
 */
export const DramaPlayer = forwardRef<MediaPlayerInstance, DramaPlayerProps>(({ src, poster, onEnded, initialTime = 0, autoPlay = true }, ref) => {
  const localRef = useRef<MediaPlayerInstance>(null);
  const player = (ref as React.RefObject<MediaPlayerInstance>) || localRef;

  const [isClient, setIsClient] = useState(false);
  const hasAppliedSpeed = useRef(false);
  const hasAppliedVolume = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Apply volume/mute when player is ready
  const handleCanPlay = useCallback(() => {
    if (!player.current || hasAppliedVolume.current) return;
    hasAppliedVolume.current = true;

    const p = player.current;

    // Restore volume and mute state
    p.muted = getSavedMuteState();
    p.volume = getSavedVolume();

    // Trigger autoplay
    if (autoPlay) {
      p.play().catch(() => {
        p.muted = true;
        p.play().catch(() => {});
      });
    }
  }, [player, autoPlay]);

  // Apply speed when video actually starts playing
  // This ensures Vidstack's internal state is fully initialized
  const handlePlaying = useCallback(() => {
    if (!player.current || hasAppliedSpeed.current) return;
    hasAppliedSpeed.current = true;

    const savedSpeed = getSavedSpeed();

    // Use multiple attempts with delays to ensure speed sticks
    const applySpeed = () => {
      if (player.current) {
        player.current.playbackRate = savedSpeed;
      }
    };

    // Apply immediately
    applySpeed();

    // Apply again after a short delay (Vidstack might reset it)
    setTimeout(applySpeed, 50);
    setTimeout(applySpeed, 150);
  }, [player]);

  // Save settings when they change
  const handleVolumeChange = useCallback(() => {
    if (!player.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.MUTED, player.current.muted.toString());
      localStorage.setItem(STORAGE_KEYS.VOLUME, player.current.volume.toString());
    } catch {}
  }, [player]);

  const handleRateChange = useCallback(() => {
    if (!player.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SPEED, player.current.playbackRate.toString());
    } catch {}
  }, [player]);

  // Reset flags when src changes (new episode)
  useEffect(() => {
    hasAppliedSpeed.current = false;
    hasAppliedVolume.current = false;
  }, [src]);

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
        onPlaying={handlePlaying}
        onVolumeChange={handleVolumeChange}
        onRateChange={handleRateChange}
        autoPlay={autoPlay}
        streamType="on-demand"
        playsInline
        crossOrigin
        fullscreenOrientation="none"
        logLevel="silent"
      >
        <MediaProvider>{poster && <Poster className="vds-poster" src={poster} alt="Poster" />}</MediaProvider>
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
});
DramaPlayer.displayName = 'DramaPlayer';
