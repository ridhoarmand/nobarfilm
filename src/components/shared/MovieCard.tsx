'use client';

import { Subject } from '@/types/api';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Play, Heart } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';

interface MovieCardProps {
  movie: Subject;
  priority?: boolean;
  rank?: number;
}

export function MovieCard({ movie, priority = false, rank }: MovieCardProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const isBookmarked = isInWatchlist(movie.subjectId);

  return (
    <div className="group/card relative min-w-0 w-full">
      <Link href={`/${movie.subjectId}`} className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-md transition-colors group-hover/card:border-white/30 group-focus-within/card:border-white/30">
          {rank && <div className="absolute left-2 top-2 z-20 flex h-8 min-w-8 items-center justify-center rounded-md bg-red-600 px-1.5 text-sm font-black text-white">#{rank}</div>}
          {movie.cover?.url ? <Image src={movie.cover.url} alt="" fill sizes="(max-width: 640px) 160px, (max-width: 1280px) 200px, 240px" className="object-cover transition-transform duration-300 motion-reduce:transition-none group-hover/card:scale-105" priority={priority} loading={priority ? 'eager' : 'lazy'} /> : <div className="flex h-full items-center justify-center p-4 text-center text-sm text-zinc-500">Poster belum tersedia</div>}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white"><Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" /></span>
          </div>
        </div>
        <div className="mt-3 px-0.5">
          <h3 className="min-h-10 line-clamp-2 text-sm font-semibold leading-5 text-zinc-100 group-hover/card:text-white 2xl:min-h-12 2xl:text-base 2xl:leading-6" title={movie.title}>{movie.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 2xl:text-sm">
            <span>{movie.subjectType === 1 ? 'Film' : 'Series'}</span>
            {movie.releaseDate && <span>{new Date(movie.releaseDate).getFullYear()}</span>}
            {movie.imdbRatingValue && <span className="inline-flex items-center gap-1 text-zinc-300"><Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" aria-hidden="true" /><span className="sr-only">IMDb </span>{movie.imdbRatingValue}</span>}
          </div>
        </div>
      </Link>
      <button type="button" onClick={() => toggleWatchlist(movie)} aria-pressed={isBookmarked} aria-label={`${isBookmarked ? 'Hapus dari' : 'Simpan ke'} favorit: ${movie.title}`} title={isBookmarked ? 'Hapus dari Favorit' : 'Simpan ke Favorit'} className={`absolute right-2 top-2 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 shadow-lg backdrop-blur-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isBookmarked ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-black/75 text-white hover:bg-zinc-800'}`}><Heart className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} aria-hidden="true" /></button>
    </div>
  );
}
