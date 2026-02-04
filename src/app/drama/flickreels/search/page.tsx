'use client';
import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFlickReelsSearch } from '@/hooks/useFlickReels';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PlatformSelector } from '@/components/features/PlatformSelector';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { DramaCardSkeleton } from '@/components/cards/DramaCardSkeleton';
import { Search } from 'lucide-react';

function FlickReelsSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const { data, isLoading, error } = useFlickReelsSearch(initialQuery);

  const items = data?.data || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/drama/flickreels/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen pt-24 px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Platform Selector */}
          <div className="mb-6">
            <PlatformSelector />
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <form onSubmit={handleSearch} className="max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search FlickReels dramas..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-full px-6 py-4 pl-14 text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Results Header */}
          {initialQuery && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">Search Results</h1>
              <p className="text-gray-400">
                Results for: <span className="text-red-500 font-semibold">{initialQuery}</span>
              </p>
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {[...Array(12)].map((_, i) => (
                <DramaCardSkeleton key={i} />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 mb-6">
                <Search className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Search Error</h2>
              <p className="text-gray-400 mb-6">{error.message}</p>
              <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition">
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {items.length === 0 ? (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 mb-6">
                    <Search className="w-10 h-10 text-gray-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">No Results Found</h2>
                  <p className="text-gray-400">Try searching with different keywords</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                  {items.map((item: any) => (
                    <UnifiedMediaCard
                      key={item.id}
                      title={item.name}
                      cover={item.cover_image_url}
                      link={`/drama/flickreels/${item.id}`}
                      episodes={item.episode_count || 0}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function FlickReelsSearchPage() {
  return (
    <Suspense fallback={
      <>
        <Navbar />
        <main className="bg-black min-h-screen pt-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-12 bg-zinc-800 rounded w-48 mb-8"></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <DramaCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </>
    }>
      <FlickReelsSearchContent />
    </Suspense>
  );
}
