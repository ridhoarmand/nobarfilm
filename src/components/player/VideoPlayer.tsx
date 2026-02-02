'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import 'plyr-react/plyr.css';

// Dynamic import Plyr to prevent SSR issues
const Plyr = dynamic(() => import('plyr-react').then((mod) => mod.Plyr), {
  ssr: false,
  loading: () => (
    <div className="aspect-video bg-black flex items-center justify-center">
      <p className="text-white">Loading player...</p>
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
}

export function VideoPlayer({ src, subtitles = [], poster, onEnded }: VideoPlayerProps) {
  const plyrRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const videoSrc = {
    type: 'video' as const,
    sources: [
      {
        src: src,
        type: 'video/mp4',
      },
    ],
    poster: poster,
    tracks: subtitles.map((sub) => ({
      kind: 'captions' as const,
      label: sub.label,
      srcLang: sub.srcLang,
      src: sub.src,
      default: sub.default,
    })),
  };

  const options = {
    controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
    settings: ['captions', 'quality', 'speed'],
    quality: {
      default: 720,
      options: [360, 480, 720, 1080],
    },
    captions: {
      active: true,
      update: true,
      language: 'in_id', // Default to Indonesian subtitles
    },
    fullscreen: {
      enabled: true,
      fallback: true,
      iosNative: true,
    },
    autoplay: false,
    seekTime: 10,
    storage: {
      enabled: true,
      key: 'nobarfilm_player',
    },
  };

  // Handle player events
  useEffect(() => {
    if (plyrRef.current?.plyr) {
      const player = plyrRef.current.plyr;

      player.on('ended', () => {
        if (onEnded) onEnded();
      });

      return () => {
        player.off('ended');
      };
    }
  }, [onEnded]);

  if (!isClient) {
    return (
      <div className="aspect-video bg-black flex items-center justify-center">
        <p className="text-white">Loading player...</p>
      </div>
    );
  }

  return (
    <div className="plyr-container">
      <Plyr ref={plyrRef} source={videoSrc} options={options} />
    </div>
  );
}
