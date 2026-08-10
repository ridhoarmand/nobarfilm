'use client';
import { Staff } from '@/types/api';
import Image from 'next/image';

interface CastListProps {
  cast: Staff[];
  maxItems?: number;
}

export function CastList({ cast, maxItems = 12 }: CastListProps) {
  const displayCast = cast.slice(0, maxItems);

  if (!displayCast || displayCast.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Pemeran Utama</h2>

      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-3 pt-1 scrollbar-hide snap-x snap-mandatory">
        {displayCast.map((actor, index) => (
          <div key={`${actor.staffId}-${index}`} className="flex-none w-20 sm:w-24 text-center group snap-start">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto relative rounded-full overflow-hidden bg-zinc-900 border border-zinc-700/80 shadow-md transition-transform duration-300 group-hover:scale-105 mb-2">
              {actor.avatarUrl ? (
                <Image
                  unoptimized
                  src={actor.avatarUrl}
                  alt={actor.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                  <span className="text-2xl font-bold text-zinc-500">{actor.name.charAt(0)}</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-white transition-colors">{actor.name}</p>
              {actor.character && <p className="text-[11px] text-zinc-400 line-clamp-1">{actor.character}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

