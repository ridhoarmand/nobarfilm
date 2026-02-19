'use client';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { UnifiedMediaCardSkeleton } from '@/components/cards/UnifiedMediaCardSkeleton';
import { UnifiedErrorDisplay } from '@/components/common/UnifiedErrorDisplay';
import { useInfiniteFreeReelsDramas } from '@/hooks/useFreeReels';
import { Loader2 } from 'lucide-react';

interface InfiniteFreeReelsSectionProps {
  title: string;
}

export function InfiniteFreeReelsSection({ title }: InfiniteFreeReelsSectionProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useInfiniteFreeReelsDramas();

  // Flatten pages
  const allDramas = data?.pages.flatMap((page) => (page.data?.items || []).filter((item) => item.title && item.cover)) || [];

  if (isError) {
    return (
      <section>
        <h2 className="font-display font-bold text-xl md:text-2xl text-foreground mb-4">{title}</h2>
        <UnifiedErrorDisplay title={`Gagal Memuat ${title}`} message="Tidak dapat mengambil data drama." onRetry={() => refetch()} />
      </section>
    );
  }

  // Show skeleton when loading or no data
  if (isLoading || !data) {
    return (
      <section className="space-y-4">
        <div className="h-7 md:h-8 w-48 bg-white/10 rounded-lg animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {allDramas.map((item, index) => (
          <UnifiedMediaCard
            key={`${item.key}-${index}`}
            index={index}
            title={item.title}
            cover={item.cover}
            link={`/dracin/freereels/${item.key}`}
            episodes={item.episode_count || 0}
            topRightBadge={item.follow_count ? { text: `${(item.follow_count / 1000).toFixed(1)}k`, isTransparent: true } : null}
            topLeftBadge={null}
          />
        ))}
      </div>

      <div className="py-10 flex justify-center w-full">
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-white">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Memuat lagi...</span>
          </div>
        ) : hasNextPage ? (
          <button
            onClick={() => fetchNextPage()}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-900/20"
          >
            Muat Lagi
          </button>
        ) : (
          <p className="text-muted-foreground text-sm">Sudah mencapai akhir daftar</p>
        )}
      </div>
    </section>
  );
}
