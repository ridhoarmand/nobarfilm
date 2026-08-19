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
  onToggleHostControls?: () => void;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn('[Clipboard] navigator.clipboard failed, using fallback:', e);
  }

  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    }
  } catch (err) {
    console.error('[Clipboard] Fallback execCommand failed:', err);
  }
  return false;
}

export function WatchPartyPanel({
  onSendChat,
  onSendReaction,
  onLeaveRoom,
  onKickUser,
  onToggleHostControls,
}: WatchPartyPanelProps) {
  const roomCode = useWatchPartyStore((s) => s.roomCode);
  const isHost = useWatchPartyStore((s) => s.isHost);
  const isPanelOpen = useWatchPartyStore((s) => s.isPanelOpen);
  const setPanelOpen = useWatchPartyStore((s) => s.setPanelOpen);
  const activeTab = useWatchPartyStore((s) => s.activeTab);
  const setActiveTab = useWatchPartyStore((s) => s.setActiveTab);
  const participants = useWatchPartyStore((s) => s.participants);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isPanelOpen || !roomCode) return null;

  const getFullShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('party', roomCode);
    return url.toString();
  };

  const handleCopyLink = async () => {
    const fullUrl = getFullShareUrl();
    const ok = await copyToClipboard(fullUrl);
    if (ok) {
      setCopiedLink(true);
      toast.success('Link nobar disalin ke clipboard! 🎉');
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      toast.error('Gagal menyalin link');
    }
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const fullUrl = getFullShareUrl();
    const shareData = {
      title: 'Nobar Bareng di NobarFilm 🎉',
      text: `Ayo nobar bareng di room ${roomCode}! 🍿🎬`,
      url: fullUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('[Share] Native share failed:', err);
      }
    } else {
      toast('Gunakan tombol Salin Link untuk membagikan tautan nobar', { icon: '📋' });
    }
  };

  const handleCopyCode = async () => {
    const ok = await copyToClipboard(roomCode);
    if (ok) {
      setCopiedCode(true);
      toast.success(`Kode room ${roomCode} disalin!`);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="w-full lg:w-80 xl:w-96 h-[380px] sm:h-[440px] lg:h-full flex flex-col bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 shrink-0 z-30 animate-fade-in shadow-2xl">
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
                title="Klik untuk salin kode room"
              >
                <span>{roomCode}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Copy Full Link */}
          <button
            onClick={handleCopyLink}
            title="Salin Tautan Nobar"
            className="p-1.5 sm:px-2 sm:py-1.5 text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            <span className="hidden sm:inline">{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
          </button>

          {/* Native Share */}
          <button
            onClick={handleShare}
            title="Bagikan Tautan Nobar"
            className="p-1.5 sm:px-2 sm:py-1.5 text-zinc-300 hover:text-white bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold text-red-300 hover:text-red-200"
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
            onClick={handleShare}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1 shadow-md cursor-pointer"
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
          <WatchPartyParticipants onKickUser={onKickUser} onToggleHostControls={onToggleHostControls} />
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
