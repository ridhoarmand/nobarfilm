'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play, Info, ChevronLeft, ChevronRight, Pause } from 'lucide-react';
import { useState, useEffect, useRef, useId } from 'react';

export interface HeroSlide {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  posterUrl: string;
  subjectId: string;
  subjectType: number;
  recommendationReason?: string;
  imdbRating?: string;
  releaseDate?: string;
  duration?: number;
}

interface HeroProps {
  slides: HeroSlide[];
}

export function Hero({ slides }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const slideId = useId();
  const slideCount = slides.length;
  const activeIndex = slideCount > 0 ? currentIndex % slideCount : 0;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(media.matches);
    updateMotion();
    media.addEventListener('change', updateMotion);
    return () => media.removeEventListener('change', updateMotion);
  }, []);

  useEffect(() => {
    if (slideCount <= 1 || isPaused || isInteracting || hasFocus || reducedMotion) return;
    const interval = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % slideCount);
    }, 6000);
    return () => window.clearInterval(interval);
  }, [slideCount, isPaused, isInteracting, hasFocus, reducedMotion]);

  const showSlide = (index: number) => {
    setIsPaused(true);
    setCurrentIndex((index + slideCount) % slideCount);
  };

  const currentSlide = slides[activeIndex];
  if (!currentSlide) return null;
  const watchUrl = currentSlide.subjectType === 1
    ? `/watch/${currentSlide.subjectId}?season=0&episode=0`
    : `/watch/${currentSlide.subjectId}?season=1&episode=1`;
  const image = currentSlide.coverUrl || currentSlide.posterUrl;
  const controlClass = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/20 bg-zinc-900/80 text-white hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500';

  return (
    <section
      aria-label="Pilihan utama"
      aria-roledescription="karusel"
      className="relative isolate w-full bg-[#141414]"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onFocusCapture={() => setHasFocus(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
        touchEndX.current = touchStartX.current;
        setIsPaused(true);
      }}
      onTouchMove={(event) => { touchEndX.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={() => {
        if (touchStartX.current !== null && touchEndX.current !== null) {
          const distance = touchStartX.current - touchEndX.current;
          if (Math.abs(distance) > 40) showSlide(activeIndex + (distance > 0 ? 1 : -1));
        }
        touchStartX.current = null;
        touchEndX.current = null;
      }}
    >
      <div className="relative aspect-video w-full overflow-hidden sm:absolute sm:inset-0 sm:aspect-auto">
        {image && <Image src={image} alt="" fill className="object-cover object-center" priority sizes="100vw" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/10 to-transparent" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-[#141414] via-[#141414]/75 to-transparent sm:block" />
      </div>

      <div className="content-container relative z-10 pb-6 sm:flex sm:min-h-[580px] sm:flex-col sm:justify-end sm:pb-10 sm:pt-24 lg:min-h-[660px] lg:pb-12 2xl:min-h-[760px]">
        <div id={slideId} aria-live={isPaused || reducedMotion ? 'polite' : 'off'} aria-atomic="true" className="max-w-2xl 2xl:max-w-3xl">
          <p className="mb-3 text-sm font-semibold text-red-400 sm:text-base">{currentSlide.recommendationReason || 'Pilihan untuk Anda'}</p>
          <h1 className="mb-4 break-words text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl 2xl:text-7xl">{currentSlide.title}</h1>
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-zinc-300 2xl:text-lg">
            <span>{currentSlide.subjectType === 1 ? 'Film' : 'Series'}</span>
            {currentSlide.imdbRating && <span>IMDb {currentSlide.imdbRating}</span>}
            {currentSlide.releaseDate && <span>{new Date(currentSlide.releaseDate).getFullYear()}</span>}
            {!!currentSlide.duration && currentSlide.duration > 0 && <span>{Math.floor(currentSlide.duration / 60)} menit</span>}
          </div>
          {currentSlide.description && <p className="mb-6 line-clamp-3 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base 2xl:max-w-2xl 2xl:text-lg">{currentSlide.description}</p>}
          <div className="flex flex-wrap gap-3">
            <Link href={watchUrl} aria-label="Tonton sekarang" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-base font-bold text-white transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:flex-none 2xl:text-lg">
              <Play className="h-5 w-5 fill-current" aria-hidden="true" /> Tonton
            </Link>
            <Link href={`/${currentSlide.subjectId}`} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:flex-none 2xl:text-lg">
              <Info className="h-5 w-5" aria-hidden="true" /> Lihat Detail
            </Link>
          </div>
        </div>

        {slideCount > 1 && (
          <div className="mt-6 flex flex-wrap items-center gap-2 sm:mt-8">
            <button type="button" onClick={() => showSlide(activeIndex - 1)} className={controlClass} aria-label="Tayangan sebelumnya" aria-controls={slideId}><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
            <button type="button" onClick={() => showSlide(activeIndex + 1)} className={controlClass} aria-label="Tayangan berikutnya" aria-controls={slideId}><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
            <span className="px-2 text-sm tabular-nums text-zinc-300">{activeIndex + 1} / {slideCount}</span>
            {!reducedMotion && <button type="button" onClick={() => setIsPaused((paused) => !paused)} className={controlClass} aria-label={isPaused ? 'Lanjutkan pergantian otomatis' : 'Jeda pergantian otomatis'}>{isPaused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}</button>}
            <div className="hidden flex-wrap gap-1 sm:flex" aria-label="Pilih tayangan">
              {slides.map((slide, index) => <button key={`${slide.id}-${index}`} type="button" onClick={() => showSlide(index)} className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500" aria-label={`Tayangan ${index + 1}: ${slide.title}`} aria-current={index === activeIndex ? 'true' : undefined} aria-controls={slideId}><span className={`h-2.5 rounded-full ${index === activeIndex ? 'w-6 bg-red-500' : 'w-2.5 bg-zinc-500'}`} /></button>)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
