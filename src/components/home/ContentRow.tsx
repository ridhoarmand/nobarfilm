'use client';import { Subject } from '@/types/api';
import { MovieCard } from '@/components/shared/MovieCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState } from 'react';

interface ContentRowProps {
  title: string;
  movies: Subject[];
  priority?: boolean;
}

export function ContentRow({ title, movies, priority = false }: ContentRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.offsetWidth * 0.8;
      const newScrollLeft = direction === 'left' ? rowRef.current.scrollLeft - scrollAmount : rowRef.current.scrollLeft + scrollAmount;

      rowRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });

      // Update arrow visibility
      setTimeout(() => {
        if (rowRef.current) {
          setShowLeftArrow(rowRef.current.scrollLeft > 0);
          setShowRightArrow(rowRef.current.scrollLeft < rowRef.current.scrollWidth - rowRef.current.offsetWidth - 10);
        }
      }, 300);
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div className="group relative py-4">
      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 px-4 sm:px-6 lg:px-8">{title}</h2>

      {/* Scroll Container */}
      <div className="relative px-4 sm:px-6 lg:px-8">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center hover:from-black/90"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center hover:from-black/90"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        )}

        {/* Movie Grid */}
        <div
          ref={rowRef}
          className="flex gap-2 sm:gap-3 overflow-x-scroll scrollbar-hide scroll-smooth"
          onScroll={(e) => {
            const target = e.currentTarget;
            setShowLeftArrow(target.scrollLeft > 0);
            setShowRightArrow(target.scrollLeft < target.scrollWidth - target.offsetWidth - 10);
          }}
        >
          {movies.map((movie, index) => (
            <div key={`${movie.subjectId}-${index}`} className="flex-none w-32 sm:w-40 md:w-48 lg:w-56">
              <MovieCard movie={movie} priority={priority && index < 6} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
