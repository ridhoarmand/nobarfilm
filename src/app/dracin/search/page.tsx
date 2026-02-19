/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Search } from 'lucide-react';
import { PlatformSelector } from '@/components/features/PlatformSelector';
import { DracinGrid } from '@/components/dracin/DracinGrid';
import { DracinCard } from '@/components/dracin/DracinCard';
import { DracinCardSkeleton } from '@/components/dracin/DracinCardSkeleton';
import { UnifiedMediaCard } from '@/components/cards/UnifiedMediaCard';
import { NetShortCard } from '@/components/cards/NetShortCard';
import { ReelShortCard } from '@/components/cards/ReelShortCard';
import { useSearchDramas } from '@/hooks/useDramas';
import { useMeloloSearch } from '@/hooks/useMelolo';
import { useFreeReelsSearch } from '@/hooks/useFreeReels';
import { useFlickReelsSearch } from '@/hooks/useFlickReels';
import { useNetShortSearch } from '@/hooks/useNetShort';
import { useReelShortSearch } from '@/hooks/useReelShort';
import { usePlatform, type Platform } from '@/hooks/usePlatform';

function DramaSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentPlatform, setPlatform, getPlatformInfo } = usePlatform();
  const query = searchParams.get('q') || '';
  const platformParam = (searchParams.get('platform') || '').toLowerCase();
  const [searchQuery, setSearchQuery] = useState(query);

  const normalizedPlatform = useMemo<Platform | null>(() => {
    const allowed: Platform[] = ['dramabox', 'reelshort', 'netshort', 'melolo', 'flickreels', 'freereels'];
    return allowed.includes(platformParam as Platform) ? (platformParam as Platform) : null;
  }, [platformParam]);

  const activePlatform = normalizedPlatform || currentPlatform;
  const platformInfo = getPlatformInfo(activePlatform);

  useEffect(() => {
    if (normalizedPlatform && normalizedPlatform !== currentPlatform) {
      setPlatform(normalizedPlatform);
    }
  }, [normalizedPlatform, currentPlatform, setPlatform]);

  const dramaboxQuery = useSearchDramas(activePlatform === 'dramabox' ? query : '');
  const meloloQuery = useMeloloSearch(activePlatform === 'melolo' ? query : '');
  const freereelsQuery = useFreeReelsSearch(activePlatform === 'freereels' ? query : '');
  const flickreelsQuery = useFlickReelsSearch(activePlatform === 'flickreels' ? query : '');
  const netshortQuery = useNetShortSearch(activePlatform === 'netshort' ? query : '');
  const reelshortQuery = useReelShortSearch(activePlatform === 'reelshort' ? query : '');

  const { isLoading, error, items } = useMemo(() => {
    switch (activePlatform) {
      case 'dramabox':
        return { isLoading: dramaboxQuery.isLoading, error: dramaboxQuery.error, items: dramaboxQuery.data || [] };
      case 'melolo':
        return {
          isLoading: meloloQuery.isLoading,
          error: meloloQuery.error,
          items: meloloQuery.data?.data?.search_data?.[0]?.books || [],
        };
      case 'freereels':
        return { isLoading: freereelsQuery.isLoading, error: freereelsQuery.error, items: freereelsQuery.data || [] };
      case 'flickreels':
        return { isLoading: flickreelsQuery.isLoading, error: flickreelsQuery.error, items: flickreelsQuery.data?.data || [] };
      case 'netshort':
        return { isLoading: netshortQuery.isLoading, error: netshortQuery.error, items: netshortQuery.data?.data || [] };
      case 'reelshort':
        return { isLoading: reelshortQuery.isLoading, error: reelshortQuery.error, items: reelshortQuery.data?.data || [] };
      default:
        return { isLoading: false, error: null, items: [] };
    }
  }, [
    activePlatform,
    dramaboxQuery.data,
    dramaboxQuery.isLoading,
    dramaboxQuery.error,
    meloloQuery.data,
    meloloQuery.isLoading,
    meloloQuery.error,
    freereelsQuery.data,
    freereelsQuery.isLoading,
    freereelsQuery.error,
    flickreelsQuery.data,
    flickreelsQuery.isLoading,
    flickreelsQuery.error,
    netshortQuery.data,
    netshortQuery.isLoading,
    netshortQuery.error,
    reelshortQuery.data,
    reelshortQuery.isLoading,
    reelshortQuery.error,
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/dracin/search?platform=${encodeURIComponent(activePlatform)}&q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen pt-24 px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <PlatformSelector />
          </div>

          <div className="mb-8">
            <form onSubmit={handleSearch} className="max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${platformInfo.name} dramas...`}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-full px-6 py-4 pl-14 text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition">
                  Search
                </button>
              </div>
            </form>
          </div>

          {query && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">Search Results</h1>
              <p className="text-gray-400">
                Results for: <span className="text-red-500 font-semibold">{query}</span>
              </p>
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {[...Array(12)].map((_, i) => (
                <DracinCardSkeleton key={i} />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 mb-6">
                <Search className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Search Error</h2>
              <p className="text-gray-400 mb-6">{error.message}</p>
              <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition">
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && query && (
            <>
              {items.length === 0 ? (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 mb-6">
                    <Search className="w-10 h-10 text-gray-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">No Results Found</h2>
                  <p className="text-gray-400">Try searching with different keywords</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                  {activePlatform === 'dramabox' && items.map((drama: any) => <DracinCard key={drama.bookId} drama={drama} />)}

                  {activePlatform === 'melolo' &&
                    items.map((item: any) => (
                      <UnifiedMediaCard key={item.book_id} title={item.book_name} cover={item.thumb_url} link={`/dracin/melolo/${item.book_id}`} episodes={item.serial_count || 0} />
                    ))}

                  {activePlatform === 'freereels' &&
                    items.map((item: any) => (
                      <UnifiedMediaCard
                        key={item.key || item.id}
                        title={item.title || item.name}
                        cover={item.cover || item.cover_image || item.cover_image_url || ''}
                        link={`/dracin/freereels/${item.key || item.id}`}
                        episodes={item.episode_count || item.episodeCount || 0}
                      />
                    ))}

                  {activePlatform === 'flickreels' &&
                    items.map((item: any) => (
                      <UnifiedMediaCard
                        key={item.id || item.playlet_id}
                        title={item.name || item.title}
                        cover={item.cover_image_url || item.cover}
                        link={`/dracin/flickreels/${item.id || item.playlet_id}`}
                        episodes={item.episode_count || item.upload_num || 0}
                      />
                    ))}

                  {activePlatform === 'netshort' && items.map((drama: any) => <NetShortCard key={drama.shortPlayId} drama={drama} />)}

                  {activePlatform === 'reelshort' && items.map((book: any) => <ReelShortCard key={book.book_id} book={book} />)}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function DramaSearchPage() {
  return (
    <Suspense
      fallback={
        <>
          <Navbar />
          <main className="bg-black min-h-screen pt-24 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse">
                <div className="h-12 bg-zinc-800 rounded w-48 mb-8"></div>
                <div className="h-6 bg-zinc-800 rounded w-64"></div>
              </div>
            </div>
          </main>
        </>
      }
    >
      <DramaSearchContent />
    </Suspense>
  );
}
