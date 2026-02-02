'use client';
import { useRef } from 'react';
import { Subject } from '@/types/api';
import { MovieCard } from './MovieCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SectionSliderProps {
  title: string;
  items: Subject[];
  isRanked?: boolean;
}

export function SectionSlider({ title, items, isRanked = false }: SectionSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -800 : 800;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (items.length === 0) return null;

  return (
    <section className="group relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 pl-1 border-l-4 border-red-600">{title}</h2>

      <div className="relative">
        {/* Prev Button */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all duration-300 hover:scale-110 hidden md:block"
          aria-label={`Previous ${title}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Slider */}
        <div ref={sliderRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
          {items.map((movie, index) => (
            <div key={movie.subjectId} className="flex-none w-40 sm:w-48 md:w-56 snap-start">
              <MovieCard movie={movie} rank={isRanked ? index + 1 : undefined} priority={index < 3} />
            </div>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all duration-300 hover:scale-110 hidden md:block"
          aria-label={`Next ${title}`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
}
