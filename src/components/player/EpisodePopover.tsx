'use client';

import React from 'react';
import { Check, X } from 'lucide-react';

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
      role="dialog"
      aria-label="Pilihan episode dan musim"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="player-panel text-white text-sm"
    >
      <div className="player-panel-header">
        <h2 className="font-semibold">Episode dan musim</h2>
        <button type="button" onClick={onClose} aria-label="Tutup pilihan episode" className="ml-auto min-h-11 min-w-11 rounded-lg hover:bg-white/10 flex items-center justify-center"><X className="w-4 h-4" aria-hidden="true" /></button>
      </div>

      <div className="space-y-3">
        {seasons.length > 1 && (
          <select
            value={activeSeason}
            aria-label="Musim"
            onChange={(e) => onSeasonChange(parseInt(e.target.value, 10))}
            className="min-h-11 w-full bg-zinc-950 border border-zinc-500 text-white rounded-lg px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                Musim {s}
              </option>
            ))}
          </select>
        )}
        <p className="text-xs text-zinc-400">Musim {activeSeason} · Daftar episode</p>
        {episodes.length === 0 && <p className="text-zinc-400">Episode untuk musim ini tidak tersedia.</p>}
        <div className="player-episode-grid">
          {episodes.map((ep) => {
            const isSelected = ep === activeEpisode;
            return (
              <button
                key={ep}
                type="button"
                aria-label={`Episode ${ep}`}
                aria-pressed={isSelected}
                onClick={() => {
                  onEpisodeChange(ep);
                  onClose();
                }}
                className="player-option min-h-11 px-1 text-center flex flex-col items-center justify-center gap-1"
              >
                <span>Ep {ep}</span>
                {isSelected && <Check className="w-4 h-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
