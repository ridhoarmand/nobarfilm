'use client';
import { useFreeReelsHome, useFreeReelsAnime, FreeReelsModule, FreeReelsItem } from '@/hooks/useFreeReels';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { UnifiedMediaCardSkeleton } from '@/components/cards/UnifiedMediaCardSkeleton';
import { UnifiedErrorDisplay } from '@/components/common/UnifiedErrorDisplay';
import { InfiniteFreeReelsSection } from '@/components/sections/InfiniteFreeReelsSection';
import { HorizontalMediaSlider } from '@/components/shared/HorizontalMediaSlider';

// Helper to extract items from a module, handling special cases like 'recommend'
function getModuleItems(module: FreeReelsModule): FreeReelsItem[] {
  if (module.type === 'recommend' && module.items && module.items.length > 0) {
    // Check for nested module_card
    const firstItem = module.items[0];
    if (firstItem.module_card && firstItem.module_card.items) {
      return firstItem.module_card.items as FreeReelsItem[];
    }
  }
  return module.items || [];
}

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

// Helper to clean title (remove emojis)
function cleanTitle(title: string): string {
  // Removes standard emojis and specific ones like 🎉
  return title.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
}

export function FreeReelsHome() {
  const { data: homeData, isLoading: loadingHome, error: errorHome, refetch: refetchHome } = useFreeReelsHome();

  const { data: animeData, isLoading: loadingAnime, error: errorAnime, refetch: refetchAnime } = useFreeReelsAnime();

  if (errorHome && errorAnime) {
    return (
      <UnifiedErrorDisplay
        onRetry={() => {
          if (errorHome) refetchHome();
          if (errorAnime) refetchAnime();
        }}
      />
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* SECTION: Homepage Modules */}
      {loadingHome ? (
        <SectionLoader count={6} titleWidth="w-40" />
      ) : (
        homeData?.data?.items
          ?.filter((module) => module.type !== 'coming_soon')
          .map((module, mIdx) => {
            const items = getModuleItems(module);
            if (!items || items.length === 0) return null;

            // Skip if all items are invalid
            const validItems = items.filter((item) => item.title && item.cover);
            if (validItems.length === 0) return null;

            const title = (module.module_name ? cleanTitle(module.module_name) : '') || 'Rekomendasi Untukmu';

            return (
              <HorizontalMediaSlider key={`home-module-${mIdx}`} title={<h2 className="font-display font-bold text-xl md:text-2xl text-foreground">{title}</h2>}>
                {validItems.map((item, idx) => (
                  <div key={`${item.key}-home-${mIdx}-${idx}`} className="flex-none w-36 sm:w-40 md:w-48 lg:w-52 snap-start">
                    <UnifiedMediaCard
                      title={item.title}
                      cover={item.cover}
                      link={`/dracin/freereels/${item.key}`}
                      episodes={item.episode_count || 0}
                      topRightBadge={item.follow_count ? { text: `${(item.follow_count / 1000).toFixed(1)}k`, isTransparent: true } : null}
                    />
                  </div>
                ))}
              </HorizontalMediaSlider>
            );
          })
      )}

      {/* SECTION: Anime Modules */}
      {loadingAnime ? (
        <SectionLoader count={6} titleWidth="w-40" />
      ) : (
        animeData?.data?.items &&
        animeData.data.items.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl md:text-2xl text-foreground">Anime</h2>
            </div>

            <div className="space-y-8">
              {animeData.data.items.map((module, mIdx) => {
                const items = getModuleItems(module);
                if (!items || items.length === 0) return null;

                const validItems = items.filter((item) => item.title && item.cover);
                if (validItems.length === 0) return null;

                const moduleTitle = module.module_name && cleanTitle(module.module_name) !== '' ? cleanTitle(module.module_name) : null;

                return (
                  <HorizontalMediaSlider key={`anime-module-${mIdx}`} title={moduleTitle ? <h3 className="font-display font-semibold text-lg text-foreground/90">{moduleTitle}</h3> : <span />}>
                    {validItems.map((item, idx) => (
                      <div key={`${item.key}-anime-${mIdx}-${idx}`} className="flex-none w-36 sm:w-40 md:w-48 lg:w-52 snap-start">
                        <UnifiedMediaCard
                          title={item.title}
                          cover={item.cover}
                          link={`/dracin/freereels/${item.key}`}
                          episodes={item.episode_count || 0}
                          topRightBadge={item.follow_count ? { text: `${(item.follow_count / 1000).toFixed(1)}k`, isTransparent: true } : null}
                        />
                      </div>
                    ))}
                  </HorizontalMediaSlider>
                );
              })}
            </div>
          </section>
        )
      )}

      {/* SECTION: Infinite Scroll / Lainnya */}
      <InfiniteFreeReelsSection title="Lainnya" />
    </div>
  );
}
