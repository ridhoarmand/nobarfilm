'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { UnifiedMediaCardSkeleton } from '@/components/cards/UnifiedMediaCardSkeleton';
import { useInfiniteMovieBoxRankingList } from '@/hooks/useMovieBox';
import { Film, AlertCircle, Loader2 } from 'lucide-react';

function RankingListContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const title = searchParams.get('title') || 'Daftar Kategori Lengkap';

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteMovieBoxRankingList(id);

  const allItems = data?.pages.flatMap((page) => page.items) || [];

  return (
    <main className="bg-[#141414] min-h-screen pt-24 px-4 sm:px-6 lg:px-8 pb-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/30">
              <Film className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {title}
              </h1>
              <p className="text-zinc-400 text-sm mt-0.5">
                Koleksi dan urutan tayangan terbaik dalam kategori ini
              </p>
            </div>
          </div>
          {allItems.length > 0 && (
            <span className="hidden sm:inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-semibold">
              {allItems.length} Judul Tersedia
            </span>
          )}
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(18)].map((_, index) => (
              <UnifiedMediaCardSkeleton key={index} />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-gradient-to-r from-red-600/10 to-orange-600/10 border border-red-600/30 rounded-2xl p-6 mb-8 text-center max-w-xl mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <h3 className="text-white font-semibold text-lg mb-2">Gagal Memuat Kategori</h3>
            <p className="text-gray-300 text-sm mb-4">
              {error?.message || 'Terjadi masalah saat mengambil data kategori dari server.'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-red-600/30"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Content Grid */}
        {!isLoading && !isError && allItems.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {allItems.map((movie, index) => (
                <UnifiedMediaCard
                  key={`${movie.subjectId}-${index}`}
                  title={movie.title}
                  cover={movie.cover.url}
                  link={`/${movie.subjectId}`}
                  topLeftBadge={{
                    text: movie.subjectType === 1 ? 'Movie' : 'Series',
                    color: movie.subjectType === 1 ? '#E52E2E' : '#2E7DE5',
                  }}
                  topRightBadge={
                    movie.imdbRatingValue && !isNaN(parseFloat(movie.imdbRatingValue)) && parseFloat(movie.imdbRatingValue) > 0
                      ? {
                          text: parseFloat(movie.imdbRatingValue).toFixed(1),
                          color: '#F59E0B',
                        }
                      : null
                  }
                  index={index}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-8 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-white font-bold rounded-2xl text-sm transition-all shadow-xl inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                      <span>Memuat Lebih Banyak...</span>
                    </>
                  ) : (
                    <span>Tampilkan Lebih Banyak</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && !isError && allItems.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            <Film className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-base font-semibold">Belum ada film dalam kategori ini.</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function RankingListPage() {
  return (
    <>
      <Navbar />
      <Suspense
        fallback={
          <main className="bg-[#141414] min-h-screen pt-24 px-4 sm:px-6 lg:px-8 pb-16">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...Array(18)].map((_, index) => (
                  <UnifiedMediaCardSkeleton key={index} />
                ))}
              </div>
            </div>
          </main>
        }
      >
        <RankingListContent />
      </Suspense>
      <Footer />
    </>
  );
}
