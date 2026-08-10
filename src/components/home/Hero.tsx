'use client';import Image from 'next/image';
import Link from 'next/link';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

// Export interface for usage in parent component
export interface HeroSlide {
  id: string;
  title: string;
  description: string;
  coverUrl: string; // Landscape Banner (Desktop)
  posterUrl: string; // Portrait Poster (Mobile)
  subjectId: string;
  subjectType: number; // 1: Movie, 2: Series
  recommendationReason?: string;
  imdbRating?: string;
  releaseDate?: string;
  duration?: number;
}

interface HeroProps {
  slides: HeroSlide[];
}

export function Hero({ slides }: HeroProps) {
  const safeSlides = slides || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // Remove unused isMobile effect

  // Touch state for Swipe support
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const nextSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % safeSlides.length);
      setIsTransitioning(false);
    }, 500);
  }, [isTransitioning, safeSlides.length]);

  const prevSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + safeSlides.length) % safeSlides.length);
      setIsTransitioning(false);
    }, 500);
  }, [isTransitioning, safeSlides.length]);

  const handleManualSlide = (direction: 'next' | 'prev') => {
    setIsPaused(true);
    if (direction === 'next') nextSlide();
    else prevSlide();
    setTimeout(() => setIsPaused(false), 10000);
  };

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swiped Left -> Next
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Prev
      prevSlide();
    }

    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
    setTimeout(() => setIsPaused(false), 10000);
  };

  const handleDotClick = (index: number) => {
    if (index === currentIndex || isTransitioning) return;
    setIsPaused(true);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 500);
    setTimeout(() => setIsPaused(false), 10000);
  };

  useEffect(() => {
    if (safeSlides.length <= 1 || isPaused) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [safeSlides.length, isPaused, nextSlide]);



  const currentSlide = safeSlides[currentIndex];
  if (!currentSlide) return null;

  const isMovie = currentSlide.subjectType === 1;

  // Watch URL logic
  const watchUrl = isMovie ? `/watch/${currentSlide.subjectId}?season=0&episode=0` : `/watch/${currentSlide.subjectId}?season=1&episode=1`;

  // Determine images
  const mobileImage = currentSlide.posterUrl || currentSlide.coverUrl;
  const desktopImage = currentSlide.coverUrl || currentSlide.posterUrl;

  return (
    <div
      className="group relative h-[65vh] sm:h-[75vh] md:h-[85vh] lg:h-[85vh] w-full overflow-hidden bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Image Container */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <div className="relative w-full h-full" style={{ position: 'relative' }}>
          {/* Mobile Image */}
          <Image
            src={mobileImage}
            alt={currentSlide.title}
            fill
            className="object-cover object-top sm:hidden"
            priority
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 640px) 100vw, 1px"
          />
          {/* Desktop Image */}
          <Image
            src={desktopImage}
            alt={currentSlide.title}
            fill
            className="object-cover object-center hidden sm:block"
            priority
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
          />
        </div>

        {/* Gradient Overlays (Netflix Vignette) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex items-end sm:items-center pb-20 sm:pb-0 pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 w-full z-10 pointer-events-auto">
          <div className={`max-w-xl md:max-w-2xl lg:max-w-3xl transition-all duration-1000 transform ${isTransitioning ? 'translate-y-6 opacity-0' : 'translate-y-0 opacity-100'}`}>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white mb-3 sm:mb-4 tracking-tight drop-shadow-md leading-tight line-clamp-2">{currentSlide.title}</h1>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-zinc-300 mb-4 sm:mb-5 font-medium">
              <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                {currentSlide.recommendationReason || 'Trending Sekarang'}
              </span>

              {currentSlide.imdbRating && (
                <span className="px-1.5 py-0.5 border border-zinc-700 bg-black/60 rounded text-xs font-semibold text-zinc-200">
                  IMDb {currentSlide.imdbRating}
                </span>
              )}

              {currentSlide.releaseDate && <span>{new Date(currentSlide.releaseDate).getFullYear()}</span>}

              {currentSlide.duration && currentSlide.duration > 0 && <span>{Math.floor(currentSlide.duration / 60)}m</span>}
            </div>

            <p className="hidden sm:block text-zinc-300 text-sm sm:text-base mb-6 line-clamp-3 max-w-xl leading-relaxed">{currentSlide.description}</p>

            <div className="flex items-center gap-3">
              <Link
                href={watchUrl}
                className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-white/80 text-black font-bold rounded-md text-sm sm:text-base transition-all shadow-md active:scale-95"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>Putar</span>
              </Link>
              <Link
                href={`/${currentSlide.subjectId}`}
                className="flex items-center gap-2 px-6 py-2.5 bg-zinc-500/40 hover:bg-zinc-500/30 text-white font-bold rounded-md text-sm sm:text-base backdrop-blur-md transition-all active:scale-95"
              >
                <Info className="w-5 h-5" />
                <span>Informasi Selengkapnya</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows (Desktop Only) */}
      {safeSlides.length > 1 && (
        <>
          <button
            onClick={() => handleManualSlide('prev')}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 hover:bg-black/60 rounded-full text-white transition-all duration-300 hover:scale-110 hidden sm:block"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
          </button>
          <button
            onClick={() => handleManualSlide('next')}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 hover:bg-black/60 rounded-full text-white transition-all duration-300 hover:scale-110 hidden sm:block"
            aria-label="Next slide"
          >
            <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
          </button>
        </>
      )}

      {/* Indicators (Visible on all, raised on mobile) */}
      {safeSlides.length > 1 && (
        <div className="absolute bottom-8 sm:bottom-24 right-4 sm:right-12 flex gap-2 z-20">
          {safeSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 shadow ${index === currentIndex ? 'bg-white scale-125' : 'bg-gray-500/50 hover:bg-gray-400'}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
