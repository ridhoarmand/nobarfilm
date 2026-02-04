'use client';

import { useFlickReelsLatest, useFlickReelsHotRank } from '@/hooks/useFlickReels';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { UnifiedMediaCardSkeleton } from '@/components/cards/UnifiedMediaCardSkeleton';
import { UnifiedErrorDisplay } from '@/components/common/UnifiedErrorDisplay';
import { InfiniteFlickReelsSection } from '@/components/sections/InfiniteFlickReelsSection';
import { HorizontalMediaSlider } from '@/components/shared/HorizontalMediaSlider';

// Helper Component for Section Skeleton
function SectionLoader({ count = 6, titleWidth = 'w-48' }: { count?: number; titleWidth?: string }) {
  return (
    <section className="space-y-4">
      {/* Title Skeleton */}
      <div className={`h-7 md:h-8 ${titleWidth} bg-white/10 rounded-lg animate-pulse`} />

      {/* Slider Skeleton */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex-none w-36 sm:w-40 md:w-48 lg:w-52 snap-start">
            <UnifiedMediaCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}

export function FlickReelsHome() {
  const { data: latestData, isLoading: loadingLatest, error: errorLatest, refetch: refetchLatest } = useFlickReelsLatest();

  const { data: hotRankData, isLoading: loadingHotRank, error: errorHotRank, refetch: refetchHotRank } = useFlickReelsHotRank();

  if (errorLatest || errorHotRank) {
    return (
      <UnifiedErrorDisplay
        onRetry={() => {
          if (errorLatest) refetchLatest();
          if (errorHotRank) refetchHotRank();
        }}
      />
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* SECTION: Hot Rank / Peringkat Populer */}
      {loadingHotRank ? (
        <SectionLoader count={6} titleWidth="w-40" />
      ) : (
        hotRankData?.data?.map((section, sIdx) => (
          <HorizontalMediaSlider
            key={section.name || sIdx}
            title={<h2 className="font-display font-bold text-xl md:text-2xl text-foreground flex items-center gap-2">{section.name}</h2>}
          >
            {section.data
              ?.filter((item) => item.title && item.cover)
              .map((item, idx) => (
                <div key={`${item.playlet_id}-${idx}`} className="flex-none w-36 sm:w-40 md:w-48 lg:w-52 snap-start">
                  <UnifiedMediaCard
                    title={item.title}
                    cover={item.cover}
                    link={`/drama/flickreels/${item.playlet_id}`}
                    episodes={item.upload_num ? parseInt(item.upload_num) : 0}
                    topRightBadge={item.hot_num ? { text: item.hot_num, isTransparent: true } : null}
                  />
                </div>
              ))}
          </HorizontalMediaSlider>
        ))
      )}

      {/* SECTION: Latest / Terbaru */}
      {loadingLatest ? (
        <SectionLoader count={12} titleWidth="w-48" />
      ) : (
        latestData?.data?.map((section, idx) => (
          <HorizontalMediaSlider
            key={idx}
            title={section.title ? <h2 className="font-display font-bold text-xl md:text-2xl text-foreground">{section.title}</h2> : null}
          >
            {section.list
              ?.filter((item) => item.title && item.cover)
              .map((item, i) => (
                <div key={`${item.playlet_id}-${i}`} className="flex-none w-36 sm:w-40 md:w-48 lg:w-52 snap-start">
                  <UnifiedMediaCard
                    title={item.title}
                    cover={item.cover}
                    link={`/drama/flickreels/${item.playlet_id}`}
                    episodes={item.upload_num ? parseInt(item.upload_num) : 0}
                    topRightBadge={null}
                  />
                </div>
              ))}
          </HorizontalMediaSlider>
        ))
      )}

      {/* SECTION: Infinite Scroll / Lainnya */}
      <InfiniteFlickReelsSection title="Lainnya" />
    </div>
  );
}
