'use client';

import { PlatformSelector } from '@/components/features/PlatformSelector';
import { DramaSection } from '@/components/sections/DramaSection';
import { ReelShortSection } from '@/components/sections/ReelShortSection';
import { NetShortHome } from '@/components/sections/NetShortHome';
import { MeloloHome } from '@/components/sections/MeloloHome';
import { FlickReelsHome } from '@/components/sections/FlickReelsHome';
import { FreeReelsHome } from '@/components/sections/FreeReelsHome';
import { useLatestDramas, useTrendingDramas, useDubindoDramas } from '@/hooks/useDramas';
import { usePlatform } from '@/hooks/usePlatform';
import { InfiniteDramaSection } from '@/components/sections/InfiniteDramaSection';

export default function HomeContent() {
  const { isDramaBox, isReelShort, isNetShort, isMelolo, isFlickReels, isFreeReels } = usePlatform();

  // Fetch data for all DramaBox sections
  // const { data: popularDramas, isLoading: loadingPopular, error: errorPopular, refetch: refetchPopular } = useForYouDramas(); // REMOVED as requested (replaced by infinite scroll)
  const { data: latestDramas, isLoading: loadingLatest, error: errorLatest, refetch: refetchLatest } = useLatestDramas();
  const { data: trendingDramas, isLoading: loadingTrending, error: errorTrending, refetch: refetchTrending } = useTrendingDramas();
  const { data: dubindoDramas, isLoading: loadingDubindo, error: errorDubindo, refetch: refetchDubindo } = useDubindoDramas();

  return (
    <main className="pt-14">
      {/* Platform Selector removed - handled in layout */}

      {/* DramaBox Content - Multiple Sections */}
      {isDramaBox && (
        <div className="container px-4 py-6 space-y-8 max-w-[2400px]">
          <DramaSection title="Terbaru" dramas={latestDramas} isLoading={loadingLatest} error={!!errorLatest} onRetry={() => refetchLatest()} />
          <DramaSection title="Terpopuler" dramas={trendingDramas} isLoading={loadingTrending} error={!!errorTrending} onRetry={() => refetchTrending()} />
          <DramaSection title="Dubindo" dramas={dubindoDramas} isLoading={loadingDubindo} error={!!errorDubindo} onRetry={() => refetchDubindo()} />

          {/* Infinite Scroll Section */}
          <InfiniteDramaSection title="Lainnya" />
        </div>
      )}

      {/* ReelShort Content - Multiple Sections */}
      {isReelShort && (
        <div className="container px-4 py-6 space-y-8 max-w-[2400px]">
          <ReelShortSection />
        </div>
      )}

      {/* NetShort Content */}
      {isNetShort && (
        <div className="container px-4 py-6 space-y-8 max-w-[2400px]">
          <NetShortHome />
        </div>
      )}

      {/* Melolo Content */}
      {isMelolo && (
        <div className="container px-4 py-6 space-y-8 max-w-[2400px]">
          <MeloloHome />
        </div>
      )}

      {/* FlickReels Content */}
      {isFlickReels && (
        <div className="container px-4 py-6 space-y-8 max-w-[2400px]">
          <FlickReelsHome />
        </div>
      )}

      {/* FreeReels Content */}
      {isFreeReels && (
        <div className="container px-4 py-6 space-y-8 max-w-[2400px]">
          <FreeReelsHome />
        </div>
      )}
    </main>
  );
}
