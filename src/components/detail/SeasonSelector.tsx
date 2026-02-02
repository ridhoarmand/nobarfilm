'use client';import { Season } from '@/types/api';
import { useState } from 'react';
import Link from 'next/link';
import { Download, Play } from 'lucide-react';

interface SeasonSelectorProps {
  seasons: Season[];
  subjectId: string;
  onDownload?: (season: number, episode: number) => void;
}

export function SeasonSelector({ seasons, subjectId, onDownload }: SeasonSelectorProps) {
  const [selectedSeason, setSelectedSeason] = useState(1);

  // Filter out movie entries (se: 0)
  const seriesSeasons = seasons.filter((s) => s.se > 0);

  if (seriesSeasons.length === 0) return null;

  const currentSeason = seriesSeasons.find((s) => s.se === selectedSeason) || seriesSeasons[0];

  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-white">Episodes</h2>

      {/* Season Selector */}
      {seriesSeasons.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {seriesSeasons.map((season) => (
            <button
              key={season.se}
              onClick={() => setSelectedSeason(season.se)}
              className={`px-4 py-2 rounded-lg font-medium transition ${selectedSeason === season.se ? 'bg-red-600 text-white' : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-white'}`}
            >
              Season {season.se}
            </button>
          ))}
        </div>
      )}

      {/* Episode Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: currentSeason.maxEp }, (_, i) => i + 1).map((episode) => (
          <div key={episode} className="flex gap-2">
            <Link href={`/watch/${subjectId}?season=${selectedSeason}&episode=${episode}`} className="flex-1 group flex items-center gap-3 p-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition">
              <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center flex-shrink-0 group-hover:bg-red-600 transition">
                <Play className="w-5 h-5 text-white fill-current" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">Episode {episode}</p>
                <p className="text-xs text-gray-400">{currentSeason.resolutions?.[0]?.resolution}p</p>
              </div>
            </Link>

            {onDownload && (
              <button
                onClick={() => onDownload(selectedSeason, episode)}
                className="flex items-center justify-center w-14 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition text-gray-400 hover:text-white"
                title="Download Episode"
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
          <span className="text-sm text-gray-400">Available in:</span>
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
