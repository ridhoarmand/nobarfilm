'use client';

import { useHomepage } from '@/lib/hooks/useMovieBox';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/home/Hero';
import { ContentRow } from '@/components/home/ContentRow';
import { LoadingPage } from '@/components/shared/LoadingSkeleton';

export default function HomePage() {
  const { data, isLoading, error } = useHomepage();

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

  // Get hero movies from banner or recommended items
  const bannerSection = data?.operatingList?.find((section) => section.type === 'BANNER');
  const heroMovies = bannerSection?.banner?.items?.map((item) => item.subject) || [];

  // Fallback if no banner items: take first 5 movies from recommendation or first section
  if (heroMovies.length === 0) {
    const firstSection = data?.operatingList?.find((section) => section.subjects && section.subjects.length > 0);
    if (firstSection?.subjects) {
      heroMovies.push(...firstSection.subjects.slice(0, 5));
    }
  }

  // Get content sections (only sections with subjects)
  // Filter out unwanted sections
  const hiddenSections = ['Nollywood Movie', 'SA Drama', 'Must-watch Black Shows', '💓Teen Romance 💓', '🔥Hot Short TV'];

  const contentSections = data?.operatingList?.filter((section) => section.subjects && section.subjects.length > 0 && !hiddenSections.includes(section.title)) || [];

  return (
    <>
      <Navbar />

      <main className="bg-black min-h-screen">
        {/* Hero Banner */}
        {heroMovies.length > 0 && (
          <div className="relative">
            <Hero movies={heroMovies} />
          </div>
        )}

        {/* Content Sections */}
        <div className="relative -mt-20 sm:-mt-32 lg:-mt-40 space-y-8 sm:space-y-12 pb-16">
          {contentSections.map((section, index) => (
            <ContentRow key={`${section.type}-${index}`} title={section.title} movies={section.subjects || []} priority={index === 0} />
          ))}

          {/* Show message if no content */}
          {contentSections.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400">No content available at the moment</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
