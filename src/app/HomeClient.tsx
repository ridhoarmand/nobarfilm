'use client';

import { useRef } from 'react';
import { useMovieBoxHomepage } from '@/hooks/useMovieBox';
import { useContinueWatching } from '@/hooks/useContinueWatching';
import { useAuth } from '@/components/providers/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { Hero, HeroSlide } from '@/components/home/Hero';
import { Navbar } from '@/components/layout/Navbar';
import { LoadingPage } from '@/components/shared/LoadingSkeleton';
import { Subject, BannerItem } from '@/types/api';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import dynamic from 'next/dynamic';

import { ContinueWatchingCard } from '@/components/shared/ContinueWatchingCard';
import { SectionSlider } from '@/components/shared/SectionSlider';
import { MovieCard } from '@/components/shared/MovieCard';
import { Footer } from '@/components/layout/Footer';

import { useWatchlist } from '@/hooks/useWatchlist';

export function HomeClient() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: continueWatchingData } = useContinueWatching();
  const continueWatchingRef = useRef<HTMLDivElement>(null);
  const { watchlist } = useWatchlist();
  
  // These will now use the prefetched data from HydrationBoundary
  const { data: homeData, isLoading: isHomeLoading, error: homeError } = useMovieBoxHomepage();

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
      <main className="bg-[#141414] min-h-screen">
        {isInitialLoading ? (
          <LoadingPage />
        ) : (
          <>
            {heroSlides.length > 0 && (
              <div className="relative">
                <Hero slides={heroSlides} />
              </div>
            )}

            <div className="relative -mt-12 sm:-mt-20 lg:-mt-24 pb-20 space-y-10 sm:space-y-12">
              {/* Favorit Saya (Watchlist - No Login Required) */}
              {watchlist && watchlist.length > 0 && (
                <div className="relative z-10">
                  <SectionSlider
                    title="Daftar Favorit Saya"
                    items={watchlist}
                  />
                </div>
              )}

              {user && continueWatchingData && continueWatchingData.length > 0 && (
                <section className="group relative z-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mb-3 sm:mb-4">Lanjutkan Menonton</h2>
                  <div className="relative">
                    <button
                      onClick={() => continueWatchingRef.current?.scrollBy({ left: -400, behavior: 'smooth' })}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all duration-300 hover:scale-110 hidden md:block"
                      aria-label="Scroll left"
                    >
                      <span className="block w-6 h-6 text-2xl leading-none">&lt;</span>
                    </button>
                    <div ref={continueWatchingRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
                      {continueWatchingData.map((item) => (
                        <ContinueWatchingCard key={item.id} item={item} onRemove={() => queryClient.invalidateQueries({ queryKey: ['continue-watching'] })} />
                      ))}
                    </div>
                    <button
                      onClick={() => continueWatchingRef.current?.scrollBy({ left: 400, behavior: 'smooth' })}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all duration-300 hover:scale-110 hidden md:block"
                      aria-label="Scroll right"
                    >
                      <span className="block w-6 h-6 text-2xl leading-none">&gt;</span>
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

            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
