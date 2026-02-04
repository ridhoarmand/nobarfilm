'use client';

import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalMediaSliderProps {
  title: ReactNode;
  children: ReactNode;
}

export function HorizontalMediaSlider({ title, children }: HorizontalMediaSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -900 : 900;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>{title}</div>
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2.5 rounded-full bg-red-600/20 hover:bg-red-600/40 text-red-500 hover:text-red-400 transition"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2.5 rounded-full bg-red-600/20 hover:bg-red-600/40 text-red-500 hover:text-red-400 transition"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div ref={sliderRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
        {children}
      </div>
    </section>
  );
}
