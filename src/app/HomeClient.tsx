'use client';

import { useRef } from 'react';
import { useMovieBoxHomepage, useInfiniteMovieBoxTrending } from '@/hooks/useMovieBox';
import { useContinueWatching } from '@/hooks/useContinueWatching';
import { useAuth } from '@/components/providers/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { Hero, HeroSlide } from '@/components/home/Hero';
import { Navbar } from '@/components/layout/Navbar';
import { LoadingPage } from '@/components/shared/LoadingSkeleton';
import { Subject, BannerItem } from '@/types/api';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';

const ContinueWatchingCard = dynamic(() => import('@/components/shared/ContinueWatchingCard').then((mod) => mod.ContinueWatchingCard));
const SectionSlider = dynamic(() => import('@/components/shared/SectionSlider').then((mod) => mod.SectionSlider));
const MovieCard = dynamic(() => import('@/components/shared/MovieCard').then((mod) => mod.MovieCard));
const Footer = dynamic(() => import('@/components/layout/Footer').then((mod) => mod.Footer));

export function HomeClient() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: continueWatchingData } = useContinueWatching();
  const continueWatchingRef = useRef<HTMLDivElement>(null);
  
  // These will now use the prefetched data from HydrationBoundary
  const { data: homeData, isLoading: isHomeLoading, error: homeError } = useMovieBoxHomepage();

  // useInfiniteQuery from our hook
  const { 
    data: trendingData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteMovieBoxTrending();

  // Flattens all pages into a single list
  const trendingMovies = trendingData?.pages.flatMap((page) => page.subjectList || []) || [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Handle Initial Loading state - SEAMLESS HYDRATION
  // We NEVER return a full-page loading skeleton if we have homeData (from hydration)
  // This prevents the "2x loading" or "flicker" effect.
  const isInitialLoading = isHomeLoading && !homeData;

  if (homeError) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
          <ErrorDisplay message={homeError.message || 'Failed to load content'} onRetry={() => window.location.reload()} />
        </div>
        <Footer />
      </>
    );
  }

  const bannerSection = homeData?.operatingList?.find((section) => section.type === 'BANNER');
  let heroSlides: HeroSlide[] = [];

  if (bannerSection?.banner?.items) {
    heroSlides = bannerSection.banner.items.map((item: BannerItem) => ({
      id: item.id,
      title: item.title,
      description: item.subject?.description || '',
      coverUrl: item.image?.url || item.subject?.cover?.url || '',
      posterUrl: item.subject?.cover?.url || item.image?.url || '',
      subjectId: item.subjectId || item.subject?.subjectId,
      subjectType: item.subjectType || item.subject?.subjectType || 1,
      recommendationReason: item.subject?.recommendation_reason,
      imdbRating: item.subject?.imdbRatingValue,
      releaseDate: item.subject?.releaseDate,
      duration: item.subject?.duration,
    }));
  }

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

  const contentSections = homeData?.operatingList?.filter(
    (section) => section.type !== 'BANNER' && Array.isArray(section.subjects) && section.subjects.length > 0,
  ) || [];

  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen">
        {isInitialLoading ? (
          <LoadingPage />
        ) : (
          <>
            {heroSlides.length > 0 && (
              <div className="relative">
                <Hero slides={heroSlides} />
              </div>
            )}

            <div className="relative -mt-12 sm:-mt-20 lg:-mt-20 pb-16 space-y-12">
              {user && continueWatchingData && continueWatchingData.length > 0 && (
                <section className="group relative z-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 pl-1 border-l-4 border-red-600">Continue Watching</h2>
                  <div className="relative">
                    <button
                      onClick={() => continueWatchingRef.current?.scrollBy({ left: -400, behavior: 'smooth' })}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all duration-300 hover:scale-110 hidden md:block"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div ref={continueWatchingRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
                      {continueWatchingData.map((item) => (
                        <ContinueWatchingCard key={item.id} item={item} onRemove={() => queryClient.invalidateQueries({ queryKey: ['continue-watching'] })} />
                      ))}
                    </div>
                    <button
                      onClick={() => continueWatchingRef.current?.scrollBy({ left: 400, behavior: 'smooth' })}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all duration-300 hover:scale-110 hidden md:block"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </section>
              )}

              {contentSections.map((section, index) => (
                <SectionSlider
                  key={`${section.title}-${index}`}
                  title={section.title}
                  items={section.subjects?.slice(0, 20) || []}
                  isRanked={index < 2}
                />
              ))}

              <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 pl-1 border-l-4 border-red-600">Discover More</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                  {trendingMovies.map((movie) => (
                    <div key={movie.subjectId}>
                      <MovieCard movie={movie} />
                    </div>
                  ))}
                </div>

                <div className="flex justify-center mt-12 mb-8">
                  {isFetchingNextPage ? (
                    <div className="flex items-center space-x-2 text-white">
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      <span>Loading more...</span>
                    </div>
                  ) : hasNextPage ? (
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
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
