'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'plyr-react/plyr.css';
import { FastForward, Rewind, Volume2, Loader2 } from 'lucide-react';
import { SubjectType } from '@/types/api';
import Hls from 'hls.js';
import { cn } from '@/lib/utils';

const Plyr = dynamic(() => import('plyr-react').then((mod) => mod.Plyr), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plyrRef = useRef<{ plyr: any } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  // Gesture State
  const [brightness, setBrightness] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [showFeedback, setShowFeedback] = useState<{ Icon: React.ComponentType<any>; text: string } | null>(null);
  const feedbackTimeout = useRef<NodeJS.Timeout | null>(null);
  const touchStart = useRef<{ x: number; y: number; time: number; val: number } | null>(null);

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
      const _isFullscreen = playerInstance.fullscreen.active;
      setIsFullscreen(_isFullscreen);

      if (!_isFullscreen) {
        // Exit fullscreen: unlock orientation
        if (screen.orientation && typeof (screen.orientation as unknown as { unlock: () => void }).unlock === 'function') {
          (screen.orientation as unknown as { unlock: () => void }).unlock();
        }
        return;
      }

      // Entering fullscreen: lock orientation based on content type
      try {
        const orientationLock = isDramaShort ? 'portrait' : 'landscape';
        if (screen.orientation && typeof (screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock === 'function') {
          await (screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock(orientationLock).catch(() => {
            // Silently fail if orientation lock not supported
          });
        }
      } catch {
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

  // Refs for stable callbacks
  const onEndedRef = useRef(onEnded);
  const onProgressRef = useRef(onProgress);

  useEffect(() => {
    onEndedRef.current = onEnded;
    onProgressRef.current = onProgress;
  }, [onEnded, onProgress]);

  // Safe Player Init & HLS Setup
  useEffect(() => {
    if (!isClient) return;

    let hls: Hls | null = null;
    let cleanupListeners: (() => void) | null = null;
    let initTimer: NodeJS.Timeout | null = null;

    const initPlayer = () => {
      const player = plyrRef.current?.plyr;
      if (!player || typeof player.on !== 'function') {
        // Retry if player not ready
        initTimer = setTimeout(initPlayer, 50);
        return;
      }

      const isM3U8 = src.includes('.m3u8');

      const setupListeners = () => {
        const handleEnded = () => onEndedRef.current && onEndedRef.current();
        const handleTimeUpdate = (event: { detail?: { plyr?: { currentTime?: number } } }) => {
          const time = event?.detail?.plyr?.currentTime;
          if (typeof time === 'number' && onProgressRef.current) {
            onProgressRef.current(time);
          }
        };

        player.on('ended', handleEnded);
        player.on('timeupdate', handleTimeUpdate);

        return () => {
          try {
            if (player) {
              player.off('ended', handleEnded);
              player.off('timeupdate', handleTimeUpdate);
            }
          } catch {
            // Player might be destroyed already, ignore
          }
        };
      };

      if (isM3U8 && Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(player.media);
        (window as unknown as { hls: Hls }).hls = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (initialTime > 0) player.currentTime = initialTime;
        });

        cleanupListeners = setupListeners();
      } else {
        // MP4 flow
        if (initialTime > 0) {
          player.once('ready', () => {
            player.currentTime = initialTime;
          });
        }
        cleanupListeners = setupListeners();
      }

      // Ensure volume
      player.volume = 1;
    };

    // Start initialization attempt
    initPlayer();

    return () => {
      if (initTimer) clearTimeout(initTimer);
      if (cleanupListeners) cleanupListeners();
      if (hls) hls.destroy();
    };
  }, [src, isClient, initialTime]); // Removed onEnded, onProgress from dependencies

  // Helpers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const displayFeedback = (Icon: React.ComponentType<any>, text: string) => {
    setShowFeedback({ Icon, text });
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = setTimeout(() => setShowFeedback(null), 800);
  };

  // Touch Handlers (Gesture)
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow advanced gestures in fullscreen mode
    if (!isFullscreen) return;

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
    // Only handle advanced gestures in fullscreen
    if (!isFullscreen || !touchStart.current || !plyrRef.current?.plyr) return;

    // Prevent default to avoid browser zoom/scroll
    e.preventDefault();

    // Ignore small movements (avoid blocking scroll for tiny jitters)
    const deltaY = touchStart.current.y - e.touches[0].clientY;
    const deltaX = touchStart.current.x - e.touches[0].clientX;
    if (Math.abs(deltaY) < 15 && Math.abs(deltaX) < 15) return;

    const player = plyrRef.current.plyr;

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      // Vertical swipe: Volume/Brightness
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
    } else {
      // Horizontal swipe: Seek
      const sensitivity = 0.5; // Adjust sensitivity for seek
      const seekAmount = deltaX * sensitivity;
      const newTime = Math.max(0, Math.min(player.duration, player.currentTime + seekAmount));
      player.currentTime = newTime;
      displayFeedback(seekAmount > 0 ? FastForward : Rewind, `${seekAmount > 0 ? '+' : ''}${Math.round(seekAmount)}s`);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) {
      touchStart.current = null;
      return;
    }

    // Only detect tap for control toggle (don't pause on tap)
    const now = Date.now();
    const deltaX = Math.abs(e.changedTouches[0].clientX - touchStart.current.x);
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
    const timeDiff = now - touchStart.current.time;

    // Detect Tap (Low movement, short time) - just clear state, don't pause
    if (deltaX < 10 && deltaY < 10 && timeDiff < 300) {
      // Tap gesture detected - controls will auto-show/hide via Plyr, no pause action
    }

    touchStart.current = null;
  };

  // Memoized Props
  const videoSrc = useMemo(
    () => ({
      type: 'video' as const,
      sources: [{ src, type: src.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4' }],
      poster,
      tracks: subtitles.map((sub, index) => ({
        kind: 'captions' as const,
        label: sub.label,
        srcLang: sub.srcLang,
        src: sub.src,
        default: sub.default || index === 0,
      })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [src, poster, JSON.stringify(subtitles)],
  );

  const options = useMemo(
    () => ({
      controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'pip', 'fullscreen'],
      settings: ['captions', 'quality', 'speed'],
      quality: { default: 720, options: [360, 480, 720, 1080] },
      captions: { active: true, language: 'in_id', update: true },
      autoplay: true,
      fullscreen: { enabled: true, fallback: true, iosNative: true }, // critical for mobile
    }),
    [],
  );

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative w-full bg-black rounded-xl overflow-hidden shadow-2xl group mx-auto transition-all duration-500',
        subjectType === SubjectType.Short ? 'max-w-[400px] aspect-[9/16] md:aspect-[9/16]' : 'max-w-7xl aspect-video',
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Brightness Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-100 mix-blend-multiply bg-black" style={{ opacity: Math.max(0, 1 - brightness) }} />
      <div className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-100 mix-blend-overlay bg-white" style={{ opacity: Math.max(0, brightness - 1) }} />

      {/* Plyr Instance */}
      <div className="relative z-0 h-full">
        {!isClient ? (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <Loader2 className="w-10 h-10 animate-spin text-red-600" />
          </div>
        ) : (
          <Plyr ref={plyrRef} source={videoSrc} options={options} />
        )}
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
        <span className="text-[10px] text-white/50 bg-black/40 px-2 rounded">Slide vertically for volume • Slide horizontally to seek (fullscreen mode)</span>
      </div>
    </div>
  );
}
