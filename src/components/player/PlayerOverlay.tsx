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
      {/* Floating HUD Feedback for Volume & Brightness */}
      {hudFeedback && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-2 bg-black/75 border border-white/15 text-white rounded-2xl backdrop-blur-md shadow-2xl">
            {hudFeedback.type === 'volume' ? (
              (hudFeedback.value || 0) === 0 ? (
                <VolumeX className="w-4 h-4 text-red-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-red-500" />
              )
            ) : (
              <Sun className="w-4 h-4 text-yellow-400" />
            )}
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                {hudFeedback.type === 'volume' ? 'Volume' : 'Kecerahan'}
              </span>
              <span className="text-xs font-bold font-mono text-zinc-100">
                {hudFeedback.value}%
              </span>
            </div>
            <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden ml-1">
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
            seekFeedback.side === 'rewind' ? 'left-6 sm:left-20' : 'right-6 sm:right-20'
          }`}
        >
          <div className="flex items-center justify-center p-3 sm:p-3.5 bg-black/60 border border-white/15 text-white rounded-full backdrop-blur-md animate-scale-up shadow-xl min-w-[54px] min-h-[54px]">
            <span className="font-bold text-xs sm:text-sm tracking-wider text-white font-mono">
              {seekFeedback.side === 'rewind' ? `-${seekFeedback.seconds}s` : `+${seekFeedback.seconds}s`}
            </span>
          </div>
        </div>
      )}

      {/* TOP BAR with subtle header gradient */}
      <div
        className={`relative z-30 flex items-center gap-2 sm:gap-3 p-2.5 sm:p-5 pt-[max(0.6rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] bg-gradient-to-b from-black/80 via-black/30 to-transparent transition-opacity duration-300 pointer-events-auto ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {onBack && (
          <button
            type="button"
            data-interactive="true"
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onBack();
            }}
            className="p-2 sm:p-2.5 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-white/90 hover:text-white hover:bg-white/15 active:bg-white/25 transition-all active:scale-95 z-50 cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
          </button>
        )}

        {title && (
          <h2 className="text-white font-bold text-sm sm:text-base lg:text-lg truncate drop-shadow-md">
            {title}
          </h2>
        )}
      </div>

      {/* CENTER PLAY/PAUSE OVERLAY BUTTON - Sleek, Translucent & Modern */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center transition-opacity duration-300 ${
          showCenterControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          data-interactive="true"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
          }}
          className="p-3 sm:p-3.5 rounded-full bg-black/35 hover:bg-black/60 text-white backdrop-blur-sm border border-white/15 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg cursor-pointer min-w-[48px] min-h-[48px] sm:min-w-[52px] sm:min-h-[52px] flex items-center justify-center"
          title={isPlaying ? 'Jeda' : 'Putar'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
          ) : (
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
          )}
        </button>
      </div>

      {/* BOTTOM CONTROL BAR - Clean footer gradient */}
      <div
        className={`relative z-30 p-2 sm:p-4 px-2.5 sm:px-6 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.6rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/85 via-black/40 to-transparent space-y-1.5 sm:space-y-3 transition-opacity duration-300 pointer-events-auto ${
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
              data-interactive="true"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
              }}
              className="p-2 rounded-xl hover:bg-white/15 text-white transition flex-shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer"
              title={isPlaying ? 'Jeda' : 'Putar'}
            >
              {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1 sm:gap-1.5 group/vol flex-shrink-0">
              <button
                type="button"
                data-interactive="true"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                }}
                className="p-2 rounded-xl hover:bg-white/15 text-white transition min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer"
                title={isMuted || volume === 0 ? 'Nyalakan Suara' : 'Bisukan'}
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
                data-interactive="true"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="hidden sm:block w-16 sm:w-24 accent-red-600 cursor-pointer h-1.5 bg-zinc-700 rounded-lg transition-all opacity-80 group-hover/vol:opacity-100"
              />
            </div>

            {/* Time Display */}
            <div className="text-[11px] sm:text-xs text-zinc-300 font-mono font-medium whitespace-nowrap truncate select-none">
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
                data-interactive="true"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePopover('subtitle');
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                }}
                aria-label="Pengaturan Audio & Subtitle"
                aria-expanded={activePopover === 'subtitle'}
                aria-haspopup="dialog"
                className={`p-2 sm:px-3 sm:py-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold min-w-[38px] min-h-[38px] justify-center cursor-pointer ${
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
                data-interactive="true"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePopover('quality');
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                }}
                aria-label="Kualitas Resolusi"
                aria-expanded={activePopover === 'quality'}
                aria-haspopup="dialog"
                className={`p-2 sm:px-3 sm:py-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold min-w-[38px] min-h-[38px] justify-center cursor-pointer ${
                  activePopover === 'quality'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                }`}
                title="Kualitas Resolusi"
              >
                <Film className="w-4 h-4 text-zinc-300" />
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
                data-interactive="true"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePopover('episode');
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                }}
                aria-label="Pilihan Episode & Musim"
                aria-expanded={activePopover === 'episode'}
                aria-haspopup="dialog"
                className={`p-2 sm:px-3 sm:py-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold min-w-[38px] min-h-[38px] justify-center cursor-pointer ${
                  activePopover === 'episode'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                }`}
                title="Pilihan Episode & Musim"
              >
                <Tv className="w-4 h-4 text-zinc-300" />
                <span className="text-[10px] sm:text-[11px]">S{activeSeason} E{activeEpisode}</span>
              </button>
            )}

            {/* Next Episode Button */}
            {hasNextEpisode && onNextEpisode && (
              <button
                type="button"
                data-interactive="true"
                onClick={(e) => {
                  e.stopPropagation();
                  onNextEpisode();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                }}
                className="min-w-[44px] min-h-[40px] sm:min-h-[38px] px-3 sm:px-3.5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer select-none flex-shrink-0"
                title="Episode Selanjutnya"
              >
                <span className="text-xs font-bold pointer-events-none select-none">Next</span>
                <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 pointer-events-none" />
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              type="button"
              data-interactive="true"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreen();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
              }}
              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl bg-black/40 sm:bg-transparent border border-white/10 sm:border-transparent hover:bg-white/20 text-white transition flex-shrink-0 shadow-md cursor-pointer"
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
