'use client';
import { useMeloloLatest, useMeloloTrending } from '@/hooks/useMelolo';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { UnifiedErrorDisplay } from '@/components/common/UnifiedErrorDisplay';
import { InfiniteMeloloSection } from '@/components/sections/InfiniteMeloloSection';
import { HorizontalMediaSlider } from '@/components/shared/HorizontalMediaSlider';
import { UnifiedMediaCardSkeleton } from '@/components/cards/UnifiedMediaCardSkeleton';

function MeloloSectionSkeleton() {
  return (
    <section className="space-y-4">
      <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-none w-36 sm:w-40 md:w-48 lg:w-52 snap-start">
            <UnifiedMediaCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}

export function MeloloHome() {
  const { data: latestData, isLoading: loadingLatest, error: errorLatest } = useMeloloLatest();

  const { data: trendingData, isLoading: loadingTrending, error: errorTrending } = useMeloloTrending();

  const trendingBooks = (trendingData?.books || []).filter((book, index, list) => list.findIndex((item) => item.book_id === book.book_id) === index);
  const latestBooks = (latestData?.books || []).filter((book, index, list) => list.findIndex((item) => item.book_id === book.book_id) === index);

  if (errorLatest || errorTrending) {
    return <UnifiedErrorDisplay onRetry={() => window.location.reload()} />;
  }

  if (loadingLatest || loadingTrending) {
    return (
      <div className="space-y-8 animate-fade-in">
        <MeloloSectionSkeleton />
        <MeloloSectionSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Trending Section */}
      {trendingBooks.length > 0 && (
        <HorizontalMediaSlider title={<h2 className="font-display font-bold text-xl md:text-2xl text-foreground">Sedang Hangat</h2>}>
          {trendingBooks.map((book, index) => (
            <div key={book.book_id} className="flex-none w-36 sm:w-40 md:w-48 lg:w-52 snap-start">
              <UnifiedMediaCard title={book.book_name} cover={book.thumb_url} link={`/dracin/melolo/${book.book_id}`} episodes={book.serial_count || 0} topLeftBadge={null} index={index} />
            </div>
          ))}
        </HorizontalMediaSlider>
      )}

      {/* Latest Section */}
      {latestBooks.length > 0 && (
        <HorizontalMediaSlider title={<h2 className="font-display font-bold text-xl md:text-2xl text-foreground">Rilis Baru</h2>}>
          {latestBooks.map((book, index) => (
            <div key={book.book_id} className="flex-none w-36 sm:w-40 md:w-48 lg:w-52 snap-start">
              <UnifiedMediaCard title={book.book_name} cover={book.thumb_url} link={`/dracin/melolo/${book.book_id}`} episodes={book.serial_count || 0} topLeftBadge={null} index={index} />
            </div>
          ))}
        </HorizontalMediaSlider>
      )}

      {/* Infinite Scroll Section */}
      <InfiniteMeloloSection title="Lainnya" />

      {!loadingLatest && !loadingTrending && !latestBooks.length && !trendingBooks.length && <div className="text-center py-20 text-muted-foreground">Tidak ada konten tersedia saat ini.</div>}
    </div>
  );
}
