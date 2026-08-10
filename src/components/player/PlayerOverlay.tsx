'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  MessageSquare,
  Volume1,
  Film,
  Tv,
  ArrowLeft,
  SkipForward,
} from 'lucide-react';
import { PlayerProgressBar } from './PlayerProgressBar';
import { SubtitlePopover } from './SubtitlePopover';
import { QualityPopover } from './QualityPopover';
import { AudioPopover } from './AudioPopover';
import { EpisodePopover } from './EpisodePopover';
import { usePlayerControls } from './hooks/usePlayerControls';
import { useDoubleTapSeek } from './hooks/useDoubleTapSeek';

interface CustomSubtitle {
  label: string;
  src: string;
}

export interface PlayerOverlayProps {
  title?: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  buffered?: number;
  onSeek: (time: number) => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onBack?: () => void;
  // Subtitles
  subtitles?: Array<{
    kind: string;
    label: string;
    srcLang: string;
    src: string;
    default?: boolean;
  }>;
  activeSubtitleIndex?: number | null;
  onSelectSubtitle?: (index: number | null) => void;
  subtitleDelay?: number;
  onDelayChange?: (delay: number) => void;
  subtitlePosition?: number;
  onPositionChange?: (pos: number) => void;
  onCustomSubtitleUpload?: (customSub: CustomSubtitle) => void;
  // Qualities
  qualities?: number[];
  activeQualityIndex?: number;
  activeHlsHeight?: number | null;
  onSelectQuality?: (index: number) => void;
  // Audio
  audioOptions?: Array<{ code: string; label: string }>;
  activeAudioCode?: string;
  onSelectAudio?: (code: string) => void;
  // Series Episode/Season
  isSeries?: boolean;
  seasons?: number[];
  episodes?: number[];
  activeSeason?: number;
  activeEpisode?: number;
  onSeasonChange?: (season: number) => void;
  onEpisodeChange?: (episode: number) => void;
  hasNextEpisode?: boolean;
  onNextEpisode?: () => void;
}

