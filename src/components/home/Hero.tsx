'use client';
import { Subject } from '@/types/api';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface HeroProps {
  movies: Subject[];
}

export function Hero({ movies }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Separate state to pause auto-slide on interaction
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
      setIsTransitioning(false);
    }, 500);
  }, [isTransitioning, movies.length]);

  const prevSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
      setIsTransitioning(false);
    }, 500);
  }, [isTransitioning, movies.length]);

  const handleManualSlide = (direction: 'next' | 'prev') => {
    setIsPaused(true); // Pause auto slide
    if (direction === 'next') nextSlide();
    else prevSlide();

    // Resume after 10 seconds of inactivity
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

  // Auto-slide effect
  useEffect(() => {
    if (movies.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 6000);

    return () => clearInterval(interval);
  }, [movies.length, isPaused, nextSlide]);

  const currentMovie = movies[currentIndex];
  if (!currentMovie) return null;

  const isSeries = currentMovie.subjectType === 2;
  const isMovie = currentMovie.subjectType === 1;

  // For movies, link directly to watch page (episode 0)
  // For series, link to watch page (episode 1)
  const watchUrl = isMovie ? `/watch/${currentMovie.subjectId}?season=0&episode=0` : `/watch/${currentMovie.subjectId}?season=1&episode=1`;

  return (
    <div className="group relative h-[60vh] sm:h-[70vh] md:h-[80vh] lg:h-[85vh] xl:h-[90vh] w-full overflow-hidden bg-black">
      {/* Background Image with Transition */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <Image src={currentMovie.cover.url} alt={currentMovie.title} fill className="object-cover object-center" priority sizes="100vw" />
        {/* Gradient Overlays - Adjusted for larger screens */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent sm:from-black/80 sm:via-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-16 w-full z-10">
          <div className={`max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl transition-all duration-1000 transform ${isTransitioning ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'}`}>
            {/* Movie Title */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 drop-shadow-lg leading-tight">{currentMovie.title}</h1>
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base text-gray-200 mb-6 font-medium">
              <span className="text-green-400 font-bold">{currentMovie.recommendation_reason || 'Trending Now'}</span>

              {currentMovie.imdbRatingValue && <span className="px-2 py-0.5 border border-gray-400 rounded text-xs">IMDb {currentMovie.imdbRatingValue}</span>}

              {currentMovie.releaseDate && <span>{new Date(currentMovie.releaseDate).getFullYear()}</span>}

              {currentMovie.duration > 0 && <span>{Math.floor(currentMovie.duration / 60)}m</span>}
            </div>

            {/* Description */}
            <p className="text-gray-300 text-sm sm:text-lg mb-8 line-clamp-3 max-w-xl drop-shadow-md">{currentMovie.description}</p>

            {/* Buttons */}
            <div className="flex gap-3">
              <Link href={watchUrl} className="flex items-center gap-2 px-6 sm:px-8 py-2 sm:py-3 bg-white text-black font-bold rounded hover:bg-white/90 transition">
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-black" />
                Play
              </Link>

              <Link
                href={`/movie/${currentMovie.subjectId}`}
                className="flex items-center gap-2 px-6 sm:px-8 py-2 sm:py-3 bg-gray-500/70 text-white font-bold rounded hover:bg-gray-500/50 transition backdrop-blur-sm"
              >
                <Info className="w-5 h-5 sm:w-6 sm:h-6" />
                More Info
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows (Visible on Group Hover) */}
      {movies.length > 1 && (
        <>
          <button
            onClick={() => handleManualSlide('prev')}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 hover:bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
          </button>

          <button
            onClick={() => handleManualSlide('next')}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 hover:bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
            aria-label="Next slide"
          >
            <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
          </button>
        </>
      )}

      {/* Slider Indicators */}
      {movies.length > 1 && (
        <div className="absolute bottom-24 right-4 sm:right-12 flex gap-2 z-20">
          {movies.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentIndex ? 'bg-white scale-125' : 'bg-gray-500/50 hover:bg-gray-400'}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
