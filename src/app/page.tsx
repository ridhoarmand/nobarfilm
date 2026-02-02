'use client';
import { useHomepage, useTrending } from '@/lib/hooks/useMovieBox';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/home/Hero';
import { LoadingPage } from '@/components/shared/LoadingSkeleton';
import { MovieCard } from '@/components/shared/MovieCard';
import { useState, useEffect, useRef } from 'react';
import { Subject } from '@/types/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function HomePage() {
  const { data: homeData, isLoading: isHomeLoading, error: homeError } = useHomepage();

  // Trending State for Infinite Scroll
  const [trendingPage, setTrendingPage] = useState(0);
  const [trendingMovies, setTrendingMovies] = useState<Subject[]>([]);
  const { data: trendingData, isLoading: isTrendingLoading } = useTrending(trendingPage);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Refs for horizontal sliders
  const moviesSliderRef = useRef<HTMLDivElement>(null);
  const seriesSliderRef = useRef<HTMLDivElement>(null);

  // Append new trending movies when data arrives
  useEffect(() => {
    if (trendingData?.subjectList) {
      setTrendingMovies((prev) => {
        const newMovies = trendingData.subjectList.filter((newM) => !prev.some((existingM) => existingM.subjectId === newM.subjectId));
        return [...prev, ...newMovies];
      });
    }
  }, [trendingData]);

  // Infinite Scroll Observer for Trending
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && trendingData?.pager?.hasMore && !isTrendingLoading) {
          setTrendingPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [trendingData?.pager?.hasMore, isTrendingLoading]);

  // Scroll helper for sliders
  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -800 : 800;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Loading state
  if (isHomeLoading) {
    return (
      <>
        <Navbar />
        <LoadingPage />
      </>
    );
  }

  if (homeError) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-red-600 mb-4">Oops!</h1>
            <p className="text-gray-300 mb-2">Failed to load content</p>
            <p className="text-gray-500 text-sm">{homeError.message}</p>
            <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition">
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Hero movies
  const bannerSection = homeData?.operatingList?.find((section) => section.type === 'BANNER');
  const heroMovies = bannerSection?.banner?.items?.map((item) => item.subject) || [];

  if (heroMovies.length === 0) {
    const firstSection = homeData?.operatingList?.find((section) => section.subjects && section.subjects.length > 0);
    if (firstSection?.subjects) {
      heroMovies.push(...firstSection.subjects.slice(0, 5));
    }
  }

  // Get Popular Movie & Popular Series sections from Homepage API
  const popularMovieSection = homeData?.operatingList?.find((section) => section.title === 'Popular Movie');
  const popularSeriesSection = homeData?.operatingList?.find((section) => section.title === 'Popular Series');

  const popularMovies = popularMovieSection?.subjects || [];
  const popularSeries = popularSeriesSection?.subjects || [];

  // Get featured categories for homepage
  const featuredCategoryTitles = ['Horror Movies', 'Western TV', 'Adventure Movies', 'Action Movies'];
  const featuredCategories = homeData?.operatingList?.filter((section) => section.subjects && section.subjects.length > 0 && featuredCategoryTitles.includes(section.title)) || [];

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

        <div className="relative -mt-20 sm:-mt-32 lg:-mt-40 pb-16 space-y-12">
          {/* 1. Popular Movies (Ranked Slider with Navigation) */}
          {popularMovies.length > 0 && (
            <section className="group relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 pl-1 border-l-4 border-red-600">Popular Movies</h2>

              <div className="relative">
                {/* Prev Button */}
                <button
                  onClick={() => scroll(moviesSliderRef, 'left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hidden md:block"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Slider */}
                <div ref={moviesSliderRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
                  {popularMovies.map((movie, index) => (
                    <div key={movie.subjectId} className="flex-none w-40 sm:w-48 md:w-56 snap-start">
                      <MovieCard movie={movie} rank={index + 1} priority={index < 3} />
                    </div>
                  ))}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => scroll(moviesSliderRef, 'right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hidden md:block"
                  aria-label="Next"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </section>
          )}

          {/* 2. Popular Series (Ranked Slider with Navigation) */}
          {popularSeries.length > 0 && (
            <section className="group relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 pl-1 border-l-4 border-red-600">Popular Series</h2>

              <div className="relative">
                {/* Prev Button */}
                <button
                  onClick={() => scroll(seriesSliderRef, 'left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hidden md:block"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Slider */}
                <div ref={seriesSliderRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
                  {popularSeries.map((movie, index) => (
                    <div key={movie.subjectId} className="flex-none w-40 sm:w-48 md:w-56 snap-start">
                      <MovieCard movie={movie} rank={index + 1} priority={false} />
                    </div>
                  ))}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => scroll(seriesSliderRef, 'right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hidden md:block"
                  aria-label="Next"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </section>
          )}

          {/* Featured Categories: Horror, Western, Adventure, Action */}
          {featuredCategories.map((section, index) => (
            <section key={`${section.title}-${index}`} className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 pl-1 border-l-4 border-red-600">{section.title}</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                {section.subjects?.slice(0, 20).map((movie) => (
                  <div key={movie.subjectId} className="flex-none w-40 sm:w-48 md:w-56 snap-start">
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* 3. Discover More (Infinite Scroll Grid) */}
          <section className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto pt-8 border-t border-zinc-800">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 pl-1 border-l-4 border-red-600">Discover More</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {trendingMovies.map((movie, index) => (
                <MovieCard key={`${movie.subjectId}-${index}`} movie={movie} />
              ))}
            </div>

            {/* Infinite Scroll Trigger & Loading Indicator */}
            <div ref={observerTarget} className="mt-12 flex justify-center py-8">
              {isTrendingLoading && (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-4 h-4 rounded-full border-2 border-red-500 border-t-transparent animate-spin"></div>
                  Loading more...
                </div>
              )}
              {!trendingData?.pager?.hasMore && trendingMovies.length > 0 && <p className="text-gray-500 text-sm">No more content</p>}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
