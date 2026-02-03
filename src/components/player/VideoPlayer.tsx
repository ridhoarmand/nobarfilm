'use client';import { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'plyr-react/plyr.css';
import { FastForward, Rewind, Volume2, Sun, Loader2 } from 'lucide-react';
import { SubjectType } from '@/types/api';

const Plyr = dynamic(() => import('plyr-react').then((mod) => mod.Plyr), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-white">
      <Loader2 className="w-10 h-10 animate-spin text-red-600" />
    </div>
  ),
});

interface VideoPlayerProps {
  src: string;
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
  subjectType?: SubjectType; // To detect drama shorts
  initialTime?: number; // Initial playback position (for quality changes)
}

export function VideoPlayer({ src, subtitles = [], poster, onEnded, onProgress, subjectType, initialTime = 0 }: VideoPlayerProps) {
  const plyrRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  // Gesture State
  const [brightness, setBrightness] = useState(1);
  const [showFeedback, setShowFeedback] = useState<{ Icon: any; text: string } | null>(null);
  const feedbackTimeout = useRef<NodeJS.Timeout | null>(null);
  const touchStart = useRef<{ x: number; y: number; time: number; val: number } | null>(null);
  const lastTap = useRef<number>(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Screen Rotation Handler for Fullscreen
  useEffect(() => {
    if (!isClient) return;

    const player = plyrRef.current?.plyr;
    if (!player || typeof player.on !== 'function') return;

    const handleFullscreenChange = async () => {
      const playerInstance = plyrRef.current?.plyr;
      if (!playerInstance) return;

      const isDramaShort = subjectType === SubjectType.Short;
      const isFullscreen = playerInstance.fullscreen.active;

      try {
        if (isFullscreen && !isDramaShort) {
          // Not a drama short: Force landscape orientation
          if (screen.orientation && (screen.orientation as any).lock) {
            await (screen.orientation as any).lock('landscape').catch(() => {});
          }
        } else if (isFullscreen && isDramaShort) {
          // Drama short: Keep portrait orientation
          if (screen.orientation && (screen.orientation as any).lock) {
            await (screen.orientation as any).lock('portrait').catch(() => {});
          }
        } else if (!isFullscreen) {
          // Exit fullscreen: Unlock orientation to allow natural rotation
          if (screen.orientation && (screen.orientation as any).unlock) {
            (screen.orientation as any).unlock();
          }
          // Small delay then try to unlock again to ensure it takes effect
          setTimeout(() => {
            if (screen.orientation && (screen.orientation as any).unlock) {
              (screen.orientation as any).unlock();
            }
          }, 100);
        }
      } catch (error) {
        // Silently fail if orientation API not supported
      }
    };

    player.on('enterfullscreen', handleFullscreenChange);
    player.on('exitfullscreen', handleFullscreenChange);

    return () => {
      if (typeof player.off === 'function') {
        player.off('enterfullscreen', handleFullscreenChange);
        player.off('exitfullscreen', handleFullscreenChange);
      }
    };
  }, [isClient, subjectType]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const player = plyrRef.current?.plyr;
      if (!player) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key.toLowerCase()) {
        case 'f':
          player.fullscreen.toggle();
          break;
        case 'k':
        case ' ':
          e.preventDefault();
          player.togglePlay();
          break;
        case 'arrowright':
          player.forward(10);
          displayFeedback(FastForward, '+10s');
          break;
        case 'arrowleft':
          player.rewind(10);
          displayFeedback(Rewind, '-10s');
          break;
        case 'm':
          player.muted = !player.muted;
          displayFeedback(Volume2, player.muted ? 'Muted' : 'Unmuted');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Safe Player Init & History Listener
  useEffect(() => {
    if (plyrRef.current?.plyr) {
      const player = plyrRef.current.plyr;

      // Ensure player.on exists before using
      if (player && typeof player.on === 'function') {
        const handleEnded = () => onEnded && onEnded();
        const handleTimeUpdate = (event: any) => {
          // Safe access to time
          const time = event?.detail?.plyr?.currentTime;
          if (typeof time === 'number' && onProgress) {
            onProgress(time);
          }
        };

        const handleReady = () => {
          // Seek to initialTime when player is ready (for quality changes)
          if (initialTime > 0) {
            player.currentTime = initialTime;
          }
        };

        player.on('ended', handleEnded);
        player.on('timeupdate', handleTimeUpdate);
        player.on('ready', handleReady);

        // Default Volume
        player.volume = 1;

        return () => {
          // Safe cleanup with optional chaining and existence check
          const currentPlayer = plyrRef.current?.plyr;
          if (currentPlayer && typeof currentPlayer.off === 'function') {
            try {
              currentPlayer.off('ended', handleEnded);
              currentPlayer.off('timeupdate', handleTimeUpdate);
              currentPlayer.off('ready', handleReady);
            } catch (err) {
              console.warn('Error removing player listeners:', err);
            }
          }
        };
      }
    }
  }, [onEnded, onProgress, initialTime]);

  // Helpers
  const displayFeedback = (Icon: any, text: string) => {
    setShowFeedback({ Icon, text });
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = setTimeout(() => setShowFeedback(null), 800);
  };

  // Touch Handlers (Gesture)
  const handleTouchStart = (e: React.TouchEvent) => {
    // Ignore controls safely using closest check on HTMLElement
    const target = e.target as HTMLElement;
    if (!target || typeof target.closest !== 'function' || target.closest('.plyr__controls')) return;

    const player = plyrRef.current?.plyr;
    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;

    touchStart.current = {
      x: clientX,
      y: clientY,
      time: Date.now(),
      val: clientX < window.innerWidth / 2 ? brightness : player?.volume || 1,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || !plyrRef.current?.plyr) return;

    // Ignore small movements (avoid blocking scroll for tiny jitters)
    const deltaY = touchStart.current.y - e.touches[0].clientY;
    if (Math.abs(deltaY) < 15) return;

    // If vertical movement is dominant, prevent scroll (Gesture Active)
    // e.preventDefault(); // Note: React synthetic events might not support preventDefault in time for passive listeners.

    const player = plyrRef.current.plyr;
    const sensitivity = 0.005;

    if (touchStart.current.x < window.innerWidth / 2) {
      // LEFT: Brightness
      const newBright = Math.min(Math.max(touchStart.current.val + deltaY * sensitivity, 0.2), 1.5);
      setBrightness(newBright);
    } else {
      // RIGHT: Volume
      const newVol = Math.min(Math.max(touchStart.current.val + deltaY * sensitivity, 0), 1);
      player.volume = newVol;
      displayFeedback(Volume2, `${Math.round(newVol * 100)}%`);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || !plyrRef.current?.plyr) return;

    const now = Date.now();
    const deltaX = Math.abs(e.changedTouches[0].clientX - touchStart.current.x);
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
    const timeDiff = now - touchStart.current.time;

    // Detect Tap (Low movement, short time)
    if (deltaX < 10 && deltaY < 10 && timeDiff < 300) {
      // Double Tap Logic
      if (now - lastTap.current < 300) {
        const width = wrapperRef.current?.clientWidth || window.innerWidth;
        const rect = wrapperRef.current?.getBoundingClientRect();
        const x = e.changedTouches[0].clientX - (rect?.left || 0);
        const player = plyrRef.current.plyr;

        if (x > width * 0.65) {
          player.forward(10);
          displayFeedback(FastForward, '+10s');
        } else if (x < width * 0.35) {
          player.rewind(10);
          displayFeedback(Rewind, '-10s');
        }
        lastTap.current = 0;
      } else {
        lastTap.current = now;
        // Single tap to toggle play (with a small delay to avoid fighting double tap)
        setTimeout(() => {
          if (Date.now() - lastTap.current >= 300 && lastTap.current !== 0) {
            plyrRef.current?.plyr?.togglePlay();
          }
        }, 300);
      }
    }

    touchStart.current = null;
  };

  // Memoized Props
  const videoSrc = useMemo(
    () => ({
      type: 'video' as const,
      sources: [{ src, type: 'video/mp4' }],
      poster,
      tracks: subtitles.map((sub) => ({
        kind: 'captions' as const,
        label: sub.label,
        srcLang: sub.srcLang,
        src: sub.src,
        default: sub.default,
      })),
    }),
    [src, poster, subtitles],
  );

  const options = useMemo(
    () => ({
      controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'pip', 'fullscreen'],
      settings: ['captions', 'quality', 'speed'],
      quality: { default: 720, options: [360, 480, 720, 1080] },
      captions: { active: true, language: 'in_id', update: true },
      autoplay: true,
      fullscreen: { enabled: true, fallback: true, iosNative: true }, // critical for mobile
    }),
    [],
  );

  if (!isClient)
    return (
      <div className="w-full aspect-video bg-zinc-900 flex items-center justify-center rounded-xl">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
      </div>
    );

  return (
    <div
      ref={wrapperRef}
      // Added max-w-full and aspect-video to constrain size and maintain ratio
      className="relative w-full max-w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group mx-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Brightness Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-100 mix-blend-multiply bg-black" style={{ opacity: Math.max(0, 1 - brightness) }} />
      <div className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-100 mix-blend-overlay bg-white" style={{ opacity: Math.max(0, brightness - 1) }} />

      {/* Plyr Instance */}
      <div className="relative z-0 h-full">
        <Plyr ref={plyrRef} source={videoSrc} options={options} />
      </div>

      {/* Visual Feedback */}
      {showFeedback && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md p-6 rounded-full flex flex-col items-center animate-in fade-in zoom-in duration-200">
            <showFeedback.Icon className="w-12 h-12 text-white fill-white/20" />
            <span className="text-white font-bold mt-2">{showFeedback.text}</span>
          </div>
        </div>
      )}

      {/* Mobile Hint */}
      <div className="absolute top-4 inset-x-0 flex justify-center z-40 pointer-events-none sm:hidden opacity-0 animate-pulse">
        <span className="text-[10px] text-white/50 bg-black/40 px-2 rounded">Double tap sides • Slide vertically</span>
      </div>
    </div>
  );
}
