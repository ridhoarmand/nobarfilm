'use client';
import { useHomepage } from '@/lib/hooks/useMovieBox';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ContentRow } from '@/components/home/ContentRow';
import { LoadingPage } from '@/components/shared/LoadingSkeleton';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BrowsePage() {
  const { data, isLoading, error } = useHomepage();
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <LoadingPage />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-red-600 mb-4">Oops!</h1>
            <p className="text-gray-300 mb-2">Failed to load content</p>
            <p className="text-gray-500 text-sm">{error.message}</p>
            <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition">
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Filter content sections (exclude unwanted categories and Popular sections now on homepage)
  const hiddenSections = [
    'Popular Movie',
    'Popular Series',
    'Horror Movies',
    'Western TV',
    'Adventure Movies',
    'Action Movies',
    'Nollywood Movie',
    'SA Drama',
    'Must-watch Black Shows',
    '💓Teen Romance 💓',
    '🔥Hot Short TV',
    'Premium VIP HD Access>>',
    'Anime[English Dubbed]',
  ];

  const contentSections = data?.operatingList?.filter((section) => section.subjects && section.subjects.length > 0 && !hiddenSections.includes(section.title)) || [];

  return (
    <>
      <Navbar />

      <main className="bg-black min-h-screen pt-20">
        <div className="px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto py-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6 border-l-4 border-red-600 pl-4">Browse by Category</h1>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="mb-8">
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

          {/* Category Sections */}
          <div className="space-y-12">
            {contentSections.map((section, index) => (
              <ContentRow key={`${section.type}-${index}`} title={section.title} movies={section.subjects || []} priority={false} />
            ))}
          </div>

          {/* Empty State */}
          {contentSections.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400">No categories available at the moment</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
