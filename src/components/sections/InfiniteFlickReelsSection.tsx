'use client';
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
        {allDramas.map((drama, index) => (
          <UnifiedMediaCard
            key={`${drama.playlet_id}-${index}`}
            index={index}
            title={drama.title}
            cover={drama.cover}
            link={`/dracin/flickreels/${drama.playlet_id}`}
            episodes={drama.upload_num ? parseInt(drama.upload_num) : 0}
            topRightBadge={drama.hot_num ? { text: drama.hot_num, isTransparent: true } : null}
            topLeftBadge={drama.status === '2' ? { text: 'Ongoing', color: '#EAB308' } : null}
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
