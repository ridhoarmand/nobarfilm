'use client';
import { Subject } from '@/types/api';
import Image from 'next/image';
import Link from 'next/link';
import { Star, PlayCircle, Heart } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';

interface MovieCardProps {
  movie: Subject;
  priority?: boolean;
  rank?: number; // Ranking badge (1-10)
}

export function MovieCard({ movie, priority = false, rank }: MovieCardProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const isBookmarked = isInWatchlist(movie.subjectId);

  return (
    <div className="w-full">
      <Link href={`/${movie.subjectId}`} className="group/card block w-full relative">
        {/* POSTER IMAGE CONTAINER - Netflix Style Card */}
        <div 
          className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-[#181818] shadow-md border border-white/5 transition-all duration-300 ease-out group-hover/card:border-white/20 group-hover/card:shadow-2xl group-hover/card:shadow-black/90 group-hover/card:scale-[1.03]"
          style={{ position: 'relative' }}
        >
          {/* Rank Badge - Netflix Top 10 Badge Style */}
          {rank && (
            <div className="absolute top-0 left-0 z-30 bg-[#E50914] text-white flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-br-md shadow-md">
              <span className="text-xs sm:text-sm font-black tracking-tighter">#{rank}</span>
            </div>
          )}

          {/* Bookmark Heart Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWatchlist(movie);
            }}
            title={isBookmarked ? 'Hapus dari Favorit' : 'Simpan ke Favorit'}
            className={`absolute ${rank ? 'top-9 left-2' : 'top-2 left-2'} z-30 p-1.5 rounded-full backdrop-blur-md transition-all duration-200 ${
              isBookmarked
                ? 'bg-[#E50914] text-white shadow-lg scale-105'
                : 'bg-black/60 text-zinc-300 hover:text-white hover:bg-black/90 hover:scale-105'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-white' : ''}`} />
          </button>

          {/* Quality & Type Badges */}
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
            <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wide bg-black/80 text-zinc-200 rounded backdrop-blur-md border border-white/10">
              {movie.subjectType === 1 ? '1080p' : 'HD'}
            </span>
          </div>

          {/* Main Image */}
          <Image 
            src={movie.cover.url}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 ease-out group-hover/card:scale-105"
            priority={priority}
            loading={priority ? 'eager' : 'lazy'}
          />

          {/* Desktop Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="p-2.5 bg-[#E50914] rounded-full text-white shadow-xl transform scale-90 group-hover/card:scale-100 transition-transform duration-300">
              <PlayCircle className="w-7 h-7 fill-white/20" />
            </div>
          </div>
        </div>

        {/* INFO DETAILS */}
        <div className="mt-2.5 px-0.5">
          <h3 className="text-xs sm:text-sm font-bold text-zinc-200 line-clamp-1 group-hover/card:text-white transition-colors" title={movie.title}>
            {movie.title}
          </h3>

          <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
            <div className="flex items-center gap-3">
              {/* Year */}
              {movie.releaseDate && <span>{new Date(movie.releaseDate).getFullYear()}</span>}

              {/* Rating */}
              {movie.imdbRatingValue && (
                <div className="flex items-center gap-1 text-yellow-500/90">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="font-medium text-gray-300">{movie.imdbRatingValue}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
