'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Search, Film, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';
import { useMovieBoxSearch, useMovieBoxTrending } from '@/hooks/useMovieBox';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { UnifiedMediaCardSkeleton } from '@/components/cards/UnifiedMediaCardSkeleton';

const POPULAR_TAGS = ['Action', 'Anime', 'Horror', 'Drama Korea', 'Marvel', 'Romance', 'Sci-Fi'];

function MovieSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const { data, isLoading, isError, error, refetch } = useMovieBoxSearch(query, 1);
  const { data: trendingData, isLoading: isLoadingTrending } = useMovieBoxTrending(1);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleChipClick = (tag: string) => {
    setSearchInput(tag);
    router.push(`/search?q=${encodeURIComponent(tag)}`);
  };

  return (
    <>
      <Navbar />
      <main className="bg-[#141414] min-h-screen pt-24 px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Search Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/30">
                <Film className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Pencarian Film & Series</h1>
                {query && (
                  <p className="text-zinc-400 text-sm mt-0.5">
                    Hasil pencarian untuk: <span className="text-red-500 font-semibold">&quot;{query}&quot;</span>
                  </p>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative mt-4">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ketik judul film, series, anime, atau aktor..."
                className="w-full px-5 py-3.5 bg-zinc-900 border border-zinc-700/80 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all shadow-xl"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
              >
                Cari
              </button>
            </form>

            {/* Quick Search Chips */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-xs text-zinc-500 font-semibold whitespace-nowrap flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-red-500" /> Populer:
              </span>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleChipClick(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap border ${
                    query.toLowerCase() === tag.toLowerCase()
                      ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(12)].map((_, index) => (
                <UnifiedMediaCardSkeleton key={index} />
              ))}
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="bg-gradient-to-r from-red-600/10 to-orange-600/10 border border-red-600/30 rounded-2xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold mb-2">Gagal Memuat Hasil Pencarian</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    {error?.message || 'Terjadi masalah saat mengambil data dari server.'}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Coba Lagi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {!isLoading && !isError && data && (
            <>
              {data.items.length > 0 ? (
                <>
                  <div className="mb-4 text-zinc-400 text-sm font-medium">
                    Menampilkan <span className="text-white font-bold">{data.items.length}</span> hasil
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {data.items.map((item, index) => (
                      <UnifiedMediaCard
                        key={`${item.subjectId}-${index}`}
                        title={item.title}
                        cover={item.cover.url}
                        link={`/${item.subjectId}`}
                        topLeftBadge={{
                          text: item.subjectType === 1 ? 'Movie' : 'Series',
                          color: item.subjectType === 1 ? '#E52E2E' : '#2E7DE5',
                        }}
                        topRightBadge={
                          item.imdbRatingValue && !isNaN(parseFloat(item.imdbRatingValue)) && parseFloat(item.imdbRatingValue) > 0
                            ? {
                                text: parseFloat(item.imdbRatingValue).toFixed(1),
                                color: '#F59E0B',
                              }
                            : null
                        }
                        index={index}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-12">
                  <div className="text-center py-12 bg-zinc-900/40 rounded-3xl border border-zinc-800/60 p-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 mb-4 text-zinc-500">
                      <Search className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Tidak Ada Hasil Ditemukan</h2>
                    <p className="text-zinc-400 text-sm max-w-md mx-auto">
                      Tidak dapat menemukan film atau series dengan kata kunci &quot;<span className="text-red-400 font-semibold">{query}</span>&quot;. Coba gunakan kata kunci lain atau pilih rekomendasi di bawah.
                    </p>
                  </div>

                  {/* Recommendations when search is empty */}
                  {trendingData?.subjectList && trendingData.subjectList.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-red-500" />
                        <h2 className="text-lg font-bold text-white">Trending Sekarang Untuk Anda</h2>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {trendingData.subjectList.slice(0, 12).map((item, index) => (
                          <UnifiedMediaCard
                            key={`${item.subjectId}-${index}`}
                            title={item.title}
                            cover={item.cover.url}
                            link={`/${item.subjectId}`}
                            topLeftBadge={{
                              text: item.subjectType === 1 ? 'Movie' : 'Series',
                              color: item.subjectType === 1 ? '#E52E2E' : '#2E7DE5',
                            }}
                            topRightBadge={
                              item.imdbRatingValue && !isNaN(parseFloat(item.imdbRatingValue)) && parseFloat(item.imdbRatingValue) > 0
                                ? {
                                    text: parseFloat(item.imdbRatingValue).toFixed(1),
                                    color: '#F59E0B',
                                  }
                                : null
                            }
                            index={index}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Empty Query Initial State */}
          {!query && !isLoading && (
            <div className="space-y-12">
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 mb-4 text-zinc-500">
                  <Search className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Cari Film & Series Favorit Anda</h2>
                <p className="text-zinc-400 text-sm max-w-md mx-auto">
                  Ketik kata kunci di atas atau pilih tag populer untuk mulai menjelajah ribuan konten.
                </p>
              </div>

              {/* Trending Suggestions */}
              {trendingData?.subjectList && trendingData.subjectList.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-red-500" />
                    <h2 className="text-lg font-bold text-white">Trending Populer Minggu Ini</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {trendingData.subjectList.slice(0, 12).map((item, index) => (
                      <UnifiedMediaCard
                        key={`${item.subjectId}-${index}`}
                        title={item.title}
                        cover={item.cover.url}
                        link={`/${item.subjectId}`}
                        topLeftBadge={{
                          text: item.subjectType === 1 ? 'Movie' : 'Series',
                          color: item.subjectType === 1 ? '#E52E2E' : '#2E7DE5',
                        }}
                        topRightBadge={
                          item.imdbRatingValue && !isNaN(parseFloat(item.imdbRatingValue)) && parseFloat(item.imdbRatingValue) > 0
                            ? {
                                text: parseFloat(item.imdbRatingValue).toFixed(1),
                                color: '#F59E0B',
                              }
                            : null
                        }
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function MovieSearchPage() {
  return (
    <Suspense
      fallback={
        <>
          <Navbar />
          <main className="bg-black min-h-screen pt-24 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse">
                <div className="h-12 bg-zinc-800 rounded w-48 mb-8"></div>
                <div className="h-6 bg-zinc-800 rounded w-64"></div>
              </div>
            </div>
          </main>
        </>
      }
    >
      <MovieSearchContent />
    </Suspense>
  );
}
