'use client';

import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { UnifiedMediaCardSkeleton } from '@/components/cards/UnifiedMediaCardSkeleton';
import { UnifiedErrorDisplay } from '@/components/common/UnifiedErrorDisplay';
import { useInfiniteMeloloDramas } from '@/hooks/useMelolo';
import { Loader2 } from 'lucide-react';

interface InfiniteMeloloSectionProps {
  title: string;
}

export function InfiniteMeloloSection({ title }: InfiniteMeloloSectionProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useInfiniteMeloloDramas();

  // Flatten pages into a single array of books
  const allBooks = data?.pages.flatMap((page) => page.books) || [];

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
          {Array.from({ length: 16 }).map((_, i) => (
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
        {allBooks.map((book, index) => (
          <UnifiedMediaCard
            key={`${book.book_id}-${index}`}
            index={index}
            title={book.book_name}
            cover={book.thumb_url}
            link={`/dracin/melolo/${book.book_id}`}
            episodes={book.serial_count || 0}
            topLeftBadge={null} // Melolo doesn't seemingly have top-left badges in the list
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
