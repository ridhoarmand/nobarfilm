'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
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
  Sun,
} from 'lucide-react';
import { PlayerProgressBar } from './PlayerProgressBar';
import { AudioSubtitlePopover } from './AudioSubtitlePopover';
import { QualityPopover } from './QualityPopover';
import { EpisodePopover } from './EpisodePopover';
import { usePlayerControls } from './hooks/usePlayerControls';
import { usePlayerGestures } from './hooks/usePlayerGestures';

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
  brightness?: number;
  onBrightnessChange?: (brightness: number) => void;
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
  brightness = 1.0,
  onBrightnessChange,
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.matchMedia('(pointer: coarse)').matches);
    }
  }, []);

  const { isVisible, showControls, keepControlsVisible, scheduleQuickHide, hideControlsNow } = usePlayerControls(isPlaying, 2000);

  const {
    handleDesktopClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    seekFeedback,
    hudFeedback,
  } = usePlayerGestures({
    isMobile,
    onTogglePlay,
    onToggleFullscreen,
    onSeek: (deltaSeconds) => onSeek(Math.max(0, Math.min(duration, currentTime + deltaSeconds))),
    volume,
    onVolumeChange,
    brightness: brightness ?? 1.0,
    onBrightnessChange: onBrightnessChange ?? (() => {}),
    onToggleControls: () => {
      if (isVisible) {
        hideControlsNow();
      } else {
        showControls();
      }
    },
  });

  // Active popover modal state ('subtitle' | 'quality' | 'episode' | null)
  const [activePopover, setActivePopover] = useState<'subtitle' | 'quality' | 'episode' | null>(null);

  useEffect(() => {
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

  const handleMouseLeave = () => {
    if (activePopover === null) {
      hideControlsNow();
    }
  };

  // Center play/pause button is visible when controls are shown
  const showCenterControls = isVisible && (!isPlaying || isMobile);
  const showBottomBar = isVisible;

  return (
    <div
      onMouseMove={showControls}
      onMouseEnter={showControls}
      onMouseLeave={handleMouseLeave}
      onClick={handleDesktopClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="absolute inset-0 z-30 flex flex-col justify-between select-none overflow-hidden transition-opacity duration-300 cursor-pointer"
    >
      {/* Dynamic Overlay Gradient Background */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/30 pointer-events-none transition-opacity duration-300 ${
          showCenterControls ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Floating HUD Feedback for Volume & Brightness */}
      {hudFeedback && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-black/85 border border-white/20 text-white rounded-2xl backdrop-blur-xl shadow-2xl">
            {hudFeedback.type === 'volume' ? (
              (hudFeedback.value || 0) === 0 ? (
                <VolumeX className="w-5 h-5 text-red-500" />
              ) : (
                <Volume2 className="w-5 h-5 text-red-500" />
              )
            ) : (
              <Sun className="w-5 h-5 text-yellow-400" />
            )}
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                {hudFeedback.type === 'volume' ? 'Volume' : 'Kecerahan'}
              </span>
              <span className="text-sm font-extrabold font-mono text-zinc-100">
                {hudFeedback.value}%
              </span>
            </div>
            <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden ml-1">
              <div
                className="h-full bg-red-600 transition-all duration-75 rounded-full"
                style={{ width: `${hudFeedback.value}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Ripple Animation Indicator for Mobile Double Tap Seek */}
      {seekFeedback && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-40 pointer-events-none ${
            seekFeedback.side === 'rewind' ? 'left-8 sm:left-24' : 'right-8 sm:right-24'
          }`}
        >
          <div className="flex flex-col items-center justify-center p-3.5 sm:p-5 bg-black/85 border border-white/20 text-white rounded-full backdrop-blur-xl animate-scale-up shadow-2xl space-y-0.5 min-w-[72px] min-h-[72px]">
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-red-400 font-mono">
              {seekFeedback.side === 'rewind' ? `-${seekFeedback.seconds}s` : `+${seekFeedback.seconds}s`}
            </span>
            <span className="text-[9px] sm:text-[10px] text-zinc-300 uppercase tracking-widest font-semibold">
              {seekFeedback.side === 'rewind' ? 'Mundur' : 'Maju'}
            </span>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div
        className={`relative z-30 flex items-center gap-2 sm:gap-3 p-2.5 sm:p-5 px-2.5 sm:px-6 transition-opacity duration-300 pointer-events-auto ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {onBack && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onBack();
            }}
            className="p-2 rounded-full bg-black/60 hover:bg-red-600 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-105 active:scale-95 z-50 cursor-pointer"
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

      {/* CENTER PLAY/PAUSE OVERLAY BUTTON */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center transition-opacity duration-300 ${
          showCenterControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          className="p-4 sm:p-5 rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur-md border border-white/25 transition-all hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
          title={isPlaying ? 'Jeda' : 'Putar'}
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 sm:w-9 sm:h-9 fill-white" />
          ) : (
            <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-white ml-0.5" />
          )}
        </button>
      </div>

      {/* BOTTOM CONTROL BAR - mobile optimized layout */}
      <div
        className={`relative z-30 p-2 sm:p-4 px-2 sm:px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] space-y-1.5 sm:space-y-3 transition-opacity duration-300 pointer-events-auto ${
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
        <div className="flex items-center justify-between gap-1.5 sm:gap-4 overflow-hidden">
          {/* Left Controls: Play/Pause, Volume, Time */}
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink min-w-0">
            <button
              type="button"
              onClick={onTogglePlay}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-white transition flex-shrink-0"
            >
              {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/vol flex-shrink-0">
              <button
                type="button"
                onClick={onToggleMute}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-white transition"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="hidden sm:block w-16 sm:w-24 accent-red-600 cursor-pointer h-1.5 bg-zinc-700 rounded-lg transition-all opacity-80 group-hover/vol:opacity-100"
              />
            </div>

            {/* Time Display */}
            <div className="text-[11px] sm:text-xs text-zinc-300 font-mono font-medium whitespace-nowrap truncate">
              <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
              <span className="text-zinc-500 mx-0.5 sm:mx-1">/</span>
              <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
            </div>
          </div>

          {/* Right Controls: Unified Audio & Subtitle, Quality, Episodes, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Unified Audio & Subtitle Button */}
            {(subtitles.length > 0 || audioOptions.length > 0) && (
              <button
                type="button"
                onClick={() => togglePopover('subtitle')}
                aria-label="Pengaturan Audio & Subtitle"
                aria-expanded={activePopover === 'subtitle'}
                aria-haspopup="dialog"
                className={`p-1.5 sm:p-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold ${
                  activePopover === 'subtitle'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                }`}
                title="Pengaturan Audio & Subtitle"
              >
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
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
                className={`p-1.5 sm:p-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold ${
                  activePopover === 'quality'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                }`}
                title="Kualitas Resolusi"
              >
                <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-[10px] sm:text-[11px] whitespace-nowrap">
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
                className={`p-1.5 sm:p-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold ${
                  activePopover === 'episode'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                }`}
                title="Pilihan Episode & Musim"
              >
                <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-[10px] sm:text-[11px]">S{activeSeason} E{activeEpisode}</span>
              </button>
            )}

            {/* Next Episode Button */}
            {hasNextEpisode && onNextEpisode && (
              <button
                type="button"
                onClick={onNextEpisode}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 shadow-lg"
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
              className="p-1.5 sm:p-2 rounded-xl bg-black/40 sm:bg-transparent border border-white/10 sm:border-transparent hover:bg-white/20 text-white transition flex-shrink-0 shadow-md"
              title={isFullscreen ? 'Keluar Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
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
