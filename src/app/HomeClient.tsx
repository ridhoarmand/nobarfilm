'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { useMovieBoxHomepage } from '@/hooks/useMovieBox';
import { useContinueWatching } from '@/hooks/useContinueWatching';
import { useQueryClient } from '@tanstack/react-query';
import { Hero, HeroSlide } from '@/components/home/Hero';
import { Navbar } from '@/components/layout/Navbar';
import { LoadingPage } from '@/components/shared/LoadingSkeleton';
import { Subject, BannerItem } from '@/types/api';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';

import { ContinueWatchingCard } from '@/components/shared/ContinueWatchingCard';
import { SectionSlider } from '@/components/shared/SectionSlider';
import { Footer } from '@/components/layout/Footer';

import { useWatchlist } from '@/hooks/useWatchlist';

export function HomeClient() {
  const queryClient = useQueryClient();
  const { data: continueWatchingData } = useContinueWatching();
  const continueWatchingRef = useRef<HTMLDivElement>(null);
  const { watchlist } = useWatchlist();
  
  // These will now use the prefetched data from HydrationBoundary
  const { data: homeData, isLoading: isHomeLoading, error: homeError, refetch } = useMovieBoxHomepage();

  const scrollContinueWatching = (direction: 'left' | 'right') => {
    const slider = continueWatchingRef.current;
    if (!slider) return;
    slider.scrollBy({
      left: slider.clientWidth * 0.9 * (direction === 'left' ? -1 : 1),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  // Handle Initial Loading state - SEAMLESS HYDRATION
  // We NEVER return a full-page loading skeleton if we have homeData (from hydration)
  // This prevents the "2x loading" or "flicker" effect.
  const isInitialLoading = isHomeLoading && !homeData;

  if (homeError) {
    return (
      <>
        <Navbar />
        <main id="main-content" className="page-content min-h-screen bg-[#141414] flex items-center justify-center px-4">
          <ErrorDisplay message={homeError.message || 'Gagal memuat katalog'} onRetry={() => refetch()} />
        </main>
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
      <main id="main-content" className="page-content bg-[#141414] min-h-screen">
        {isInitialLoading ? (
          <LoadingPage />
        ) : (
          <>
            {heroSlides.length > 0 && (
              <div className="relative">
                <Hero slides={heroSlides} />
              </div>
            )}

            <div className="relative py-8 space-y-10 sm:py-12 sm:space-y-12">

              {continueWatchingData && continueWatchingData.length > 0 && (
                <section className="content-container relative z-10 min-w-0" aria-labelledby="continue-heading">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 id="continue-heading" className="text-xl font-bold text-white sm:text-2xl 2xl:text-3xl">Lanjutkan Menonton</h2>
                      <p className="mt-1 text-sm text-zinc-400 2xl:text-base">{continueWatchingData.length} tayangan · Lanjutkan dari posisi terakhir</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => scrollContinueWatching('left')} className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500" aria-label="Geser Lanjutkan Menonton ke kiri" aria-controls="continue-watching-row"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
                      <button type="button" onClick={() => scrollContinueWatching('right')} className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500" aria-label="Geser Lanjutkan Menonton ke kanan" aria-controls="continue-watching-row"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
                    </div>
                  </div>
                  <div id="continue-watching-row" ref={continueWatchingRef} className="flex gap-4 overflow-x-auto p-2 pb-4 scrollbar-hide snap-x snap-mandatory">
                    {continueWatchingData.map((item) => (
                      <ContinueWatchingCard key={item.id} item={item} onRemove={() => queryClient.invalidateQueries({ queryKey: ['continue-watching'] })} />
                    ))}
                  </div>
                </section>
              )}

              {contentSections.map((section, index) => (
                <SectionSlider
                  key={`${section.title}-${index}`}
                  title={section.title}
                  items={section.subjects?.slice(0, 20) || []}
                  isRanked={index < 2}
                  categoryType={section.categoryType}
                />
              ))}
              <div id="favorit" className="relative z-10 scroll-mt-4">
                {watchlist.length > 0 ? (
                  <SectionSlider title="Favorit Saya" items={watchlist} />
                ) : (
                  <section className="content-container" aria-labelledby="favorite-heading">
                    <h2 id="favorite-heading" className="mb-4 text-xl font-bold text-white sm:text-2xl 2xl:text-3xl">Favorit Saya</h2>
                    <div className="flex flex-col items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:flex-row sm:items-center sm:p-6">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600/10 text-red-400"><Heart className="h-6 w-6" aria-hidden="true" /></span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white 2xl:text-lg">Belum ada judul favorit</h3>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-400 2xl:text-base">Tekan ikon hati pada film atau series untuk menyimpannya di sini. Favorit tersimpan di perangkat ini, tanpa perlu akun.</p>
                      </div>
                      <Link href="/search" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500">Cari Tayangan</Link>
                    </div>
                  </section>
                )}
              </div>

            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
