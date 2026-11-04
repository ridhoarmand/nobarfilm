'use client';

import Link from 'next/link';
import { Heart, X } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { UnifiedMediaCardSkeleton } from '@/components/cards/UnifiedMediaCardSkeleton';
import { useWatchlist } from '@/hooks/useWatchlist';

const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

export default function FavoritPage() {
  const { watchlist, isLoaded, removeFromWatchlist } = useWatchlist();

  return (
    <>
      <Navbar />
      <main id="main-content" className="page-content min-h-screen bg-[#141414]">
        <div className="content-container py-8 sm:py-10">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Favorit Saya</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {watchlist.length > 0 ? `${watchlist.length} judul · ` : ''}Tersimpan di perangkat ini, tanpa perlu akun.
          </p>

          <div className="mt-6">
            {!isLoaded ? (
              <div className={GRID} aria-label="Memuat favorit">
                {Array.from({ length: 6 }, (_, index) => (
                  <UnifiedMediaCardSkeleton key={index} />
                ))}
              </div>
            ) : watchlist.length === 0 ? (
              <div className="flex flex-col items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:flex-row sm:items-center sm:p-6">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-600/10 text-red-400">
                  <Heart className="size-6" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <h2 className="font-semibold text-white">Belum ada judul favorit</h2>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                    Buka halaman detail film atau series, lalu tekan tombol favorit untuk menyimpannya di sini.
                  </p>
                </div>
                <Link
                  href="/search"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
                >
                  Cari tayangan
                </Link>
              </div>
            ) : (
              <ul className={GRID}>
                {watchlist.map((item, index) => (
                  <li key={item.subjectId} className="relative">
                    <UnifiedMediaCard
                      title={item.title}
                      cover={item.cover?.url || ''}
                      link={`/${item.subjectId}`}
                      topLeftBadge={{
                        text: item.subjectType === 1 ? 'Film' : 'Series',
                        color: item.subjectType === 1 ? '#E52E2E' : '#2E7DE5',
                      }}
                      index={index}
                    />
                    <button
                      type="button"
                      onClick={() => removeFromWatchlist(item.subjectId)}
                      aria-label={`Hapus ${item.title} dari favorit`}
                      title="Hapus dari favorit"
                      className="absolute right-1 top-1 z-10 flex size-11 items-center justify-center rounded-full bg-black/75 text-white hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
                    >
                      <X className="size-5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
