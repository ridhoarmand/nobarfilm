'use client';

import { useWatchPartyStore } from '@/stores/watchPartyStore';
import { Users } from 'lucide-react';

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
        type="button"
        aria-expanded={isPanelOpen}
        aria-label={`Chat nobar, ${participants.length} peserta, ${unreadCount} pesan belum dibaca`}
        className="player-icon-button"
        title={hasUnread ? `${unreadCount} pesan baru di chat nobar` : 'Buka/Tutup Chat Nobar'}
      >
        <Users className="size-5" />
        <span className="player-audio-label">Nobar</span>
        {hasUnread && <span className="text-xs tabular-nums">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        <span className="text-xs tabular-nums">
          {participants.length}
        </span>
      </button>
    );
  }

  return null;
}
