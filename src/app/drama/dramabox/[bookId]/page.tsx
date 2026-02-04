'use client';

import { UnifiedErrorDisplay } from '@/components/common/UnifiedErrorDisplay';
import { useDramaDetail, useEpisodes } from '@/hooks/useDramaDetail';
import { useTrendingDramas } from '@/hooks/useDramas';
import { Play, Calendar, ChevronLeft, Star, Info, ListFilter } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { Badge } from '@/components/common/Badge';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { DramaSection } from '@/components/sections/DramaSection';
import type { DramaDetailDirect, DramaDetailResponseLegacy } from '@/types/drama';

// Helper to check if response is new format
function isDirectFormat(data: unknown): data is DramaDetailDirect {
  return data !== null && typeof data === 'object' && 'bookId' in data && 'coverWap' in data;
}

// Helper to check if response is legacy format
function isLegacyFormat(data: unknown): data is DramaDetailResponseLegacy {
  return data !== null && typeof data === 'object' && 'data' in data && (data as DramaDetailResponseLegacy).data?.book !== undefined;
}

export default function DramaBoxDetailPage() {
  const params = useParams<{ bookId: string }>();
  const bookId = params.bookId;
  const router = useRouter();
  const { data: detailData, isLoading, error } = useDramaDetail(bookId || '');
  const { data: episodes, isLoading: isLoadingEpisodes } = useEpisodes(bookId || '');
  const { data: trendingDramas, isLoading: trendingLoading } = useTrendingDramas();

  if (isLoading) {
    return <DetailSkeleton />;
  }

  // Handle both new and legacy API formats
  let book: {
    bookId: string;
    bookName: string;
    cover: string;
    chapterCount: number;
    introduction: string;
    tags?: string[];
    shelfTime?: string;
  } | null = null;

  if (isDirectFormat(detailData)) {
    // New flat format
    book = {
      bookId: detailData.bookId,
      bookName: detailData.bookName,
      cover: detailData.coverWap,
      chapterCount: detailData.chapterCount,
      introduction: detailData.introduction,
      tags: detailData.tags || detailData.tagV3s?.map((t) => t.tagName),
      shelfTime: detailData.shelfTime,
    };
  } else if (isLegacyFormat(detailData)) {
    // Legacy nested format
    book = {
      bookId: detailData.data.book.bookId,
      bookName: detailData.data.book.bookName,
      cover: detailData.data.book.cover,
      chapterCount: detailData.data.book.chapterCount,
      introduction: detailData.data.book.introduction,
      tags: detailData.data.book.tags,
      shelfTime: detailData.data.book.shelfTime,
    };
  }

  if (error || !book) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <UnifiedErrorDisplay
          title="Drama tidak ditemukan"
          message="Tidak dapat memuat detail drama. Silakan coba lagi atau kembali ke beranda."
          onRetry={() => router.push('/')}
          retryLabel="Kembali ke Beranda"
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      {/* Hero Section with Enhanced Glassmorphism */}
      <div className="relative min-h-[60vh] md:min-h-[70vh] flex items-end pb-12">
        {/* Cinematic Background */}
        <div className="absolute inset-0 overflow-hidden">
          <img src={book.cover} alt="" className="w-full h-full object-cover opacity-30 blur-2xl scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black/20" />
        </div>

        <div className="relative w-full max-w-7xl mx-auto px-4 md:px-8">
          <div className="mb-6 mt-16">
            <button
              onClick={() => router.push('/drama')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-white transition-all group shadow-2xl"
            >
              <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold">Kembali</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 md:gap-12 items-end">
            {/* Poster - More Premium Look */}
            <div className="hidden md:block">
              <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 group">
                <img src={book.cover} alt={book.bookName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Link
                    href={`/drama/watch/dramabox/${book.bookId}`}
                    className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl"
                  >
                    <Play className="w-8 h-8 text-white fill-current ml-1" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Content Details */}
            <div className="space-y-6 md:pb-4">
              <div className="space-y-4">
                {/* Mobile Poster */}
                <div className="md:hidden flex justify-center mb-6">
                  <div className="w-72 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <img src={book.cover} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black font-display tracking-tight text-white leading-[1.1] text-center md:text-left">{book.bookName}</h1>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <Badge variant="default" className="bg-primary text-white border-none px-4 py-1.5 font-bold shadow-lg">
                    DramaBox
                  </Badge>
                  <div className="flex items-center gap-1.5 text-white/60 text-sm font-medium">
                    <Play className="w-4 h-4" />
                    <span>{book.chapterCount} Episode</span>
                  </div>
                  {book.shelfTime && (
                    <div className="flex items-center gap-1.5 text-white/60 text-sm font-medium">
                      <Calendar className="w-4 h-4" />
                      <span>{book.shelfTime?.split(' ')[0]}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-4">
                <Link
                  href={`/drama/watch/dramabox/${book.bookId}`}
                  className="group relative flex-1 sm:flex-none inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-primary text-white font-black text-lg hover:shadow-[0_0_30px_rgba(229,9,20,0.4)] transition-all active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                  <Play className="w-6 h-6 fill-current" />
                  Mulai Menonton
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Content Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12">
          {/* Main Info Columns */}
          <div className="space-y-12">
            {/* Sinopsis Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-6 bg-primary rounded-full" />
                <h2 className="text-xl font-bold text-white tracking-wide uppercase">Sinopsis</h2>
              </div>
              <div className="relative group">
                <p className="text-white/70 leading-relaxed text-lg lg:text-xl font-light">{book.introduction}</p>
              </div>
            </section>

            {/* Episode List Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h2 className="text-xl font-bold text-white tracking-wide uppercase">Daftar Episode</h2>
                </div>
                <span className="text-sm text-white/40">{book.chapterCount} Total</span>
              </div>

              {isLoadingEpisodes ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {episodes?.map((ep, idx) => (
                    <Link
                      key={ep.chapterId || idx}
                      href={`/drama/watch/dramabox/${book.bookId}?ep=${idx + 1}`}
                      className="aspect-square flex flex-col items-center justify-center rounded-xl bg-white/5 border border-white/5 text-white/60 hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 group"
                    >
                      <span className="text-sm font-bold">{idx + 1}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar / Extra Info */}
          <div className="space-y-8">
            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">Informasi Tambahan</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-white/40 block mb-1">Kategori</span>
                  <div className="flex flex-wrap gap-2">
                    {book.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-zinc-800 text-xs py-1">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-white/40 block mb-1">Platform</span>
                  <span className="text-white font-medium">DramaBox Original</span>
                </div>
              </div>
            </section>

            {/* Disclaimer */}
            <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
              <p className="text-xs text-yellow-500/60 leading-relaxed italic text-center">Konten ini disediakan oleh platform pihak ketiga. NobarDrama tidak menyimpan file video di server kami.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function DetailSkeleton() {
  return (
    <main className="min-h-screen pt-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          <Skeleton className="aspect-[2/3] w-full max-w-[300px] rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-12 w-48 rounded-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
