'use client';

import { useEffect, useRef, forwardRef, useSyncExternalStore } from 'react';
import Hls from 'hls.js';
import { usePlaybackSpeed } from './hooks/usePlaybackSpeed';

interface MoviePlayerProps {
  src: string;
  subtitles?: Array<{
    kind: string;
    label: string;
    srcLang: string;
    src: string;
    default?: boolean;
  }>;
  activeSubtitleIndex?: number | null;
  subtitleDelay?: number;
  subtitlePosition?: number;
  poster?: string;
  onEnded?: () => void;
  onProgress?: (time: number, duration: number) => void;
  initialTime?: number;
  autoPlay?: boolean;
}

export const MoviePlayer = forwardRef<HTMLVideoElement, MoviePlayerProps>(({
  src,
  subtitles = [],
  activeSubtitleIndex,
  subtitleDelay = 0,
  subtitlePosition = 85,
  poster,
  onEnded,
  onProgress,
  initialTime = 0,
  autoPlay = false
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Client-side detection without SSR mismatch
  const isClient = useSyncExternalStore(() => () => {}, () => true, () => false);

  // Speed persistence hook
  const { speed, setSpeed } = usePlaybackSpeed();

  // Normalize source URL
  const currentSrc = typeof src === 'string' ? src : (src as { src: string }).src;

  // Handle native player setup & sync
  const hasResumed = useRef(false);
  useEffect(() => {
    if (videoRef.current) {
      // Restore playback speed
      videoRef.current.playbackRate = speed;

      // Restore watch progress once
      if (initialTime > 0 && !hasResumed.current) {
        videoRef.current.currentTime = initialTime;
        hasResumed.current = true;
      }
    }
  }, [speed, initialTime]);

  // Handle stream loading via hls.js (only for .m3u8) with native fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSrc) return;

    let hls: Hls | null = null;
    const lowerSrc = currentSrc.toLowerCase();
    const isHls = lowerSrc.includes('.m3u8') || lowerSrc.includes('format=m3u8');

    if (isHls && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hls.loadSource(currentSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR || data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
            console.warn('[HLS] Stream is not HLS manifest, falling back to native src load');
            hls?.destroy();
            hls = null;
            video.src = currentSrc;
            if (autoPlay) video.play().catch(() => {});
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
              video.src = currentSrc;
              if (autoPlay) video.play().catch(() => {});
              break;
          }
        }
      });
    } else {
      video.src = currentSrc;
      if (autoPlay) {
        video.play().catch(() => {});
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentSrc, autoPlay]);

  // Handle active subtitle track selection & position styling
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
        line: ${subtitlePosition}%;
        font-size: 1.1rem;
        background: rgba(0, 0, 0, 0.75);
        color: #ffffff;
        text-shadow: 0 1px 2px rgba(0,0,0,0.9);
      }
    `;

    const timer = setTimeout(() => {
      for (let i = 0; i < video.textTracks.length; i++) {
        if (activeSubtitleIndex === i) {
          video.textTracks[i].mode = 'showing';
        } else {
          video.textTracks[i].mode = 'disabled';
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [activeSubtitleIndex, subtitles, subtitlePosition]);

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

  if (!isClient) return <div className="relative w-full aspect-video bg-black rounded-xl" />;

  return (
    <div className="relative w-full max-w-7xl aspect-video rounded-xl overflow-hidden shadow-2xl mx-auto bg-black border border-zinc-850">
      <video
        ref={videoRef}
        poster={poster || ''}
        controls
        playsInline
        crossOrigin="anonymous"
        className="w-full h-full object-contain bg-black block"
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          onProgress?.(video.currentTime, video.duration || 0);
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
    </div>
  );
});

MoviePlayer.displayName = 'MoviePlayer';
