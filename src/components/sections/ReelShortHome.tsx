'use client';

import { useMemo } from 'react';
import { useReelShortHomepage } from '@/hooks/useReelShort';
import { ReelShortCard } from '@/components/cards/ReelShortCard';
import { BannerCarousel } from '@/components/common/BannerCarousel';
import { DracinCardSkeleton } from '@/components/dracin/DracinCardSkeleton';
import type { ReelShortBook, ReelShortBanner } from '@/types/reelshort';

export function ReelShortHome() {
  const { data, isLoading, error } = useReelShortHomepage();

  // Get content for POPULER tab only (tab_id usually 1 or first tab)
  const { banners, books } = useMemo(() => {
    if (!data?.data?.lists) {
      return { banners: [], books: [] };
    }

    // Get the first/popular tab
    const tabs = data.data.tab_list || [];
    const popularTab = tabs.find((t) => t.tab_name === 'POPULER') || tabs[0];
    const popularTabId = popularTab?.tab_id;

    if (!popularTabId) {
      return { banners: [], books: [] };
    }

    const tabLists = data.data.lists.filter((list) => list.tab_id === popularTabId);

    let allBanners: ReelShortBanner[] = [];
    let allBooks: ReelShortBook[] = [];

    tabLists.forEach((list) => {
      if (list.banners) {
        allBanners = [...allBanners, ...list.banners];
      }
      if (list.books) {
        allBooks = [...allBooks, ...list.books];
      }
    });

    return { banners: allBanners, books: allBooks };
  }, [data]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Gagal memuat data ReelShort. Silakan coba lagi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner Carousel */}
      {banners.length > 0 && <BannerCarousel banners={banners} />}

      {/* Books Grid */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 min-[540px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 md:gap-4">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => <DracinCardSkeleton key={i} />)
          : books.filter((book) => book.book_id).map((book, index) => <ReelShortCard key={book.book_id} book={book} index={index} />)}
      </div>

      {!isLoading && books.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Tidak ada drama ditemukan</p>
        </div>
      )}
    </div>
  );
}
