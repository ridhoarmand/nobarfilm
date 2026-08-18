'use client';

import React from 'react';
import { Tv, Check } from 'lucide-react';

interface EpisodePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  seasons: number[];
  episodes: number[];
  activeSeason?: number;
  activeEpisode?: number;
  onSeasonChange: (season: number) => void;
  onEpisodeChange: (episode: number) => void;
}

export function EpisodePopover({
  isOpen,
  onClose,
  seasons = [],
  episodes = [],
  activeSeason = 1,
  activeEpisode = 1,
  onSeasonChange,
  onEpisodeChange,
}: EpisodePopoverProps) {
  if (!isOpen) return null;

  return (
    <div
      data-interactive="true"
      data-popover="true"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="absolute bottom-14 sm:bottom-16 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-40 w-80 max-w-[calc(100vw-1rem)] bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl p-3.5 sm:p-4 animate-fade-in text-white text-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-red-500" />
          <span className="font-bold uppercase tracking-wider text-zinc-200">Episode & Season</span>
        </div>

        {/* Season Selector Dropdown */}
        {seasons.length > 1 && (
          <select
            value={activeSeason}
            onChange={(e) => onSeasonChange(parseInt(e.target.value, 10))}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-600 font-semibold"
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                Season {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Episode Grid */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
        <p className="text-[11px] font-semibold text-zinc-400 mb-2">Musim {activeSeason} — Daftar Episode</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {episodes.map((ep) => {
            const isSelected = ep === activeEpisode;
            return (
              <button
                key={ep}
                type="button"
                onClick={() => {
                  onEpisodeChange(ep);
                  onClose();
                }}
                className={`py-2 px-1 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-zinc-900/80 border border-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <span>Ep {ep}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
