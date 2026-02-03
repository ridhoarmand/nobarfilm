'use client';import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Search, Film, AlertCircle } from 'lucide-react';

function MovieSearchContent() {
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/30">
                <Film className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Movie Search</h1>
                <p className="text-gray-400 text-sm">
                  Search results for: <span className="text-red-500 font-semibold">{query}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Search Info */}
          <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-600/30 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-2">Movie Search Implementation</h3>
                <p className="text-gray-300 text-sm mb-3">This search page will connect to the movie-specific search endpoint. You can implement different search logic for movies including:</p>
                <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
                  <li>Search by title, director, or actor</li>
                  <li>Filter by genre (Action, Comedy, Drama, etc.)</li>
                  <li>Filter by release year</li>
                  <li>Filter by rating (IMDB, Rotten Tomatoes)</li>
                  <li>Sort by popularity, release date, or rating</li>
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
            <p className="text-gray-400 mb-2">Movie search API integration will be implemented here</p>
            <p className="text-sm text-gray-500">
              Endpoint: <code className="text-red-500">/api/movie/search?q={query}</code>
            </p>
          </div>
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
