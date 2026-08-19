'use client';

import { useWatchPartyStore } from '@/stores/watchPartyStore';
import { Crown, Loader2, UserX, Lock, Unlock } from 'lucide-react';

interface WatchPartyParticipantsProps {
  onKickUser?: (socketId: string) => void;
  onToggleHostControls?: () => void;
}

export function WatchPartyParticipants({ onKickUser, onToggleHostControls }: WatchPartyParticipantsProps) {
  const participants = useWatchPartyStore((s) => s.participants);
  const isHost = useWatchPartyStore((s) => s.isHost);
  const mySocketId = useWatchPartyStore((s) => s.mySocketId);
  const hostOnlyControls = useWatchPartyStore((s) => s.hostOnlyControls);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      <div className="text-xs text-zinc-400 font-medium px-1 mb-2">
        Peserta ({participants.length}/4)
      </div>

      {/* Host-Only Controls Toggle (visible only to host) */}
      {isHost && onToggleHostControls && (
        <button
          onClick={onToggleHostControls}
          className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-colors mb-1 ${
            hostOnlyControls
              ? 'bg-amber-950/30 border-amber-800/40 hover:bg-amber-950/50'
              : 'bg-zinc-800/40 border-zinc-700/40 hover:bg-zinc-800/60'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hostOnlyControls ? (
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            )}
            <div className="min-w-0 text-left">
              <span className={`text-xs font-semibold ${hostOnlyControls ? 'text-amber-300' : 'text-zinc-300'}`}>
                Kontrol Eksklusif Host
              </span>
              <p className="text-[10px] text-zinc-500 leading-tight">
                {hostOnlyControls ? 'Hanya kamu yang bisa kontrol video' : 'Semua peserta bisa kontrol video'}
              </p>
            </div>
          </div>
          <div
            className={`w-8 h-4.5 rounded-full relative transition-colors ${
              hostOnlyControls ? 'bg-amber-500' : 'bg-zinc-600'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${
                hostOnlyControls ? 'left-4' : 'left-0.5'
              }`}
            />
          </div>
        </button>
      )}

      {/* Non-host notice when host-only controls are active */}
      {!isHost && hostOnlyControls && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/20 border border-amber-800/30 mb-1">
          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] text-amber-300/80">Host mengaktifkan kontrol eksklusif — hanya host yang bisa mengontrol video</span>
        </div>
      )}

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
