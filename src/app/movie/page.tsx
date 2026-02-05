'use client';import { useState, useEffect } from 'react';
import { useMovieBoxHomepage, useMovieBoxTrending } from '@/hooks/useMovieBox';
import { Hero, HeroSlide } from '@/components/home/Hero';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { LoadingPage } from '@/components/shared/LoadingSkeleton';
import { Subject, BannerItem } from '@/types/api';
import { SectionSlider } from '@/components/shared/SectionSlider';
import { MovieCard } from '@/components/shared/MovieCard';

export default function MoviePage() {
  const { data: homeData, isLoading: isHomeLoading, error: homeError } = useMovieBoxHomepage();

  // Trending State for Infinite Scroll
  const [trendingPage, setTrendingPage] = useState(0);
  const [trendingMovies, setTrendingMovies] = useState<Subject[]>([]);
  const { data: trendingData, isLoading: isTrendingLoading, isFetching: isTrendingFetching } = useMovieBoxTrending(trendingPage);

  // Append new trending movies when data arrives
  useEffect(() => {
    if (trendingData?.subjectList) {
      setTrendingMovies((prev) => {
        const newMovies = trendingData.subjectList.filter((newM) => !prev.some((existingM) => existingM.subjectId === newM.subjectId));
        return [...prev, ...newMovies];
      });
    }
  }, [trendingData]);

  // Load More Handler
  const handleLoadMore = () => {
    if (!isTrendingLoading && !isTrendingFetching && trendingData?.pager?.hasMore) {
      setTrendingPage((prev) => prev + 1);
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

  // Error handling
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

  // Hero movies processing
  const bannerSection = homeData?.operatingList?.find((section) => section.type === 'BANNER');

  let heroSlides: HeroSlide[] = [];

  if (bannerSection?.banner?.items) {
    heroSlides = bannerSection.banner.items.map((item: BannerItem) => ({
      id: item.id,
      title: item.title,
      description: item.subject?.description || '',
      coverUrl: item.image?.url || item.subject?.cover?.url || '', // Prioritize Banner (Landscape)
      posterUrl: item.subject?.cover?.url || item.image?.url || '', // Prioritize Poster (Portrait) for Mobile
      subjectId: item.subjectId || item.subject?.subjectId,
      subjectType: item.subjectType || item.subject?.subjectType || 1,
      recommendationReason: item.subject?.recommendation_reason,
      imdbRating: item.subject?.imdbRatingValue,
      releaseDate: item.subject?.releaseDate,
      duration: item.subject?.duration,
    }));
  }

  // Fallback if no banner items found (use other sections)
  if (heroSlides.length === 0) {
    const firstSection = homeData?.operatingList?.find((section) => section.subjects && section.subjects.length > 0);
    if (firstSection?.subjects) {
      heroSlides = firstSection.subjects.slice(0, 5).map((s: Subject) => ({
        id: s.subjectId,
        title: s.title,
        description: s.description || '',
        coverUrl: s.cover.url,
        posterUrl: s.cover.url,
        subjectId: s.subjectId,
        subjectType: s.subjectType,
        recommendationReason: s.recommendation_reason,
        imdbRating: s.imdbRatingValue,
        releaseDate: s.releaseDate,
        duration: s.duration,
      }));
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
        {heroSlides.length > 0 && (
          <div className="relative">
            <Hero slides={heroSlides} />
          </div>
        )}

        <div className="relative -mt-12 sm:-mt-20 lg:-mt-20 pb-16 space-y-12">
          {/* 1. Popular Movies (Ranked Slider) */}
          {popularMovies.length > 0 && <SectionSlider title="Popular Movies" items={popularMovies} isRanked={true} />}

          {/* 2. Popular Series (Ranked Slider) */}
          {popularSeries.length > 0 && <SectionSlider title="Popular Series" items={popularSeries} isRanked={true} />}

          {/* Featured Categories: Horror, Western, Adventure, Action */}
          {featuredCategories.map((section, index) => (
            <SectionSlider key={`${section.title}-${index}`} title={section.title} items={section.subjects?.slice(0, 20) || []} />
          ))}

          {/* 3. Discover More (Load More Grid) */}
          <section className="px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 pl-1 border-l-4 border-red-600">Discover More</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {trendingMovies.map((movie) => (
                <div key={movie.subjectId}>
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>

            {/* Load More Button */}
            <div className="flex justify-center mt-12 mb-8">
              {isTrendingLoading || isTrendingFetching ? (
                <div className="flex items-center space-x-2 text-white">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  <span>Loading more...</span>
                </div>
              ) : trendingData?.pager?.hasMore ? (
                <button
                  onClick={handleLoadMore}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-900/20"
                >
                  Load More Movies
                </button>
              ) : (
                <p className="text-gray-500">No more movies to load</p>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
