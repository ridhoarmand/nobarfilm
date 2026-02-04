'use client';

import { useEffect, useRef } from 'react';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { UnifiedMediaCardSkeleton } from '@/components/cards/UnifiedMediaCardSkeleton';
import { UnifiedErrorDisplay } from '@/components/common/UnifiedErrorDisplay';
import { useInfiniteFlickReelsDramas } from '@/hooks/useFlickReels';
import { Loader2 } from 'lucide-react';

interface InfiniteFlickReelsSectionProps {
  title: string;
}

export function InfiniteFlickReelsSection({ title }: InfiniteFlickReelsSectionProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useInfiniteFlickReelsDramas();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten pages and filter valid dramas
  const allDramas = data?.pages.flatMap((page) => (page.data?.list || []).filter((item) => item.playlet_id !== 0 && item.title && item.cover && item.title !== 'Untitled')) || [];

  if (isError) {
    return (
      <section>
        <h2 className="font-display font-bold text-xl md:text-2xl text-foreground mb-4">{title}</h2>
        <UnifiedErrorDisplay title={`Gagal Memuat ${title}`} message="Tidak dapat mengambil data drama." onRetry={() => refetch()} />
      </section>
    );
  }

  if (isLoading || !data) {
    return (
      <section className="space-y-4">
        <div className="h-7 md:h-8 w-48 bg-white/10 rounded-lg animate-pulse mb-4" />
        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 min-[540px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 md:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <UnifiedMediaCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-display font-bold text-xl md:text-2xl text-foreground mb-4">{title}</h2>

      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 min-[540px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 md:gap-4">
        {allDramas.map((drama, index) => (
          <UnifiedMediaCard
            key={`${drama.playlet_id}-${index}`}
            index={index}
            title={drama.title}
            cover={drama.cover}
            link={`/drama/flickreels/${drama.playlet_id}`}
            episodes={drama.upload_num ? parseInt(drama.upload_num) : 0}
            topRightBadge={drama.hot_num ? { text: drama.hot_num, isTransparent: true } : null}
            topLeftBadge={drama.status === '2' ? { text: 'Ongoing', color: '#EAB308' } : null}
          />
        ))}
      </div>

      {/* Loading Indicator & Trigger */}
      <div ref={loadMoreRef} className="py-8 flex justify-center w-full">
        {isFetchingNextPage ? (
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        ) : hasNextPage ? (
          <div className="h-4" /> // Invisible trigger
        ) : (
          <p className="text-muted-foreground text-sm">Sudah mencapai akhir daftar</p>
        )}
      </div>
    </section>
  );
}
