import { Subject } from '@/types/api';import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';

interface MovieCardProps {
  movie: Subject;
  priority?: boolean;
}

export function MovieCard({ movie, priority = false }: MovieCardProps) {
  return (
    <Link href={`/movie/${movie.subjectId}`} className="group relative block aspect-[2/3] overflow-hidden rounded-md bg-zinc-900">
      {/* Poster Image - Scale happens here */}
      <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-110">
        <Image
          src={movie.cover.url}
          alt={movie.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-opacity duration-300 group-hover:opacity-70"
          priority={priority}
          placeholder={movie.cover.blurHash ? 'blur' : 'empty'}
          blurDataURL={movie.cover.blurHash}
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Info Overlay (on hover) */}
      <div className="absolute inset-x-0 bottom-0 p-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        {/* Title */}
        <h3 className="text-sm font-semibold text-white line-clamp-2 mb-1">{movie.title}</h3>

        {/* Rating & Year */}
        <div className="flex items-center gap-2 text-xs text-gray-300">
          {movie.imdbRatingValue && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              <span className="font-medium">{movie.imdbRatingValue}</span>
            </div>
          )}
          {movie.releaseDate && <span>{new Date(movie.releaseDate).getFullYear()}</span>}
        </div>

        {/* Genre */}
        {movie.genre && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{movie.genre.split(',').slice(0, 2).join(', ')}</p>}
      </div>

      {/* Badge for type */}
      <div className="absolute top-2 right-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="px-2 py-1 text-xs font-semibold bg-red-600 rounded">{movie.subjectType === 1 ? 'Movie' : 'Series'}</span>
      </div>
    </Link>
  );
}
