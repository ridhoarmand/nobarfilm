'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Lock,
  Unlock,
  Clock,
  PictureInPicture,
  MoreVertical,
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
  // PiP
  onTogglePiP?: () => void;
  // Watch Party
  partySlot?: React.ReactNode;
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
  onTogglePiP,
  partySlot,
}: PlayerOverlayProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isAutoNextDismissed, setIsAutoNextDismissed] = useState(false);

  const [hasControlFocus, setHasControlFocus] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const popoverOpenerRef = useRef<HTMLElement | null>(null);
  const keyboardFocusRef = useRef(false);

  useEffect(() => {
    setIsAutoNextDismissed(false);
  }, [activeEpisode, activeSeason]);
  
  // Sleep Timer (in milliseconds)
  const [sleepTimerMs, setSleepTimerMs] = useState<number | null>(null);
  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);
  const [sleepTimerDisplay, setSleepTimerDisplay] = useState<string>('');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.matchMedia('(pointer: coarse)').matches);
    }
  }, []);

  // Handle Sleep Timer tick
  useEffect(() => {
    if (!sleepTimerEnd) return;
    
    const tick = () => {
      const now = Date.now();
      const remaining = sleepTimerEnd - now;
      if (remaining <= 0) {
        setSleepTimerEnd(null);
        setSleepTimerMs(null);
        setSleepTimerDisplay('');
        if (isPlaying) {
          onTogglePlay();
        }
      } else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setSleepTimerDisplay(`${m}:${s.toString().padStart(2, '0')}`);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEnd, isPlaying, onTogglePlay]);
  
  const { isVisible, showControls, keepControlsVisible, hideControlsNow } = usePlayerControls(isPlaying, 3000);
  useEffect(() => {
    const handleKeyboardFocus = (event: KeyboardEvent) => {
      keyboardFocusRef.current = true;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const overlay = overlayRef.current;
      const canEnterControls = target === document.body ||
        target === document.documentElement ||
        target === overlay?.parentElement ||
        (target !== null && overlay?.contains(target));
      if (
        event.key === 'Enter' && !event.defaultPrevented &&
        !event.ctrlKey && !event.altKey && !event.metaKey && !isLocked &&
        canEnterControls &&
        !target?.closest('a, button, input, select, textarea, [role="button"], [role="slider"], [role="dialog"], [contenteditable="true"]') &&
        !document.querySelector('[role="dialog"]:not([aria-hidden="true"])')
      ) {
        event.preventDefault();
        event.stopPropagation();
        setHasControlFocus(true);
        keepControlsVisible();
        requestAnimationFrame(() => {
          overlayRef.current?.querySelector<HTMLButtonElement>('[data-playback-toggle]')?.focus();
        });
        return;
      }
      if (overlayRef.current?.contains(document.activeElement)) {
        setHasControlFocus(true);
        keepControlsVisible();
      }
    };
    window.addEventListener('keydown', handleKeyboardFocus, true);
    return () => window.removeEventListener('keydown', handleKeyboardFocus, true);
  }, [keepControlsVisible, isLocked]);

  // Settings panels are non-modal; keep Tab navigation native.
  const [activePopover, setActivePopover] = useState<'subtitle' | 'quality' | 'episode' | 'more' | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      showControls();
    }
  }, [isPlaying, showControls]);
  const closePopover = useCallback(() => {
    setActivePopover(null);
    showControls();
    requestAnimationFrame(() => {
      const opener = popoverOpenerRef.current;
      if (opener?.isConnected && !opener.closest('[inert]')) opener.focus();
    });
  }, [showControls]);


  useEffect(() => {
    if (activePopover === null) return;
    keepControlsVisible();
    overlayRef.current?.querySelector<HTMLElement>('[data-popover] button, [data-popover] select')?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      closePopover();
    };
    // Capture before player shortcuts, even if Tab has left this non-modal panel.
    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [activePopover, keepControlsVisible, closePopover]);

  const togglePopover = (popover: 'subtitle' | 'quality' | 'episode' | 'more') => {
    if (activePopover === popover) {
      closePopover();
      return;
    }
    if (activePopover === null && document.activeElement instanceof HTMLElement) {
      popoverOpenerRef.current = document.activeElement;
    }
    setActivePopover(popover);
  };


  const handleSetSleepTimer = (minutes: number) => {
    if (minutes === 0) {
      setSleepTimerMs(null);
      setSleepTimerEnd(null);
      setSleepTimerDisplay('');
    } else if (minutes === -1) {
      const remainingMs = Math.max(0, (duration - currentTime) * 1000);
      setSleepTimerMs(remainingMs);
      setSleepTimerEnd(Date.now() + remainingMs);
    } else {
      const ms = minutes * 60000;
      setSleepTimerMs(ms);
      setSleepTimerEnd(Date.now() + ms);
    }
    closePopover();
  };

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
      if (isVisible && !hasControlFocus && activePopover === null) {
        hideControlsNow();
      } else {
        showControls();
      }
    },
  });


  const handleMouseLeave = () => {
    if (activePopover === null && !hasControlFocus) {
      hideControlsNow();
    }
  };

  // A focused control or open settings panel must never fade out under the user.
  const controlsVisible = isVisible || hasControlFocus || activePopover !== null;
  const showCenterControls = !isLocked && controlsVisible && (!isPlaying || isMobile || hasControlFocus);
  const showBottomBar = !isLocked && controlsVisible;
  const showTopBar = !isLocked && controlsVisible;

  return (
    <div
      ref={overlayRef}
      onFocusCapture={() => {
        setHasControlFocus(keyboardFocusRef.current);
        if (keyboardFocusRef.current) keepControlsVisible();
      }}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setHasControlFocus(false);
          if (keyboardFocusRef.current) showControls();
        }
      }}
      onPointerDownCapture={() => {
        keyboardFocusRef.current = false;
        setHasControlFocus(false);
        showControls();
      }}
      onMouseMove={!isLocked ? showControls : undefined}
      onMouseEnter={!isLocked ? showControls : undefined}
      onMouseLeave={!isLocked ? handleMouseLeave : undefined}
      onClick={!isLocked ? handleDesktopClick : undefined}
      onTouchStart={!isLocked ? handleTouchStart : undefined}
      onTouchMove={!isLocked ? handleTouchMove : undefined}
      onTouchEnd={!isLocked ? handleTouchEnd : undefined}
      className={`absolute inset-0 z-30 flex flex-col justify-between select-none overflow-hidden transition-opacity duration-300 ${
        !isLocked && isPlaying && !controlsVisible ? 'cursor-none' : 'cursor-default'
      }`}
    >
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

      {/* SCREEN LOCK UNLOCK BUTTON */}
      {isLocked && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto bg-transparent">
          <button
            type="button"
            autoFocus
            aria-label="Buka kunci layar"
            data-interactive="true"
            onClick={(e) => {
              e.stopPropagation();
              setIsLocked(false);
              closePopover();
            }}
            className="p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all shadow-2xl animate-fade-in flex flex-col items-center gap-1"
          >
            <Unlock className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="text-[10px] font-bold">Buka</span>
          </button>
        </div>
      )}

      {/* AUTO NEXT EPISODE BANNER */}
      {isSeries && hasNextEpisode && !isAutoNextDismissed && duration > 0 && duration - currentTime <= 8 && duration - currentTime > 0 && isPlaying && !isLocked && (
        <div className="absolute bottom-24 right-4 sm:bottom-28 sm:right-8 z-40 pointer-events-auto animate-fade-in">
          <div className="flex flex-col items-end gap-2 bg-black/80 backdrop-blur-md border border-white/10 p-3 sm:p-4 rounded-xl shadow-2xl">
            <span className="text-xs sm:text-sm text-zinc-200 font-medium">
              Episode selanjutnya dalam <span className="font-bold text-white">{Math.ceil(duration - currentTime)}s</span>
            </span>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAutoNextDismissed(true);
                }}
                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onNextEpisode) onNextEpisode();
                }}
                className="px-3 py-1.5 bg-white text-black font-bold text-xs rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Putar Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR with subtle header gradient */}
      <div
        inert={!showTopBar}
        className={`relative z-30 flex items-center gap-2 sm:gap-3 p-2.5 sm:p-5 pt-[max(0.6rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] bg-gradient-to-b from-black/80 via-black/30 to-transparent transition-opacity duration-300 pointer-events-auto ${
          showTopBar ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
            className="p-2 sm:p-2.5 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-white/90 hover:text-white hover:bg-white/15 active:bg-white/25 transition-all active:scale-95 z-50 cursor-pointer"
            aria-label="Kembali"
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
        inert={!showCenterControls}
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
          aria-label={isPlaying ? 'Jeda' : 'Putar'}
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
        inert={!showBottomBar}
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
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-3">
          {/* Playback and volume; time is shown once beside the seek bar. */}
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink min-w-0">
            <button
              type="button"
              data-interactive="true"
              data-playback-toggle
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
              }}
              className="p-2 rounded-xl hover:bg-white/15 text-white transition flex-shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer"
              aria-label={isPlaying ? 'Jeda' : 'Putar'}
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
                aria-label={isMuted || volume === 0 ? 'Nyalakan suara' : 'Bisukan'}
                aria-pressed={isMuted || volume === 0}
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
                aria-label="Volume"
                aria-valuetext={`${Math.round((isMuted ? 0 : volume) * 100)} persen`}
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="hidden lg:block w-20 accent-red-600 cursor-pointer h-6 bg-zinc-700 rounded-lg transition-all opacity-80 group-hover/vol:opacity-100"
              />
            </div>

          </div>

          {/* Right Controls: Unified Audio & Subtitle, Quality, Episodes, Fullscreen */}
          <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2 min-w-0">
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
                <span className="hidden min-[1100px]:inline">Audio & Subtitle</span>
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
                className={`hidden min-[1100px]:flex p-2 sm:px-3 sm:py-2 rounded-xl transition items-center gap-1 text-xs font-semibold min-w-[44px] min-h-[44px] justify-center cursor-pointer ${
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
                className={`hidden min-[1100px]:flex p-2 sm:px-3 sm:py-2 rounded-xl transition items-center gap-1 text-xs font-semibold min-w-[44px] min-h-[44px] justify-center cursor-pointer ${
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
                className="hidden min-[1100px]:flex min-w-[44px] min-h-[44px] px-3 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-xs transition items-center justify-center gap-1.5 shadow-lg cursor-pointer flex-shrink-0"
                title="Episode Selanjutnya"
              >
                <span className="text-xs font-bold pointer-events-none select-none">Lanjut</span>
                <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 pointer-events-none" />
              </button>
            )}
            {/* Watch Party Slot */}
            {partySlot}

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
              aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
              title={isFullscreen ? 'Keluar layar penuh (F)' : 'Layar penuh (F)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
            </button>

            {/* More Menu (Titik 3) Button */}
            <button
              type="button"
              data-interactive="true"
              onClick={(e) => {
                e.stopPropagation();
                togglePopover('more');
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
              }}
              aria-label="Opsi dan tips pemutar"
              aria-expanded={activePopover === 'more'}
              aria-haspopup="dialog"
              className={`p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl transition flex-shrink-0 cursor-pointer ${
                activePopover === 'more' || sleepTimerEnd !== null
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-black/40 sm:bg-transparent border border-white/10 sm:border-transparent hover:bg-white/20 text-white'
              }`}
              title="Opsi dan tips pemutar"
            >
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              {sleepTimerDisplay && (
                <span className="text-[9px] sm:text-[10px] ml-0.5 font-bold text-red-200">
                  {sleepTimerDisplay}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE POPOVERS & BACKDROP */}
      {activePopover !== null && (
        <div
          className="absolute inset-0 z-40 pointer-events-auto bg-black/20"
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

      {/* More Options (Titik 3) Popover */}
      {activePopover === 'more' && (
        <div
          data-popover
          data-interactive
          role="dialog"
          aria-label="Opsi pemutar"
          className="absolute inset-y-3 right-3 z-50 w-80 max-w-[calc(100%-1.5rem)] overflow-y-auto overscroll-contain bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 animate-fade-in flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-white/10 mb-1 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Opsi Lainnya</h3>
            <button type="button" onClick={closePopover} aria-label="Tutup opsi pemutar" className="rounded-lg hover:bg-white/10 text-white">×</button>
          </div>

          {qualities.length > 0 && onSelectQuality && (
            <button type="button" onClick={() => togglePopover('quality')} className="min-[1100px]:hidden w-full text-left px-3 py-2.5 text-sm rounded-xl hover:bg-white/10">
              Kualitas: {activeQualityIndex === -1 ? 'Otomatis' : `${qualities[activeQualityIndex] || qualities[0]}p`}
            </button>
          )}
          {isSeries && episodes.length > 0 && onSeasonChange && onEpisodeChange && (
            <button type="button" onClick={() => togglePopover('episode')} className="min-[1100px]:hidden w-full text-left px-3 py-2.5 text-sm rounded-xl hover:bg-white/10">
              Pilih episode · S{activeSeason} E{activeEpisode}
            </button>
          )}
          {hasNextEpisode && onNextEpisode && (
            <button type="button" onClick={() => { onNextEpisode(); closePopover(); }} className="min-[1100px]:hidden w-full text-left px-3 py-2.5 text-sm rounded-xl hover:bg-white/10">
              Putar episode selanjutnya
            </button>
          )}
          {/* 1. Kunci Layar */}
          <button
            type="button"
            onClick={() => {
              setIsLocked(true);
              hideControlsNow();
              closePopover();
            }}
            className="w-full text-left px-3 py-2.5 text-xs font-medium rounded-xl text-zinc-200 hover:bg-white/10 transition-colors flex items-center gap-2.5 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-red-500" />
            <span>Kunci Layar</span>
          </button>

          {/* 2. PiP */}
          {onTogglePiP && (
            <button
              type="button"
              onClick={() => {
                onTogglePiP();
                closePopover();
              }}
              className="w-full text-left px-3 py-2.5 text-xs font-medium rounded-xl text-zinc-200 hover:bg-white/10 transition-colors flex items-center gap-2.5 cursor-pointer"
            >
              <PictureInPicture className="w-4 h-4 text-red-500" />
              <span>Jendela kecil (PiP)</span>
            </button>
          )}

          {/* 3. Timer Tidur */}
          <div className="pt-1.5 mt-1 border-t border-white/10">
            <div className="px-3 py-1 flex items-center justify-between text-[11px] font-semibold text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-500" />
                <span>Timer Tidur</span>
              </div>
              {sleepTimerDisplay && (
                <span className="text-[10px] text-red-400 font-bold font-mono">
                  {sleepTimerDisplay}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1 mt-1 px-1">
              {[
                { label: 'Nonaktif', value: 0 },
                { label: '15 Menit', value: 15 },
                { label: '30 Menit', value: 30 },
                { label: '45 Menit', value: 45 },
                { label: '60 Menit', value: 60 },
                { label: 'Akhir Ep.', value: -1 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    handleSetSleepTimer(opt.value);
                  }}
                  className={`px-2 py-1.5 text-[11px] font-medium rounded-lg transition-colors text-center cursor-pointer ${
                    (opt.value === 0 && sleepTimerEnd === null) ||
                    (opt.value > 0 && sleepTimerMs === opt.value * 60000) ||
                    (opt.value === -1 && sleepTimerMs !== null && sleepTimerMs % 60000 !== 0)
                      ? 'bg-red-600 text-white font-bold'
                      : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-3 py-3 text-xs text-zinc-400 border-t border-white/10 mt-2 space-y-2">
            <p className="font-semibold text-zinc-200">Tips pemutar</p>
            <p>Ketuk dua kali sisi kiri / kanan untuk mundur / maju. Geser sisi kiri untuk kecerahan, sisi kanan untuk volume.</p>
            <p>Keyboard / remote: Enter menampilkan kontrol dan memfokuskan tombol putar. Spasi / K putar atau jeda, J / L mundur atau maju 10 detik, M suara, F layar penuh. Saat tombol terfokus, gunakan arah untuk berpindah dan Enter / Spasi untuk memilih. Esc menutup pengaturan.</p>
          </div>
        </div>
      )}
    </div>
  );
}
