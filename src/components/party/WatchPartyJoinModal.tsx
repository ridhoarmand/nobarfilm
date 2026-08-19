'use client';

import { useState } from 'react';
import { useWatchPartyStore } from '@/stores/watchPartyStore';
import { PARTY_AVATAR_COLORS } from '@/types/party';
import { Users, X, Loader2, Sparkles } from 'lucide-react';

interface WatchPartyJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'join' | 'create';
  joinCode?: string;
  onJoin: (code: string, name: string) => Promise<boolean>;
  onCreate: (name: string) => Promise<string | null>;
  movieTitle?: string;
}

export function WatchPartyJoinModal({
  isOpen,
  onClose,
  mode,
  joinCode = '',
  onJoin,
  onCreate,
  movieTitle,
}: WatchPartyJoinModalProps) {
  const guestName = useWatchPartyStore((s) => s.guestName);
  const guestColor = useWatchPartyStore((s) => s.guestColor);
  const setGuestName = useWatchPartyStore((s) => s.setGuestName);

  const [name, setName] = useState(guestName || '');
  const [code, setCode] = useState(joinCode || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Masukkan nama/panggilanmu');
      return;
    }

    setGuestName(trimmedName);
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'create') {
        const createdCode = await onCreate(trimmedName);
        if (createdCode) {
          onClose();
        } else {
          setError('Gagal membuat room. Coba lagi.');
        }
      } else {
        const targetCode = (code || joinCode).trim().toUpperCase();
        if (!targetCode) {
          setError('Masukkan kode room');
          setIsLoading(false);
          return;
        }
        const ok = await onJoin(targetCode, trimmedName);
        if (ok) {
          onClose();
        } else {
          setError('Gagal bergabung. Pastikan kode benar atau room belum penuh.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {mode === 'create' ? 'Mulai Nonton Bareng' : 'Gabung Nobar'}
              </h3>
              <p className="text-xs text-zinc-400">
                {mode === 'create' ? 'Buat room untuk nobar bersama teman' : 'Tonton film ini serentak secara real-time'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {movieTitle && (
            <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/40">
              <span className="text-xs text-zinc-400 block mb-0.5">Film:</span>
              <span className="text-sm font-semibold text-white line-clamp-1">{movieTitle}</span>
            </div>
          )}

          {mode === 'join' && !joinCode && (
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Kode Room
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Contoh: ABC123"
                maxLength={6}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-wider text-white uppercase placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
          )}

          {mode === 'join' && joinCode && (
            <div className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400">Kode Room:</span>
              <span className="text-sm font-mono font-bold text-red-400 tracking-wider">
                {joinCode}
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1.5">
              Nama / Panggilanmu
            </label>
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white text-sm font-bold shadow"
                style={{ backgroundColor: guestColor }}
              >
                {(name.trim() || '?')[0].toUpperCase()}
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama..."
                maxLength={20}
                autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg p-2.5">
              {error}
            </p>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-300 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menghubungkan...</span>
                </>
              ) : mode === 'create' ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Buat Room</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>Gabung Nobar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
