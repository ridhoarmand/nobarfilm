'use client';import { Staff } from '@/types/api';
import Image from 'next/image';

interface CastListProps {
  cast: Staff[];
  maxItems?: number;
}

export function CastList({ cast, maxItems = 10 }: CastListProps) {
  const displayCast = cast.slice(0, maxItems);

  if (!displayCast || displayCast.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-white">Cast</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayCast.map((actor, index) => (
          <div key={`${actor.staffId}-${index}`} className="group">
            <div className="aspect-[2/3] relative overflow-hidden rounded-lg bg-zinc-900 mb-2">
              {actor.avatarUrl ? (
                <Image
                  src={actor.avatarUrl}
                  alt={actor.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                  <span className="text-4xl text-zinc-600">{actor.name.charAt(0)}</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-white line-clamp-1">{actor.name}</p>
              {actor.character && <p className="text-xs text-gray-400 line-clamp-1">as {actor.character}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
