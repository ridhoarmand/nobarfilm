'use client';

import { useWatchPartyStore } from '@/stores/watchPartyStore';
import { Crown, Loader2, UserX } from 'lucide-react';

interface WatchPartyParticipantsProps {
  onKickUser?: (socketId: string) => void;
}

export function WatchPartyParticipants({ onKickUser }: WatchPartyParticipantsProps) {
  const participants = useWatchPartyStore((s) => s.participants);
  const isHost = useWatchPartyStore((s) => s.isHost);
  const mySocketId = useWatchPartyStore((s) => s.mySocketId);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      <div className="text-xs text-zinc-400 font-medium px-1 mb-2">
        Peserta ({participants.length}/4)
      </div>

      {participants.map((p) => {
        const isMe = p.socketId === mySocketId;
        return (
          <div
            key={p.socketId}
            className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/40"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ backgroundColor: p.avatarColor || '#6B7280' }}
              >
                {(p.displayName || '?')[0].toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white truncate">
                    {p.displayName}
                  </span>
                  {isMe && (
                    <span className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
                      Kamu
                    </span>
                  )}
                  {p.isHost && (
                    <span title="Host" className="inline-flex items-center">
                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    </span>
                  )}
                </div>

                {p.isBuffering && (
                  <div className="flex items-center gap-1 text-[11px] text-amber-400 mt-0.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Sedang buffering...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Host can kick other participants */}
            {isHost && !isMe && onKickUser && (
              <button
                onClick={() => onKickUser(p.socketId)}
                title="Keluarkan dari room"
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
              >
                <UserX className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
