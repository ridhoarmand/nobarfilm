'use client';

import { useEffect, useRef } from 'react';

interface KeyboardCallbacks {
  onTogglePlay?: () => void;
  onSeek?: (seconds: number) => void;
  onVolumeChange?: (delta: number) => void;
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
  onEscape?: () => void;
  isActive?: boolean;
}

export function useKeyboardShortcuts({
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onEscape,
  isActive = true,
}: KeyboardCallbacks) {
  const callbacksRef = useRef({
    onTogglePlay,
    onSeek,
    onVolumeChange,
    onToggleMute,
    onToggleFullscreen,
    onEscape,
  });

  useEffect(() => {
    callbacksRef.current = {
      onTogglePlay,
      onSeek,
      onVolumeChange,
      onToggleMute,
      onToggleFullscreen,
      onEscape,
    };
  });

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keyboard shortcuts if user is typing in an input/textarea/select
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      const callbacks = callbacksRef.current;

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
          callbacks.onVolumeChange?.(0.1);
          break;

        case 'ArrowDown':
          e.preventDefault();
          callbacks.onVolumeChange?.(-0.1);
          break;

        case 'KeyM':
          e.preventDefault();
          callbacks.onToggleMute?.();
          break;

        case 'KeyF':
          e.preventDefault();
          callbacks.onToggleFullscreen?.();
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
