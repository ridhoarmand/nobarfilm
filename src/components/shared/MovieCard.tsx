import { Subject } from '@/types/api';import Image from 'next/image';
import Link from 'next/link';
import { Star, PlayCircle } from 'lucide-react';

interface MovieCardProps {
  movie: Subject;
  priority?: boolean;
  rank?: number; // Ranking badge (1-10)
}

export function MovieCard({ movie, priority = false, rank }: MovieCardProps) {
  return (
    <div className="w-full">
      <Link href={`/movie/${movie.subjectId}`} className="group/card block w-full relative">
        {/* POSTER IMAGE CONTAINER */}
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-800 shadow-lg ring-1 ring-white/10 transition-all duration-300 group-hover/card:ring-red-600/50 group-hover/card:shadow-red-900/20 group-hover/card:-translate-y-1">
          {/* Rank Badge - Top Left (Consistent & Readable) */}
          {rank && (
            <div className="absolute top-0 left-0 z-30 bg-red-600 shadow-lg flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-br-xl">
              <span className="text-lg sm:text-xl font-black text-white">{rank}</span>
            </div>
          )}

          {/* Type Badge (Top Right) */}
          {/* Only show if NOT ranked to avoid clutter, or keep small */}
          {!rank && (
            <div className="absolute top-2 right-2 z-20 opacity-90">
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white rounded backdrop-blur-md border border-white/10">
                {movie.subjectType === 1 ? 'Movie' : 'TV'}
              </span>
            </div>
          )}

          {/* Main Image */}
          <Image
            src={movie.cover.url}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover/card:scale-110"
            priority={priority}
            quality={80}
          />

          {/* Desktop Hover Overlay (Play Icon) */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
            <PlayCircle className="w-12 h-12 text-white fill-white/20 drop-shadow-lg transform scale-90 group-hover/card:scale-100 transition-transform duration-300" />
          </div>
        </div>

        {/* INFO DETAILS (Always Visible Below Poster) */}
        {/* Solves Mobile Visibility Issue */}
        <div className="mt-3 px-1">
          <h3 className="text-sm font-semibold text-gray-100 line-clamp-1 group-hover/card:text-red-500 transition-colors" title={movie.title}>
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
