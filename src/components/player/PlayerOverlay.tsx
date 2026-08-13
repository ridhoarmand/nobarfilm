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
import { AudioSubtitlePopover } from './AudioSubtitlePopover';
import { QualityPopover } from './QualityPopover';
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
  subtitleFontSize?: 'sm' | 'md' | 'lg' | 'xl';
  onFontSizeChange?: (size: 'sm' | 'md' | 'lg' | 'xl') => void;
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
  subtitlePosition = 75,
  onPositionChange,
  subtitleFontSize = 'md',
  onFontSizeChange,
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
  const { isVisible, showControls, keepControlsVisible, scheduleQuickHide, hideControlsNow } = usePlayerControls(isPlaying, 2000);
  const { handleTap, seekAnimation } = useDoubleTapSeek({
    onSeek: (seconds) => onSeek(Math.max(0, Math.min(duration, currentTime + seconds))),
  });

  // Active popover modal state ('subtitle' | 'quality' | 'episode' | null)
  const [activePopover, setActivePopover] = useState<'subtitle' | 'quality' | 'episode' | null>(null);

  useEffect(() => {
    // Setelah video dipause atau setelah play lagi, tapang controls otomatis
    if (!isPlaying) {
      showControls();
    }
  }, [isPlaying, showControls]);

  // If any popover is open, keep controls visible
  useEffect(() => {
    if (activePopover !== null) {
      keepControlsVisible();
    }
  }, [activePopover, keepControlsVisible]);

  const togglePopover = (popover: 'subtitle' | 'quality' | 'episode') => {
    setActivePopover((prev) => (prev === popover ? null : popover));
  };

  const closePopover = () => {
    setActivePopover(null);
    scheduleQuickHide(800);
  };

  // Handle tap: first click/tap shows controls; subsequent clicks allow toggle/double-tap seek
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Mobile: first tap shows controls, nothing else, to prevent instant seek from accidental touch
    if (e.type === 'click' && window.matchMedia('(pointer: coarse)').matches) {
      showControls();
      return;
    }
    // Desktop: click on the video -> toggle controls on (like YouTube)
    showControls();
    handleTap(e);
  };

  const handleMouseLeave = () => {
    if (activePopover === null) {
      hideControlsNow();
    }
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.matchMedia('(pointer: coarse)').matches);
    }
  }, []);

  // YouTube-like behavior: On desktop, hover shows top & bottom controls but keeps center clean while playing.
  // Center controls show when video is PAUSED, or on mobile touch tap.
  const showCenterControls = isVisible && (!isPlaying || isMobile);
  const showBottomBar = isVisible;

  return (
    <div
      onMouseMove={showControls}
      onMouseEnter={showControls}
      onMouseLeave={handleMouseLeave}
      onClick={handleContainerClick}
      className="absolute inset-0 z-30 flex flex-col justify-between select-none overflow-hidden transition-opacity duration-300"
    >
      {/* Dynamic Overlay Gradient Background - only when paused or after click/tap */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 pointer-events-none transition-opacity duration-300 ${
          showCenterControls ? 'opacity-100' : 'opacity-0'
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

      <div
        className={`relative z-30 flex items-center gap-3 p-4 sm:p-6 transition-opacity duration-300 pointer-events-auto ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-full bg-black/50 hover:bg-red-600 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {title && (
          <h2 className="text-white font-bold text-sm sm:text-lg truncate drop-shadow-md">
            {title}
          </h2>
        )}
      </div>

      {/* CENTER PLAY/PAUSE OVERLAY BUTTON - only on pause or after click/tap (no hover) */}
      <div
        className={`relative z-30 flex items-center justify-center gap-3 sm:gap-5 transition-opacity duration-300 ${
          showCenterControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSeek(Math.max(0, currentTime - 10));
          }}
          className="p-2 sm:p-2.5 rounded-full bg-black/50 hover:bg-white/20 text-zinc-300 hover:text-white backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95"
          title="Mundur 10 Detik"
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          className="p-3 sm:p-3.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white shadow-xl transition-all hover:scale-105 active:scale-95 border border-white/20 backdrop-blur-md"
          title={isPlaying ? 'Jeda' : 'Putar'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
          ) : (
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSeek(Math.min(duration, currentTime + 10));
          }}
          className="p-2 sm:p-2.5 rounded-full bg-black/50 hover:bg-white/20 text-zinc-300 hover:text-white backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95"
          title="Maju 10 Detik"
        >
          <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* BOTTOM CONTROL BAR - same visibility as center (pause/click), not on hover */}
      <div
        className={`relative z-30 p-4 sm:p-6 space-y-3 transition-opacity duration-300 pointer-events-auto ${
          showBottomBar ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Seekable Progress Bar */}
        <PlayerProgressBar
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          onSeek={onSeek}
        />

        {/* Bottom Control Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Controls: Play/Pause, Volume, Time */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={onTogglePlay}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group/vol">
              <button
                type="button"
                onClick={onToggleMute}
                className="p-2 rounded-lg hover:bg-white/10 text-white transition"
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
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-16 sm:w-24 accent-red-600 cursor-pointer h-1.5 bg-zinc-700 rounded-lg transition-all opacity-80 group-hover/vol:opacity-100"
              />
            </div>

            {/* Time Display */}
            <div className="text-xs text-zinc-300 font-mono font-medium">
              <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
              <span className="text-zinc-500 mx-1">/</span>
              <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
            </div>
          </div>

          {/* Right Controls: Unified Audio & Subtitle, Quality, Episodes, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Unified Audio & Subtitle Button */}
            {(subtitles.length > 0 || audioOptions.length > 0) && (
              <button
                type="button"
                onClick={() => togglePopover('subtitle')}
                aria-label="Pengaturan Audio & Subtitle"
                aria-expanded={activePopover === 'subtitle'}
                aria-haspopup="dialog"
                className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold ${
                  activePopover === 'subtitle'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                }`}
                title="Pengaturan Audio & Subtitle"
              >
                <MessageSquare className="w-4 h-4 text-red-500" />
                <span className="hidden sm:inline">Audio & Subtitle</span>
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
                    ? `Auto (${activeHlsHeight || (qualities.length > 0 ? qualities[0] : 1080)}p)`
                    : `${qualities[activeQualityIndex] || qualities[0]}p`}
                </span>
              </button>
            )}

            {/* Series Episode Selector */}
            {isSeries && episodes.length > 0 && (
              <button
                type="button"
                onClick={() => togglePopover('episode')}
                aria-label="Pilihan Episode & Musim"
                aria-expanded={activePopover === 'episode'}
                aria-haspopup="dialog"
                className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold ${
                  activePopover === 'episode'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                }`}
                title="Pilihan Episode & Musim"
              >
                <Tv className="w-4 h-4" />
                <span className="text-[11px]">S{activeSeason} E{activeEpisode}</span>
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
            closePopover();
          }}
        />
      )}

      {/* Unified Audio & Subtitle Popover */}
      {activePopover === 'subtitle' && (
        <AudioSubtitlePopover
          isOpen={true}
          onClose={closePopover}
          audioOptions={audioOptions}
          activeAudioCode={activeAudioCode}
          onSelectAudio={onSelectAudio}
          subtitles={subtitles}
          activeSubtitleIndex={activeSubtitleIndex}
          onSelectSubtitle={onSelectSubtitle}
          subtitleDelay={subtitleDelay}
          onDelayChange={onDelayChange}
          subtitlePosition={subtitlePosition}
          onPositionChange={onPositionChange}
          subtitleFontSize={subtitleFontSize}
          onFontSizeChange={onFontSizeChange}
          onCustomSubtitleUpload={onCustomSubtitleUpload}
        />
      )}

      {activePopover === 'quality' && onSelectQuality && (
        <QualityPopover
          isOpen={true}
          onClose={closePopover}
          qualities={qualities}
          activeIndex={activeQualityIndex}
          onSelectQuality={onSelectQuality}
          activeHlsHeight={activeHlsHeight}
        />
      )}

      {activePopover === 'episode' && onSeasonChange && onEpisodeChange && (
        <EpisodePopover
          isOpen={true}
          onClose={closePopover}
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
