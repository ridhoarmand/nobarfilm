'use client';

import { useWatchPartyStore } from '@/stores/watchPartyStore';
import { PARTY_EMOJIS } from '@/types/party';
import { WatchPartyChat } from './WatchPartyChat';
import { WatchPartyParticipants } from './WatchPartyParticipants';
import { MessageSquare, Users, Copy, Check, LogOut, X, Share2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface WatchPartyPanelProps {
  onSendChat: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  onLeaveRoom: () => void;
  onKickUser?: (socketId: string) => void;
}

export function WatchPartyPanel({
  onSendChat,
  onSendReaction,
  onLeaveRoom,
  onKickUser,
}: WatchPartyPanelProps) {
  const roomCode = useWatchPartyStore((s) => s.roomCode);
  const isHost = useWatchPartyStore((s) => s.isHost);
  const isPanelOpen = useWatchPartyStore((s) => s.isPanelOpen);
  const setPanelOpen = useWatchPartyStore((s) => s.setPanelOpen);
  const activeTab = useWatchPartyStore((s) => s.activeTab);
  const setActiveTab = useWatchPartyStore((s) => s.setActiveTab);
  const participants = useWatchPartyStore((s) => s.participants);

  const [copied, setCopied] = useState(false);

  if (!isPanelOpen || !roomCode) return null;

  const handleShareLink = async () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('party', roomCode);
    const fullUrl = url.toString();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nobar Bareng di NobarFilm 🎉',
          text: `Ayo nobar bareng di room ${roomCode}!`,
          url: fullUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success('Link nobar disalin ke clipboard! 🎉');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success(`Kode room ${roomCode} disalin!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full lg:w-80 h-[50vh] lg:h-full flex flex-col bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 shrink-0 z-30 animate-fade-in shadow-2xl">
      {/* Room Header */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-md flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-400 font-medium">Room:</span>
              <button
                onClick={handleCopyCode}
                className="text-xs font-mono font-bold text-white tracking-wider bg-zinc-800 hover:bg-zinc-700 px-1.5 py-0.5 rounded border border-zinc-700 transition-colors flex items-center gap-1"
                title="Klik untuk salin kode"
              >
                <span>{roomCode}</span>
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleShareLink}
            title="Bagikan Tautan Nobar"
            className="p-1.5 text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
          >
            <Share2 className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Bagikan</span>
          </button>

          <button
            onClick={onLeaveRoom}
            title={isHost ? 'Tutup Room' : 'Keluar Room'}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setPanelOpen(false)}
            title="Sembunyikan Panel Chat"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Invite Friends Banner (When waiting for others) */}
      {participants.length === 1 && (
        <div className="mx-3 mt-2.5 p-2.5 bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-900 border border-red-900/40 rounded-xl flex items-center justify-between gap-2 shadow-inner animate-fade-in">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Menunggu teman...</span>
            </p>
            <p className="text-[11px] text-zinc-400 truncate">Bagikan link ke teman untuk nobar</p>
          </div>
          <button
            onClick={handleShareLink}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1 shadow-md"
          >
            <Share2 className="w-3 h-3" />
            <span>Undang</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/50 mt-1">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 px-3 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-red-500 text-white font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          className={`flex-1 py-2 px-3 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'participants'
              ? 'border-red-500 text-white font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Peserta ({participants.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'chat' ? (
          <WatchPartyChat onSendChat={onSendChat} />
        ) : (
          <WatchPartyParticipants onKickUser={onKickUser} />
        )}
      </div>

      {/* Floating Reaction Bar (Quick Spam) */}
      <div className="p-2 border-t border-zinc-800 bg-zinc-950/80">
        <div className="flex items-center justify-between gap-1 overflow-x-auto py-0.5 scrollbar-none">
          {PARTY_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-lg sm:text-xl transition-all transform active:scale-125 hover:scale-110 select-none"
              title={`Kirim ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
