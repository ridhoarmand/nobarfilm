'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
  const sliderId = useId();
  const headingId = useId();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    const updateScroll = () => {
      setCanScrollLeft(slider.scrollLeft > 1);
      setCanScrollRight(slider.scrollLeft + slider.clientWidth < slider.scrollWidth - 1);
    };
    updateScroll();
    const observer = new ResizeObserver(updateScroll);
    observer.observe(slider);
    slider.addEventListener('scroll', updateScroll, { passive: true });
    return () => {
      observer.disconnect();
      slider.removeEventListener('scroll', updateScroll);
    };
  }, [items.length]);

  const scroll = (direction: 'left' | 'right') => {
    const slider = sliderRef.current;
    if (!slider) return;
    slider.scrollBy({
      left: slider.clientWidth * 0.9 * (direction === 'left' ? -1 : 1),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  if (items.length === 0) return null;

  return (
    <section className="content-container relative z-10 min-w-0" aria-labelledby={headingId}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="break-words text-xl font-bold tracking-tight text-white sm:text-2xl 2xl:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-zinc-400 2xl:text-base">{items.length} judul{isRanked ? ' · Paling populer' : ''}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {categoryType && <Link href={`/ranking-list/${categoryType}?title=${encodeURIComponent(title)}`} className="mr-1 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-red-400 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 2xl:text-base">Lihat semua <span className="sr-only">{title}</span></Link>}
          <button type="button" onClick={() => scroll('left')} disabled={!canScrollLeft} className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-35" aria-label={`Geser ${title} ke kiri`} aria-controls={sliderId}><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
          <button type="button" onClick={() => scroll('right')} disabled={!canScrollRight} className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-35" aria-label={`Geser ${title} ke kanan`} aria-controls={sliderId}><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
        </div>
      </div>
      <div id={sliderId} ref={sliderRef} className="flex gap-3 overflow-x-auto p-2 pb-4 scrollbar-hide snap-x snap-mandatory sm:gap-4">
        {items.map((movie, index) => (
          <div key={`${movie.subjectId}-${movie.title}-${index}`} className="w-40 flex-none snap-start sm:w-44 lg:w-48 xl:w-52 2xl:w-60">
            <MovieCard movie={movie} rank={isRanked ? index + 1 : undefined} />
          </div>
        ))}
      </div>
    </section>
  );
}
