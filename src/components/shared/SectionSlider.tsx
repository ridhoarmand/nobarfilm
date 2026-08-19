'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { Subject } from '@/types/api';
import { MovieCard } from './MovieCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SectionSliderProps {
  title: string;
  items: Subject[];
  isRanked?: boolean;
  categoryType?: string;
}

export function SectionSlider({ title, items, isRanked = false, categoryType }: SectionSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -800 : 800;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (items.length === 0) return null;

  return (
    <section className="group relative z-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        {categoryType ? (
          <Link
            href={`/ranking-list/${categoryType}?title=${encodeURIComponent(title)}`}
            className="group/title flex items-center gap-2 hover:text-red-500 transition-colors"
            title={`Lihat semua ${title}`}
          >
            <h2 className="text-lg sm:text-xl font-extrabold text-white group-hover/title:text-red-500 tracking-tight transition-colors">
              {title}
            </h2>
            <span className="text-xs text-red-500 font-bold opacity-80 group-hover/title:opacity-100 group-hover/title:translate-x-0.5 transition-all">
              Lainnya ›
            </span>
          </Link>
        ) : (
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            {title}
          </h2>
        )}
      </div>

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
              <MovieCard movie={movie} rank={isRanked ? index + 1 : undefined} />
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
