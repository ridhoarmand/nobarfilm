'use client';

import { useWatchPartyStore } from '@/stores/watchPartyStore';
import { Users, Sparkles } from 'lucide-react';

interface WatchPartyControlsProps {
  onOpenCreateModal: () => void;
}

export function WatchPartyControls({ onOpenCreateModal }: WatchPartyControlsProps) {
  const roomCode = useWatchPartyStore((s) => s.roomCode);
  const participants = useWatchPartyStore((s) => s.participants);
  const isPanelOpen = useWatchPartyStore((s) => s.isPanelOpen);
  const togglePanel = useWatchPartyStore((s) => s.togglePanel);
  const unreadCount = useWatchPartyStore((s) => s.unreadCount);

  if (roomCode) {
    const hasUnread = !isPanelOpen && unreadCount > 0;

    return (
      <button
        onClick={togglePanel}
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 border ${
          isPanelOpen
            ? 'bg-red-600 border-red-500 text-white shadow-lg'
            : hasUnread
            ? 'bg-red-600/90 border-red-500 text-white shadow-md animate-bounce'
            : 'bg-zinc-800/90 hover:bg-zinc-700/90 border-zinc-700 text-zinc-200 hover:text-white'
        }`}
        title={hasUnread ? `${unreadCount} pesan baru di chat nobar` : 'Buka/Tutup Chat Nobar'}
      >
        <div className="relative flex items-center">
          <Users className="w-3.5 h-3.5" />
          {hasUnread ? (
            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-[8px] font-bold text-white items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          ) : (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-zinc-900 animate-pulse" />
          )}
        </div>
        <span className="hidden sm:inline">Nobar</span>
        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-zinc-900/60 font-mono">
          {participants.length}
        </span>
      </button>
    );
  }

  return null;
}