export function PlayerOverlay({
  title,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  buffered = 0,
  onSeek,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  isFullscreen,
  onToggleFullscreen,
  onBack,
  subtitles = [],
  activeSubtitleIndex = 0,
  onSelectSubtitle,
  subtitleDelay = 0,
  onDelayChange,
  subtitlePosition = 85,
  onPositionChange,
  onCustomSubtitleUpload,
  qualities = [],
  activeQualityIndex = 0,
  activeHlsHeight,
  onSelectQuality,
  audioOptions = [],
  activeAudioCode,
  onSelectAudio,
  isSeries = false,
  seasons = [],
  episodes = [],
  activeSeason = 1,
  activeEpisode = 1,
  onSeasonChange,
  onEpisodeChange,
  hasNextEpisode = false,
  onNextEpisode,
}: PlayerOverlayProps) {
  const { isVisible, showControls, keepControlsVisible } = usePlayerControls(3500);
  const { handleTap, seekAnimation } = useDoubleTapSeek({
    onSeek: (seconds) => onSeek(Math.max(0, Math.min(duration, currentTime + seconds))),
  });

  // Active popover modal state ('subtitle' | 'quality' | 'audio' | 'episode' | null)
  const [activePopover, setActivePopover] = useState<'subtitle' | 'quality' | 'audio' | 'episode' | null>(null);

  // If any popover is open, keep controls visible
  useEffect(() => {
    if (activePopover !== null) {
      keepControlsVisible();
    }
  }, [activePopover, keepControlsVisible]);

  const togglePopover = (popover: 'subtitle' | 'quality' | 'audio' | 'episode') => {
    setActivePopover((prev) => (prev === popover ? null : popover));
  };

  return (
    <div
      onMouseMove={showControls}
      onTouchStart={showControls}
      onClick={handleTap}
      className="absolute inset-0 z-30 flex flex-col justify-between select-none overflow-hidden transition-opacity duration-300"
    >
      {/* Dynamic Overlay Gradient Background */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/70 pointer-events-none transition-opacity duration-300 ${
          isVisible || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Ripple Animation Indicator for Double Tap */}
      {seekAnimation && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-40 pointer-events-none ${
            seekAnimation === 'rewind' ? 'left-12 sm:left-24' : 'right-12 sm:right-24'
          }`}
        >
          <div className="p-4 bg-red-600/90 text-white rounded-full backdrop-blur-md animate-ping flex items-center justify-center font-bold text-sm shadow-2xl">
            {seekAnimation === 'rewind' ? '-10s' : '+10s'}
          </div>
        </div>
      )}

      {/* TOP BAR: Back Button & Movie Title */}
      <div
        className={`relative z-30 flex items-center gap-3 p-4 sm:p-6 transition-opacity duration-300 pointer-events-auto ${
          isVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-full bg-black/50 hover:bg-red-600 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95"
            title="Kembali ke detail"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {title && (
          <h2 className="text-white text-sm sm:text-base font-bold truncate drop-shadow-md">
            {title}
          </h2>
        )}
      </div>

      {/* CENTER AREA: Large Play/Pause Toggle Button */}
      <div
        className={`relative z-30 flex items-center justify-center transition-opacity duration-300 pointer-events-auto ${
          isVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={onTogglePlay}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-2xl backdrop-blur-md border border-red-400/40 transition-all transform hover:scale-110 active:scale-95"
          title={isPlaying ? 'Jeda' : 'Putar'}
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-white" />
          ) : (
            <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white ml-1" />
          )}
        </button>
      </div>

      {/* BOTTOM CONTROL BAR */}
      <div
        className={`relative z-30 p-4 sm:p-6 space-y-2 transition-opacity duration-300 pointer-events-auto ${
          isVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar */}
        <PlayerProgressBar
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          onSeek={onSeek}
        />

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-2 pt-1 text-white">
          {/* Left Controls: Play, -10s, +10s, Volume */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onTogglePlay}
              className="p-2 rounded-lg hover:bg-white/10 transition"
              title={isPlaying ? 'Jeda (Space)' : 'Putar (Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            <button
              type="button"
              onClick={() => onSeek(Math.max(0, currentTime - 10))}
              className="p-2 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition flex items-center gap-1"
              title="Mundur 10s"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-[10px] font-bold hidden sm:inline">-10s</span>
            </button>

            <button
              type="button"
              onClick={() => onSeek(Math.min(duration, currentTime + 10))}
              className="p-2 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition flex items-center gap-1"
              title="Maju 10s"
            >
              <span className="text-[10px] font-bold hidden sm:inline">+10s</span>
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMuted ? 'Bunyikan Suara' : 'Bisukan Suara'}
                className="p-2 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition"
                title={isMuted ? 'Bunyikan' : 'Bisukan'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-500" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                aria-label="Volume suara"
                aria-valuenow={Math.round((isMuted ? 0 : volume) * 100)}
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-16 sm:w-20 accent-red-600 h-1 bg-zinc-700 rounded-lg cursor-pointer hidden sm:block opacity-70 group-hover/vol:opacity-100 transition-opacity"
              />
            </div>
          </div>

          {/* Right Controls: Popovers (Subtitle, Audio, Quality, Episode), Next Ep, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Episode Selector (Series Only) */}
            {isSeries && (seasons.length > 0 || episodes.length > 0) && (
              <button
                type="button"
                onClick={() => togglePopover('episode')}
                aria-label="Pilih Episode & Season"
                aria-expanded={activePopover === 'episode'}
                aria-haspopup="dialog"
                className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold ${
                  activePopover === 'episode'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                }`}
                title="Pilih Episode & Season"
              >
                <Tv className="w-4 h-4" />
                <span className="hidden sm:inline">E{activeEpisode}</span>
              </button>
            )}

            {/* Subtitles Popover Toggle */}
            {onSelectSubtitle && (
              <button
                type="button"
                onClick={() => togglePopover('subtitle')}
                aria-label="Pengaturan Subtitle"
                aria-expanded={activePopover === 'subtitle'}
                aria-haspopup="dialog"
                className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold ${
                  activePopover === 'subtitle' || activeSubtitleIndex !== null
                    ? 'bg-red-600/30 border border-red-600 text-white'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400'
                }`}
                title="Pengaturan Subtitle"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden md:inline">Subtitle</span>
              </button>
            )}

            {/* Audio Track Popover Toggle */}
            {audioOptions.length > 0 && onSelectAudio && (
              <button
                type="button"
                onClick={() => togglePopover('audio')}
                aria-label="Pengaturan Audio"
                aria-expanded={activePopover === 'audio'}
                aria-haspopup="dialog"
                className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold ${
                  activePopover === 'audio'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400'
                }`}
                title="Pengaturan Audio"
              >
                <Volume2 className="w-4 h-4" />
                <span className="hidden lg:inline">Audio</span>
              </button>
            )}

            {/* Quality Resolution Popover Toggle */}
            {qualities.length > 0 && onSelectQuality && (
              <button
                type="button"
                onClick={() => togglePopover('quality')}
                aria-label="Kualitas Resolusi"
                aria-expanded={activePopover === 'quality'}
                aria-haspopup="dialog"
                className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold ${
                  activePopover === 'quality'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                }`}
                title="Kualitas Resolusi"
              >
                <Film className="w-4 h-4" />
                <span className="text-[11px]">
                  {activeQualityIndex === -1
                    ? activeHlsHeight
                      ? `Auto (${activeHlsHeight}p)`
                      : 'Auto'
                    : `${qualities[activeQualityIndex] || qualities[0]}p`}
                </span>
              </button>
            )}

            {/* Next Episode Button */}
            {hasNextEpisode && onNextEpisode && (
              <button
                type="button"
                onClick={onNextEpisode}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 shadow-lg"
                title="Episode Selanjutnya"
              >
                <span className="hidden sm:inline">Next</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-2 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition"
              title={isFullscreen ? 'Keluar Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE POPOVERS & BACKDROP */}
      {activePopover !== null && (
        <div
          className="fixed inset-0 z-35 pointer-events-auto bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            setActivePopover(null);
          }}
        />
      )}
      {activePopover === 'subtitle' && onSelectSubtitle && (
        <SubtitlePopover
          isOpen={true}
          onClose={() => setActivePopover(null)}
          subtitles={subtitles}
          activeIndex={activeSubtitleIndex}
          onSelectSubtitle={onSelectSubtitle}
          subtitleDelay={subtitleDelay}
          onDelayChange={onDelayChange || (() => {})}
          subtitlePosition={subtitlePosition}
          onPositionChange={onPositionChange || (() => {})}
          onCustomSubtitleUpload={onCustomSubtitleUpload}
        />
      )}

      {activePopover === 'quality' && onSelectQuality && (
        <QualityPopover
          isOpen={true}
          onClose={() => setActivePopover(null)}
          qualities={qualities}
          activeIndex={activeQualityIndex}
          onSelectQuality={onSelectQuality}
        />
      )}

      {activePopover === 'audio' && onSelectAudio && (
        <AudioPopover
          isOpen={true}
          onClose={() => setActivePopover(null)}
          audioOptions={audioOptions}
          activeCode={activeAudioCode}
          onSelectAudio={onSelectAudio}
        />
      )}

      {activePopover === 'episode' && onSeasonChange && onEpisodeChange && (
        <EpisodePopover
          isOpen={true}
          onClose={() => setActivePopover(null)}
          seasons={seasons}
          episodes={episodes}
          activeSeason={activeSeason}
          activeEpisode={activeEpisode}
          onSeasonChange={onSeasonChange}
          onEpisodeChange={onEpisodeChange}
        />
      )}
    </div>
  );
}
