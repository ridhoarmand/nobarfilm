'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Search, Film, AlertCircle, TrendingUp } from 'lucide-react';
import { useMovieBoxSearch, useMovieBoxTrending } from '@/hooks/useMovieBox';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { UnifiedMediaCardSkeleton } from '@/components/cards/UnifiedMediaCardSkeleton';

function MovieSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(query);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | 'Film' | 'Series'>('Semua');

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nobarfilm_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading recent searches', e);
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    if (!term) return;
    try {
      const saved = localStorage.getItem('nobarfilm_recent_searches');
      let current = saved ? JSON.parse(saved) : [];
      current = [term, ...current.filter((item: string) => item.toLowerCase() !== term.toLowerCase())].slice(0, 5);
      localStorage.setItem('nobarfilm_recent_searches', JSON.stringify(current));
      setRecentSearches(current);
    } catch (e) {
      console.error('Error saving recent searches', e);
    }
  };

  const clearRecentSearches = () => {
    localStorage.removeItem('nobarfilm_recent_searches');
    setRecentSearches([]);
  };

  const { data, isLoading, isError, error, refetch } = useMovieBoxSearch(query, 1);
  const { data: trendingData, isLoading: isLoadingTrending } = useMovieBoxTrending(1);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      saveRecentSearch(searchInput.trim());
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleChipClick = (tag: string) => {
    setSearchInput(tag);
    saveRecentSearch(tag);
    router.push(`/search?q=${encodeURIComponent(tag)}`);
  };

  const filteredItems = data?.items.filter(item => {
    if (categoryFilter === 'Film') return item.subjectType === 1;
    if (categoryFilter === 'Series') return item.subjectType === 2;
    return true;
  }) || [];

  return (
    <>
      <Navbar />
      <main id="main-content" className="page-content bg-[#141414] min-h-screen [&_button]:min-h-11 [&_button]:min-w-11">
        <div className="content-container py-6 sm:py-10">
          {/* Search Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/30">
                <Film className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Pencarian Film & Series</h1>
                {query && (
                  <p className="break-words text-zinc-400 text-sm mt-0.5">
                    Hasil pencarian untuk: <span className="text-red-500 font-semibold">&quot;{query}&quot;</span>
                  </p>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mt-6">
              <label htmlFor="catalogue-search" className="mb-2 block text-sm font-semibold text-zinc-200 2xl:text-base">Judul atau kata kunci</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="catalogue-search"
                  name="q"
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari film, series, atau anime..."
                  className="min-h-12 min-w-0 w-full flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-base text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <button type="submit" disabled={!searchInput.trim()} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  <Search className="h-5 w-5" aria-hidden="true" /> Cari
                </button>
              </div>
            </form>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="text-xs text-zinc-500 font-semibold whitespace-nowrap flex items-center gap-1">
                  Terakhir Dicari:
                </span>
                {recentSearches.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleChipClick(tag)}
                    className="max-w-full break-words text-sm px-3 py-2 rounded-full font-medium transition-colors border bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white"
                  >
                    {tag}
                  </button>
                ))}
                <button
                  onClick={clearRecentSearches}
                  className="text-sm px-3 py-2 rounded-full font-medium transition-colors text-red-400 hover:text-red-300 ml-1"
                >
                  Hapus
                </button>
              </div>
            )}
          </div>

          {/* Category Tabs */}
          {query && !isLoading && !isError && data && data.items.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6 border-b border-zinc-800 pb-2" aria-label="Jenis tayangan">
              {(['Semua', 'Film', 'Series'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCategoryFilter(tab)}
                  aria-pressed={categoryFilter === tab}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${categoryFilter === tab ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Loading State */}
          {query && isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(12)].map((_, index) => (
                <UnifiedMediaCardSkeleton key={index} />
              ))}
            </div>
          )}

          {/* Error State */}
          {query && isError && (
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
          {query && !isLoading && !isError && data && (
            <>
              {filteredItems.length > 0 ? (
                <>
                  <div role="status" className="mb-4 text-zinc-400 text-sm font-medium">
                    Menampilkan <span className="text-white font-bold">{filteredItems.length}</span> hasil
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredItems.map((item, index) => (
                      <UnifiedMediaCard
                        key={`${item.subjectId}-${index}`}
                        title={item.title}
                        cover={item.cover.url}
                        link={`/${item.subjectId}`}
                        topLeftBadge={{
                          text: item.subjectType === 1 ? 'Film' : 'Series',
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
                    <h2 className="text-xl font-bold text-white mb-2">{data.items.length > 0 ? `Tidak ada hasil dalam kategori ${categoryFilter}` : 'Judul belum ditemukan'}</h2>
                    <p className="break-words text-zinc-400 text-sm leading-relaxed max-w-md mx-auto">
                      {data.items.length > 0 ? 'Hasil tersedia di kategori lain. Pilih Semua untuk melihatnya.' : <>Tidak ada hasil untuk &quot;<span className="text-red-400 font-semibold">{query}</span>&quot;. Coba judul yang lebih singkat atau periksa ejaannya.</>}
                    </p>
                    {data.items.length > 0 && <button type="button" onClick={() => setCategoryFilter('Semua')} className="mt-4 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Tampilkan Semua</button>}
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
                              text: item.subjectType === 1 ? 'Film' : 'Series',
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
          {!query && (
            <div className="space-y-12">
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 mb-4 text-zinc-500">
                  <Search className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Cari Film & Series Favorit Anda</h2>
                <p className="text-zinc-400 text-sm max-w-md mx-auto">
                  Masukkan judul atau kata kunci di atas. Anda juga bisa mulai dari tayangan populer di bawah.
                </p>
              </div>
              {isLoadingTrending && <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" aria-label="Memuat tayangan populer">{Array.from({ length: 6 }, (_, index) => <UnifiedMediaCardSkeleton key={index} />)}</div>}

              {/* Trending Suggestions */}
              {trendingData?.subjectList && trendingData.subjectList.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-red-500" />
                    <h2 className="text-lg font-bold text-white 2xl:text-2xl">Tayangan Populer</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {trendingData.subjectList.slice(0, 12).map((item, index) => (
                      <UnifiedMediaCard
                        key={`${item.subjectId}-${index}`}
                        title={item.title}
                        cover={item.cover.url}
                        link={`/${item.subjectId}`}
                        topLeftBadge={{
                          text: item.subjectType === 1 ? 'Film' : 'Series',
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
          <main id="main-content" className="page-content bg-[#141414] min-h-screen">
            <div className="content-container py-10">
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
