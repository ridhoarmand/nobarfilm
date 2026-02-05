'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMovieBoxSearch } from '@/hooks/useMovieBox';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MovieCard } from '@/components/shared/MovieCard';
import { MovieCardSkeleton } from '@/components/shared/LoadingSkeleton';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const pageParam = parseInt(searchParams.get('page') || '1');

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [debouncedQuery, setDebouncedQuery] = useState(queryParam);
  const [currentPage, setCurrentPage] = useState(pageParam);

  const { data, isLoading, error } = useMovieBoxSearch(debouncedQuery, currentPage);

  // Debounce search query (wait 700ms after user stops typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery && searchQuery !== queryParam) {
        router.push(`/search?q=${encodeURIComponent(searchQuery)}&page=1`);
        setCurrentPage(1);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update local state from URL params
  useEffect(() => {
    setSearchQuery(queryParam);
    setDebouncedQuery(queryParam);
    setCurrentPage(pageParam);
  }, [queryParam, pageParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setDebouncedQuery(searchQuery);
      router.push(`/search?q=${encodeURIComponent(searchQuery)}&page=1`);
      setCurrentPage(1);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    router.push(`/search?q=${encodeURIComponent(debouncedQuery)}&page=${newPage}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasResults = data && data.items && data.items.length > 0;
  const hasMore = data?.pager?.hasMore || false;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6">Search Movies & Series</h1>

            {/* Search Box */}
            <form onSubmit={handleSearch}>
              <div className="relative max-w-2xl">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies, series, anime..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-5 py-3 pl-12 text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                  autoFocus
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </form>
          </div>

          {/* Results Count */}
          {debouncedQuery && (
            <div className="mb-6">
              <p className="text-gray-400">
                {isLoading ? (
                  'Searching...'
                ) : hasResults ? (
                  <>
                    Found <span className="text-white font-semibold">{data.pager.totalCount}</span> results for "<span className="text-white font-semibold">{debouncedQuery}</span>"
                  </>
                ) : (
                  <>
                    No results found for "<span className="text-white font-semibold">{debouncedQuery}</span>"
                  </>
                )}
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-20">
              <p className="text-red-500 mb-2">Failed to load search results</p>
              <p className="text-gray-500 text-sm">{error.message}</p>
            </div>
          )}

          {/* Results Grid */}
          {!isLoading && hasResults && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {data.items.map((movie, index) => (
                  <MovieCard key={`${movie.subjectId}-${index}`} movie={movie} />
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="px-6 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white">Page {currentPage}</span>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasMore}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}

          {/* Empty State (no query) */}
          {!debouncedQuery && !isLoading && (
            <div className="text-center py-20">
              <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">Start Searching</h2>
              <p className="text-gray-400">Enter a movie or series name above to find what you're looking for</p>
            </div>
          )}

          {/* No Results State */}
          {debouncedQuery && !isLoading && !hasResults && !error && (
            <div className="text-center py-20">
              <h2 className="text-2xl font-semibold text-white mb-2">No Results Found</h2>
              <p className="text-gray-400 mb-6">Try adjusting your search terms or browse our categories</p>
              <button onClick={() => router.push('/browse')} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
                Browse Categories
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <>
          <Navbar />
          <div className="min-h-screen bg-black pt-20 pb-16 flex items-center justify-center">
            <div className="text-white">Loading...</div>
          </div>
        </>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
