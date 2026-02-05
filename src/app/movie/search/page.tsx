'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Search, Film, AlertCircle } from 'lucide-react';
import { useMovieBoxSearch } from '@/hooks/useMovieBox';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { UnifiedMediaCardSkeleton } from '@/components/cards/UnifiedMediaCardSkeleton';

function MovieSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(query);

  const { data, isLoading, isError, error, refetch } = useMovieBoxSearch(query, 1);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/movie/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen pt-24 px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Search Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/30">
                <Film className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Movie Search</h1>
                {query && (
                  <p className="text-gray-400 text-sm">
                    Search results for: <span className="text-red-500 font-semibold">{query}</span>
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
                placeholder="Search movies and series..."
                className="w-full px-5 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Search
              </button>
            </form>
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
                  <h3 className="text-white font-semibold mb-2">Search Error</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    {error?.message || 'Failed to search movies'}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Try Again
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
                  <div className="mb-4 text-gray-400 text-sm">
                    Found {data.items.length} result{data.items.length !== 1 ? 's' : ''}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {data.items.map((item, index) => (
                      <UnifiedMediaCard
                        key={item.subjectId}
                        title={item.title}
                        cover={item.cover.url}
                        link={`/watch/${item.subjectId}`}
                        topLeftBadge={{
                          text: item.subjectType === 1 ? 'Movie' : 'Series',
                          color: item.subjectType === 1 ? '#E52E2E' : '#2E7DE5',
                        }}
                        topRightBadge={
                          item.imdbRatingValue
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
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 mb-6">
                    <Search className="w-10 h-10 text-gray-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">No Results Found</h2>
                  <p className="text-gray-400 mb-2">
                    No movies or series found for &quot;{query}&quot;
                  </p>
                  <p className="text-sm text-gray-500">Try different keywords or check your spelling</p>
                </div>
              )}
            </>
          )}

          {/* Empty Query State */}
          {!query && !isLoading && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 mb-6">
                <Search className="w-10 h-10 text-gray-600" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Search Movies & Series</h2>
              <p className="text-gray-400 mb-2">Enter a keyword to start searching</p>
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
