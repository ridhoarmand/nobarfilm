'use client';

import { useMemo } from 'react';
import { useReelShortHomepage } from '@/hooks/useReelShort';
import { BannerCarousel } from '@/components/common/BannerCarousel';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { UnifiedErrorDisplay } from '@/components/common/UnifiedErrorDisplay';
import { InfiniteReelShortSection } from '@/components/sections/InfiniteReelShortSection';
import { HorizontalMediaSlider } from '@/components/shared/HorizontalMediaSlider';
import type { ReelShortBook, ReelShortBanner } from '@/types/reelshort';

export function ReelShortSection() {
  const { data, isLoading, error, refetch } = useReelShortHomepage();

  // Group content by sections
  const sections = useMemo(() => {
    if (!data?.data?.lists) return { banners: [], bookGroups: [] };

    const tabs = data.data.tab_list || [];
    const popularTab = tabs.find((t) => t.tab_name === 'POPULER') || tabs[0];

    if (!popularTab) return { banners: [], bookGroups: [] };

    const tabLists = data.data.lists.filter((list) => list.tab_id === popularTab.tab_id);

    const banners: ReelShortBanner[] = [];
    const bookGroups: { title: string; books: ReelShortBook[] }[] = [];

    tabLists.forEach((list, index) => {
      if (list.banners && list.banners.length > 0) {
        banners.push(...list.banners);
      }
      if (list.books && list.books.length > 0) {
        const sectionNames = ['Populer', 'Terbaru', 'Trending', 'Untuk Kamu'];
        const title = sectionNames[index] || `Section ${index + 1}`;
        bookGroups.push({ title, books: list.books });
      }
    });

    return { banners, bookGroups };
  }, [data]);

  if (error) {
    return <UnifiedErrorDisplay title="Gagal Memuat ReelShort" message="Terjadi kesalahan saat mengambil data dari server." onRetry={() => refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="aspect-[21/9] rounded-2xl bg-muted/50 animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SectionSkeleton key={i} />
        ))}
      </div>
    );
  }

  const { banners, bookGroups } = sections;

  return (
    <div className="space-y-8">
      {/* Banner Carousel */}
      {banners.length > 0 && <BannerCarousel banners={banners} />}

      {/* Book Sections - Slider Layout */}
      {bookGroups.map((group, index) => (
        <HorizontalMediaSlider
          key={index}
          title={<h2 className="font-display font-bold text-xl md:text-2xl text-foreground">{group.title}</h2>}
        >
          {group.books
            .filter((book) => book.book_id && book.book_pic)
            .slice(0, 18)
            .map((book, index) => (
              <div key={book.book_id} className="flex-none w-36 sm:w-40 md:w-48 lg:w-52 snap-start">
                <UnifiedMediaCard
                  index={index}
                  title={book.book_title}
                  cover={book.book_pic}
                  link={`/drama/reelshort/${book.book_id}`}
                  episodes={book.chapter_count}
                  topLeftBadge={
                    book.book_mark?.text
                      ? {
                          text: book.book_mark.text,
                          color: book.book_mark.color || '#E52E2E',
                          textColor: book.book_mark.text_color,
                        }
                      : null
                  }
                  topRightBadge={
                    book.rank_level
                      ? {
                          text: book.rank_level,
                          isTransparent: true,
                        }
                      : null
                  }
                />
              </div>
            ))}
        </HorizontalMediaSlider>
      ))}

      {/* Infinite Scroll Section */}
      <InfiniteReelShortSection title="Lainnya" />
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div>
      <div className="h-6 w-32 bg-muted/50 rounded animate-pulse mb-4" />
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-none w-36 sm:w-40 md:w-48 lg:w-52 snap-start">
            <div className="aspect-[2/3] rounded-lg bg-muted/50 animate-pulse" />
            <div className="mt-1.5 h-3 bg-muted/50 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
