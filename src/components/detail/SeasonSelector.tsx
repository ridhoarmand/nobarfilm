'use client';
import { Season } from '@/types/api';
import { useState } from 'react';
import Link from 'next/link';
import { Download, Play } from 'lucide-react';

interface SeasonSelectorProps {
  seasons: Season[];
  subjectId: string;
  onDownload?: (season: number, episode: number) => void;
  baseUrl?: string;
}

export function SeasonSelector({ seasons, subjectId, onDownload, baseUrl = '/watch' }: SeasonSelectorProps) {
  const [selectedSeason, setSelectedSeason] = useState(1);

  // Filter out movie entries (se: 0)
  const seriesSeasons = seasons.filter((s) => s.se > 0);

  if (seriesSeasons.length === 0) return null;

  const currentSeason = seriesSeasons.find((s) => s.se === selectedSeason) || seriesSeasons[0];

  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl 2xl:text-3xl font-bold text-white">Musim dan Episode</h2>

      {/* Season Selector */}
      {seriesSeasons.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {seriesSeasons.map((season) => (
            <button
              key={season.se}
              type="button"
              onClick={() => setSelectedSeason(season.se)}
              aria-pressed={currentSeason.se === season.se}
              className={`min-h-11 px-4 py-2.5 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${currentSeason.se === season.se ? 'bg-red-600 text-white' : 'bg-zinc-900 text-gray-300 hover:bg-zinc-800 hover:text-white'}`}
            >
              Musim {season.se}
            </button>
          ))}
        </div>
      )}
      <p className="text-sm text-zinc-400 2xl:text-base">Musim {currentSeason.se} · {currentSeason.maxEp} episode</p>

      {/* Episode Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: currentSeason.maxEp }, (_, i) => i + 1).map((episode) => (
          <div key={episode} className="flex min-w-0 gap-2">
            <Link href={`${baseUrl}/${subjectId}?season=${currentSeason.se}&episode=${episode}`} aria-label={`Tonton musim ${currentSeason.se}, episode ${episode}`} className="min-w-0 flex-1 group flex items-center gap-3 p-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500">
              <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center flex-shrink-0 group-hover:bg-red-600 group-focus-visible:bg-red-600 transition-colors">
                <Play className="w-5 h-5 text-white fill-current" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold 2xl:text-lg">Episode {episode}</p>
                {currentSeason.resolutions?.[0]?.resolution && <p className="text-xs text-gray-400 2xl:text-sm">{currentSeason.resolutions[0].resolution}p</p>}
              </div>
            </Link>

            {onDownload && (
              <button
                type="button"
                onClick={() => onDownload(currentSeason.se, episode)}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center w-14 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-gray-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                title="Unduh Episode"
                aria-label={`Unduh musim ${currentSeason.se}, episode ${episode}`}
              >
                <Download className="w-6 h-6" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Quality Info */}
      {currentSeason.resolutions && currentSeason.resolutions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-400">Kualitas tersedia:</span>
          {currentSeason.resolutions.map((res) => (
            <span key={res.resolution} className="px-2 py-1 bg-zinc-900 rounded text-xs text-gray-300">
              {res.resolution}p
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
