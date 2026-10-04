'use client';

import { useEffect } from 'react';

const focusableSelector = 'a[href],button,input:not([type="hidden"]),select,textarea,summary,[tabindex]:not([tabindex="-1"])';
const nativeArrowSelector = 'input,textarea,select,[contenteditable="true"],[role="slider"],[role="spinbutton"],[role="combobox"],[data-native-arrows]';

function canFocus(element: HTMLElement) {
  if (element.tabIndex < 0 || element.matches(':disabled') || element.closest('[inert],[aria-hidden="true"],[aria-disabled="true"]')) return false;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  if (typeof element.checkVisibility === 'function') {
    return element.checkVisibility({ checkVisibilityCSS: true });
  }
  const style = window.getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

/** Directional focus for catalogue links and controls, without taking over media or form keys. */
export function SpatialNavigation() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const nativeControl = active?.closest(nativeArrowSelector);
      // A remote can leave ranges vertically; left/right still use native seeking/volume.
      const leavingRange = nativeControl?.matches('input[type="range"]') && (event.key === 'ArrowUp' || event.key === 'ArrowDown');
      if (nativeControl && (!leavingRange || nativeControl.matches('[data-native-arrows]'))) return;

      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"],dialog[open]'));
      const dialog = dialogs.reverse().find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && !element.closest('[aria-hidden="true"],[inert]');
      });
      const scope = dialog || document;
      const candidates = Array.from(scope.querySelectorAll<HTMLElement>(focusableSelector)).filter(canFocus);
      const current = active && candidates.includes(active) ? active : null;
      // Unfocused player shortcuts remain seek/play; only focused controls use D-pad navigation.
      if (!current && !dialog && document.querySelector('[data-player-shortcuts]')) return;

      let next: HTMLElement | undefined;
      if (!current) {
        next = candidates.find((element) => {
          const rect = element.getBoundingClientRect();
          return Boolean(element.closest('main')) && rect.top >= 0 && rect.top < window.innerHeight && rect.left >= 0 && rect.left < window.innerWidth;
        }) || candidates.find((element) => {
          const rect = element.getBoundingClientRect();
          return rect.top >= 0 && rect.top < window.innerHeight && rect.left >= 0 && rect.left < window.innerWidth;
        });
      } else {
        const origin = current.getBoundingClientRect();
        const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
        const positive = event.key === 'ArrowRight' || event.key === 'ArrowDown';
        const originMain = horizontal ? (origin.left + origin.right) / 2 : (origin.top + origin.bottom) / 2;
        const originCross = horizontal ? (origin.top + origin.bottom) / 2 : (origin.left + origin.right) / 2;
        let bestScore = Infinity;
        let bestAligned = false;

        for (const candidate of candidates) {
          if (candidate === current) continue;
          const rect = candidate.getBoundingClientRect();
          const main = horizontal ? (rect.left + rect.right) / 2 : (rect.top + rect.bottom) / 2;
          if ((main - originMain) * (positive ? 1 : -1) <= 1) continue;
          const cross = horizontal ? (rect.top + rect.bottom) / 2 : (rect.left + rect.right) / 2;
          const crossGap = horizontal
            ? Math.max(0, rect.top - origin.bottom, origin.top - rect.bottom)
            : Math.max(0, rect.left - origin.right, origin.left - rect.right);
          const score = Math.abs(main - originMain) + crossGap * 4 + Math.abs(cross - originCross) * 0.25;
          // Keep movement on the same visual row/column before choosing a diagonal.
          const aligned = crossGap === 0;
          if ((aligned && !bestAligned) || (aligned === bestAligned && score < bestScore)) {
            bestAligned = aligned;
            bestScore = score;
            next = candidate;
          }
        }
      }

      // Consume boundary arrows too: a focused button must not accidentally seek the video.
      if (current || next) {
        event.preventDefault();
        document.documentElement.dataset.inputMode = 'remote';
        if (next) {
          next.focus({ preventScroll: true });
          next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        }
      }
    };
    const onPointerDown = () => { delete document.documentElement.dataset.inputMode; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      delete document.documentElement.dataset.inputMode;
    };
  }, []);

  return null;
}
