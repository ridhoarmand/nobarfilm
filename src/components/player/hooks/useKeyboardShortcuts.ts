'use client';

import { useEffect, useRef } from 'react';

interface KeyboardCallbacks {
  onTogglePlay?: () => void;
  onSeek?: (seconds: number) => void;
  onSeekPercent?: (percent: number) => void;
  onVolumeChange?: (delta: number) => void;
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
  onToggleSubtitle?: () => void;
  onEscape?: () => void;
  isActive?: boolean;
}

export function useKeyboardShortcuts({
  onTogglePlay,
  onSeek,
  onSeekPercent,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onToggleSubtitle,
  onEscape,
  isActive = true,
}: KeyboardCallbacks) {
  const callbacksRef = useRef({
    onTogglePlay,
    onSeek,
    onSeekPercent,
    onVolumeChange,
    onToggleMute,
    onToggleFullscreen,
    onToggleSubtitle,
    onEscape,
  });

  useEffect(() => {
    callbacksRef.current = {
      onTogglePlay,
      onSeek,
      onSeekPercent,
      onVolumeChange,
      onToggleMute,
      onToggleFullscreen,
      onToggleSubtitle,
      onEscape,
    };
  });

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keyboard shortcuts if user is typing in an input/textarea/select/contentEditable
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const callbacks = callbacksRef.current;

      // Handle number keys 0-9 to jump to 0%-90% of video
      if (e.code >= 'Digit0' && e.code <= 'Digit9' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const num = parseInt(e.code.replace('Digit', ''), 10);
        e.preventDefault();
        callbacks.onSeekPercent?.(num * 0.1);
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          callbacks.onTogglePlay?.();
          break;

        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          callbacks.onSeek?.(-10);
          break;

        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          callbacks.onSeek?.(10);
          break;

        case 'ArrowUp':
          e.preventDefault();
          callbacks.onVolumeChange?.(0.05);
          break;

        case 'ArrowDown':
          e.preventDefault();
          callbacks.onVolumeChange?.(-0.05);
          break;

        case 'KeyM':
          e.preventDefault();
          callbacks.onToggleMute?.();
          break;

        case 'KeyF':
          e.preventDefault();
          callbacks.onToggleFullscreen?.();
          break;

        case 'KeyC':
          e.preventDefault();
          callbacks.onToggleSubtitle?.();
          break;

        case 'Escape':
          e.preventDefault();
          callbacks.onEscape?.();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
}
