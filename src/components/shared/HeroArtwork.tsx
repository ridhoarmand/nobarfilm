'use client';

import Image from 'next/image';
import { useState } from 'react';
import { isLandscapeArtwork, selectHeroArtwork } from '@/lib/heroArtwork';

interface HeroArtworkProps {
  backdropUrl?: string;
  posterUrl?: string;
  compact?: boolean;
}

export function HeroArtwork({ backdropUrl = '', posterUrl = '', compact = false }: HeroArtworkProps) {
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const [landscapeUrl, setLandscapeUrl] = useState('');
  const src = selectHeroArtwork(backdropUrl, posterUrl, failedUrls);
  const landscape = src !== '' && src === backdropUrl && src === landscapeUrl;
  const heightClass = compact
    ? landscape
      ? 'aspect-video max-h-[240px] lg:aspect-auto lg:h-auto lg:max-h-none'
      : src
      ? 'h-[180px] sm:h-[240px] max-h-[35dvh] lg:h-auto lg:max-h-none'
      : 'h-0'
    : landscape
    ? 'aspect-video max-h-[50dvh] lg:aspect-auto lg:h-auto lg:max-h-none'
    : src
    ? 'h-[300px] max-h-[50dvh] sm:h-[380px] lg:h-auto lg:max-h-none'
    : 'h-0';

  return (
    <div aria-hidden="true" className={`pointer-events-none relative w-full overflow-hidden lg:absolute lg:inset-0 ${heightClass}`}>
      {src && (
        <div className={landscape ? 'absolute inset-0' : 'absolute inset-y-4 inset-x-6 sm:inset-y-6 lg:left-[60%] lg:right-8 lg:inset-y-12 2xl:right-16'}>
          <Image
            key={src}
            unoptimized
            src={src}
            alt=""
            fill
            priority
            sizes={landscape ? '100vw' : '(min-width: 1024px) 40vw, 100vw'}
            className={landscape ? 'object-contain object-center lg:object-cover' : 'object-contain object-center'}
            onLoad={(event) => {
              if (src !== backdropUrl) return;
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (isLandscapeArtwork(naturalWidth, naturalHeight)) {
                setLandscapeUrl(src);
              } else if (posterUrl && posterUrl !== src) {
                setFailedUrls((urls) => [...urls, src]);
              }
            }}
            onError={() => setFailedUrls((urls) => [...urls, src])}
          />
        </div>
      )}
      {landscape && <>
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/10 to-transparent" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-[#141414] via-[#141414]/95 via-60% to-transparent lg:block" />
      </>}
    </div>
  );
}
