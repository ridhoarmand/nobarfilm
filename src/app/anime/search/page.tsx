'use client';import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Search, Tv, AlertCircle } from 'lucide-react';

function AnimeSearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen pt-24 px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Search Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
                <Tv className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Anime Search</h1>
                <p className="text-gray-400 text-sm">
                  Search results for: <span className="text-purple-500 font-semibold">{query}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Search Info */}
          <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-600/30 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-2">Anime Search Implementation</h3>
                <p className="text-gray-300 text-sm mb-3">This search page will connect to the anime-specific search endpoint with unique anime features:</p>
                <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
                  <li>Search by title (Romaji, English, Japanese)</li>
                  <li>Filter by genre (Shounen, Seinen, Isekai, etc.)</li>
                  <li>Filter by season & year</li>
                  <li>Filter by studio (Ufotable, MAPPA, etc.)</li>
                  <li>Filter by status (Airing, Completed, Upcoming)</li>
                  <li>Sort by popularity, score, or trending</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Coming Soon Placeholder */}
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 mb-6">
              <Search className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Search Implementation Coming Soon</h2>
            <p className="text-gray-400 mb-2">Anime search API integration will be implemented here</p>
            <p className="text-sm text-gray-500">
              Endpoint: <code className="text-purple-500">/api/anime/search?q={query}</code>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function AnimeSearchPage() {
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
      <AnimeSearchContent />
    </Suspense>
  );
}
