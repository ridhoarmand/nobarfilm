'use client';import Link from 'next/link';
import Image from 'next/image';
import { Play } from 'lucide-react';

export interface BadgeConfig {
  text: string;
  color?: string; // Background color (e.g., "#E52E2E" or "hsl(var(--primary))")
  textColor?: string; // Text color (default white)
  isTransparent?: boolean; // If true, uses black/60 backdrop
}

export interface UnifiedMediaCardProps {
  title: string;
  cover: string;
  link: string;
  episodes?: number;
  topLeftBadge?: BadgeConfig | null;
  topRightBadge?: BadgeConfig | null;
  index?: number;
}

export function UnifiedMediaCard({ title, cover, link, episodes = 0, topLeftBadge, topRightBadge, index = 0 }: UnifiedMediaCardProps) {
  const BADGE_BASE = 'px-2 py-1 rounded font-semibold text-white shadow-sm leading-none flex items-center justify-center font-sans text-xs 2xl:text-sm';

  const BADGE_FONT = {
    lineHeight: '1',
    fontFamily: 'inherit',
  };

  return (
    <Link href={link} className="group relative block min-w-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500" style={{ animationDelay: `${index * 50}ms` }}>
      {/* Visual Container */}
      <div className="aspect-[2/3] relative overflow-hidden rounded-xl bg-muted/20" style={{ position: 'relative' }}>
        {cover ? <Image unoptimized
          src={cover}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 240px"
          className="object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-105"
        /> : <div className="flex h-full items-center justify-center p-4 text-center text-sm text-zinc-500">Poster belum tersedia</div>}
        {/* Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* Badges Container - Flexbox to prevent overlap */}
        <div className="absolute top-1.5 left-1.5 right-1.5 md:top-2 md:left-2 md:right-2 flex justify-between items-start pointer-events-none z-10">
          {/* Top Left Badge - Allowed to truncate */}
          <div className="flex-1 min-w-0 pr-1 flex justify-start">
            {topLeftBadge && (
              <div
                className={`${BADGE_BASE} truncate max-w-full`}
                style={{
                  ...BADGE_FONT,
                  backgroundColor: topLeftBadge.color || '#E52E2E',
                  color: topLeftBadge.textColor || '#FFFFFF',
                }}
              >
                {topLeftBadge.text}
              </div>
            )}
          </div>

          {/* Top Right Badge - Fixed width/Shrink 0 */}
          <div className="shrink-0 flex justify-end">
            {topRightBadge && (
              <div
                className={`${BADGE_BASE} ${topRightBadge.isTransparent ? 'backdrop-blur-sm' : ''}`}
                style={{
                  ...BADGE_FONT,
                  backgroundColor: topRightBadge.isTransparent ? 'rgba(0,0,0,0.6)' : topRightBadge.color || 'rgba(0,0,0,0.6)',
                  color: topRightBadge.textColor || '#FFFFFF',
                }}
              >
                {topRightBadge.text}
              </div>
            )}
          </div>
        </div>

        {/* Episode Count */}
        {episodes > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-xs 2xl:text-sm text-white font-medium pointer-events-none">
            <Play className="w-3.5 h-3.5 fill-white" aria-hidden="true" />
            <span>{episodes} episode</span>
          </div>
        )}

        {/* Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
            <Play className="w-4 h-4 md:w-5 md:h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="pt-2 md:pt-3 pb-1">
        <h3 className="font-display font-semibold text-sm 2xl:text-base leading-snug line-clamp-2 min-h-10 2xl:min-h-12 text-foreground group-hover:text-primary group-focus-visible:text-primary transition-colors">{title}</h3>
      </div>
    </Link>
  );
}
