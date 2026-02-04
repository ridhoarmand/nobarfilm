"use client";

import { useFlickReelsLatest, useFlickReelsHotRank } from "@/hooks/useFlickReels";
import { UnifiedMediaCard } from "@/components/cards/UnifiedMediaCard";
import { UnifiedMediaCardSkeleton } from "@/components/cards/UnifiedMediaCardSkeleton";
import { AlertCircle } from "lucide-react";
import { UnifiedErrorDisplay } from "@/components/common/UnifiedErrorDisplay";
import { InfiniteFlickReelsSection } from "@/components/sections/InfiniteFlickReelsSection";

// Helper Component for Section Skeleton
function SectionLoader({ count = 6, titleWidth = "w-48" }: { count?: number, titleWidth?: string }) {
  return (
    <section className="space-y-4">
      {/* Title Skeleton */}
      <div className={`h-7 md:h-8 ${titleWidth} bg-white/10 rounded-lg animate-pulse`} />
      
      {/* Grid Skeleton - Matches main grid exactly */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <UnifiedMediaCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function FlickReelsHome() {


  const { 
    data: latestData, 
    isLoading: loadingLatest, 
    error: errorLatest, 
    refetch: refetchLatest 
  } = useFlickReelsLatest();

  const { 
    data: hotRankData, 
    isLoading: loadingHotRank, 
    error: errorHotRank, 
    refetch: refetchHotRank 
  } = useFlickReelsHotRank();

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
          <section key={section.name || sIdx} className="space-y-4">
             <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl md:text-2xl text-foreground flex items-center gap-2">
                {section.name}
              </h2>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
              {section.data?.filter(item => item.title && item.cover).map((item, idx) => (
                <div key={`${item.playlet_id}-${idx}`} className="relative">
                   <UnifiedMediaCard
                    title={item.title}
                    cover={item.cover}
                    link={`/drama/flickreels/${item.playlet_id}`}
                    episodes={item.upload_num ? parseInt(item.upload_num) : 0}
                    topRightBadge={item.hot_num ? { text: item.hot_num, isTransparent: true } : null}
                  />
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {/* SECTION: Latest / Terbaru */}
      {loadingLatest ? (
         <SectionLoader count={12} titleWidth="w-48" />
      ) : (
        latestData?.data?.map((section, idx) => (
          <section key={idx} className="space-y-4">
             {section.title && (
               <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl md:text-2xl text-foreground">
                  {section.title}
                </h2>
              </div>
             )}
             
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
               {section.list?.filter(item => item.title && item.cover).map((item, i) => (
                 <UnifiedMediaCard
                    key={`${item.playlet_id}-${i}`}
                    title={item.title}
                    cover={item.cover}
                    link={`/drama/flickreels/${item.playlet_id}`}
                    episodes={item.upload_num ? parseInt(item.upload_num) : 0}
                    topRightBadge={null}
                  />
               ))}
             </div>
          </section>
        ))
      )}

      {/* SECTION: Infinite Scroll / Lainnya */}
      <InfiniteFlickReelsSection title="Lainnya" />

    </div>
  );
}
