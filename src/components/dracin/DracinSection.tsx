'use client';import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { UnifiedMediaCardSkeleton } from '@/components/cards/UnifiedMediaCardSkeleton';
import { UnifiedErrorDisplay } from '@/components/common/UnifiedErrorDisplay';
import type { Drama } from '@/types/drama';

interface DramaSectionProps {
  title: string;
  dramas?: Drama[];
  isLoading?: boolean;
  error?: boolean; // New prop
  onRetry?: () => void; // New prop
}

export function DracinSection({ title, dramas, isLoading, error, onRetry }: DramaSectionProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -900 : 900;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (error) {
    return (
      <section>
        <h2 className="font-display font-bold text-xl md:text-2xl text-foreground mb-4">{title}</h2>
        <UnifiedErrorDisplay title={`Gagal Memuat ${title}`} message="Tidak dapat mengambil data drama." onRetry={onRetry} />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="h-7 md:h-8 w-48 bg-white/10 rounded-lg animate-pulse mb-4" />

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex-none w-36 sm:w-40 md:w-48 lg:w-52 snap-start">
              <UnifiedMediaCardSkeleton />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl md:text-2xl text-foreground">{title}</h2>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => scroll('left')} className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition" aria-label={`Previous ${title}`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => scroll('right')} className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition" aria-label={`Next ${title}`}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div ref={sliderRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
        {dramas?.slice(0, 18).map((drama, index) => {
          const isPopular = drama.corner?.name?.toLowerCase().includes('populer');
          const badgeColor = isPopular ? '#E52E2E' : drama.corner?.color || '#e5a00d';

          return (
            <div key={`${drama.bookId || 'drama'}-${index}`} className="flex-none w-36 sm:w-40 md:w-48 lg:w-52 snap-start">
              <UnifiedMediaCard
                index={index}
                title={drama.bookName}
                cover={drama.coverWap || drama.cover || ''}
                link={`/dracin/dramabox/${drama.bookId}`}
                episodes={drama.chapterCount}
                topLeftBadge={
                  drama.corner
                    ? {
                        text: drama.corner.name,
                        color: badgeColor,
                      }
                    : null
                }
                topRightBadge={
                  drama.rankVo
                    ? {
                        text: drama.rankVo.hotCode,
                        isTransparent: true,
                      }
                    : null
                }
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
