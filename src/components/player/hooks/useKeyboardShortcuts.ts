'use client';

import { useEffect } from 'react';

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
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keyboard shortcuts if user is typing in an input/textarea/select
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          onTogglePlay?.();
          break;

        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          onSeek?.(-10);
          break;

        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          onSeek?.(10);
          break;

        case 'ArrowUp':
          e.preventDefault();
          onVolumeChange?.(0.1);
          break;

        case 'ArrowDown':
          e.preventDefault();
          onVolumeChange?.(-0.1);
          break;

        case 'KeyM':
          e.preventDefault();
          onToggleMute?.();
          break;

        case 'KeyF':
          e.preventDefault();
          onToggleFullscreen?.();
          break;

        case 'Escape':
          e.preventDefault();
          onEscape?.();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onTogglePlay, onSeek, onVolumeChange, onToggleMute, onToggleFullscreen, onEscape]);
}
