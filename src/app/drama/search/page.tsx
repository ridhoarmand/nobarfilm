'use client';import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Search, Clapperboard, AlertCircle } from 'lucide-react';

function DramaSearchContent() {
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Clapperboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Drama Search</h1>
                <p className="text-gray-400 text-sm">
                  Search results for: <span className="text-blue-500 font-semibold">{query}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Search Info */}
          <div className="bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border border-blue-600/30 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-2">Drama Search Implementation</h3>
                <p className="text-gray-300 text-sm mb-3">This search page will connect to the drama-specific search endpoint with platform-specific features:</p>
                <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
                  <li>Search by title or cast</li>
                  <li>Filter by platform (Netflix, Disney+, Viu, WeTV, etc.)</li>
                  <li>Filter by country (Korea, China, Thailand, Japan, etc.)</li>
                  <li>Filter by genre (Romance, Thriller, Historical, etc.)</li>
                  <li>Filter by year & episodes count</li>
                  <li>Sort by popularity, rating, or latest</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Platform Filter Preview */}
          <div className="mb-8">
            <h3 className="text-white font-semibold mb-4">Available Platforms</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {['Netflix', 'Disney+', 'Viu', 'WeTV', 'iQIYI', 'Amazon Prime', 'Apple TV+', 'HBO Max'].map((platform) => (
                <button key={platform} className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-gray-300 hover:text-white hover:border-blue-600/50 transition">
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {/* Coming Soon Placeholder */}
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 mb-6">
              <Search className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Search Implementation Coming Soon</h2>
            <p className="text-gray-400 mb-2">Drama search API integration will be implemented here</p>
            <p className="text-sm text-gray-500">
              Endpoint: <code className="text-blue-500">/api/drama/search?q={query}&platform=netflix</code>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function DramaSearchPage() {
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
      <DramaSearchContent />
    </Suspense>
  );
}
