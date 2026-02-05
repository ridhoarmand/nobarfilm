'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Play, ChevronLeft, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { Badge } from '@/components/common/Badge';
import { UnifiedErrorDisplay } from '@/components/common/UnifiedErrorDisplay';
import { DramaSection } from '@/components/sections/DramaSection';
import { fetchJson } from '@/lib/fetcher';
import { decryptData } from '@/lib/crypto';
import type { Drama, DramaDetailDirect, DramaDetailResponseLegacy, Episode } from '@/types/drama';

type PlatformKey = 'dramabox' | 'melolo' | 'freereels' | 'flickreels' | 'netshort' | 'reelshort';

function isDirectFormat(data: unknown): data is DramaDetailDirect {
  return data !== null && typeof data === 'object' && 'bookId' in data && 'coverWap' in data;
}

function isLegacyFormat(data: unknown): data is DramaDetailResponseLegacy {
  return data !== null && typeof data === 'object' && 'data' in data && (data as DramaDetailResponseLegacy).data?.book !== undefined;
}

async function fetchDramaDetail(bookId: string): Promise<any> {
  const response = await fetch(`/api/dramabox/detail/${bookId}`);
  if (!response.ok) throw new Error('Failed to fetch drama detail');
  const json = await response.json();
  if (json.data && typeof json.data === 'string') return decryptData(json.data);
  return json;
}

async function fetchDramaEpisodes(bookId: string): Promise<Episode[]> {
  const response = await fetch(`/api/dramabox/allepisode/${bookId}`);
  if (!response.ok) throw new Error('Failed to fetch episodes');
  const json = await response.json();
  if (json.data && typeof json.data === 'string') return decryptData(json.data);
  return json;
}

async function fetchReelShortDetail(bookId: string) {
  const response = await fetch(`/api/reelshort/detail?bookId=${bookId}`);
  if (!response.ok) throw new Error('Failed to fetch detail');
  const json = await response.json();
  if (json.data && typeof json.data === 'string') return decryptData(json.data);
  return json;
}

export default function DramaPlatformDetailPage() {
  const params = useParams<{ platform: string; id: string }>();
  const router = useRouter();
  const platform = (params.platform || '').toLowerCase() as PlatformKey;
  const id = params.id || '';

  const isDramabox = platform === 'dramabox';
  const isMelolo = platform === 'melolo';
  const isFreeReels = platform === 'freereels';
  const isFlickReels = platform === 'flickreels';
  const isNetShort = platform === 'netshort';
  const isReelShort = platform === 'reelshort';

  const dramaboxDetailQuery = useQuery({
    queryKey: ['drama', 'detail', id],
    queryFn: () => fetchDramaDetail(id),
    enabled: isDramabox && !!id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  const dramaboxEpisodesQuery = useQuery({
    queryKey: ['drama', 'episodes', id],
    queryFn: () => fetchDramaEpisodes(id),
    enabled: isDramabox && !!id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  const meloloDetailQuery = useQuery<any>({
    queryKey: ['melolo', 'detail', id],
    queryFn: () => fetchJson(`/api/melolo/detail?bookId=${id}`),
    enabled: isMelolo && !!id,
    staleTime: 5 * 60 * 1000,
  });

  const freereelsDetailQuery = useQuery<any>({
    queryKey: ['freereels', 'detail', id],
    queryFn: () => fetchJson<any>(`/api/freereels/detail?id=${id}`),
    select: (response) => {
      const info = response.data?.info;
      if (!info) return null;
      const episodes = info.episode_list?.map((ep: any, index: number) => {
        const indoSub = ep.subtitle_list?.find((sub: any) => sub.language === 'id-ID');
        return {
          id: ep.id,
          name: ep.name,
          index,
          videoUrl: ep.video_url || ep.external_audio_h264_m3u8 || '',
          m3u8_url: ep.m3u8_url || '',
          external_audio_h264_m3u8: ep.external_audio_h264_m3u8 || '',
          external_audio_h265_m3u8: ep.external_audio_h265_m3u8 || '',
          cover: ep.cover || info.cover,
          subtitleUrl: indoSub?.subtitle || indoSub?.vtt || '',
          originalAudioLanguage: ep.original_audio_language || '',
        };
      }) || [];

      return {
        data: {
          ...info,
          key: info.id,
          title: info.name,
          follow_count: info.follow_count || 0,
          episodes,
        },
      };
    },
    enabled: isFreeReels && !!id,
    staleTime: 5 * 60 * 1000,
  });

  const flickreelsDetailQuery = useQuery<any>({
    queryKey: ['flickreels', 'detail', id],
    queryFn: () => fetchJson(`/api/flickreels/detail?id=${id}`),
    enabled: isFlickReels && !!id,
    staleTime: 10 * 1000,
    gcTime: 30 * 1000,
  });

  const netshortDetailQuery = useQuery<any>({
    queryKey: ['netshort', 'detail', id],
    queryFn: () => fetchJson(`/api/netshort/detail?shortPlayId=${id}`),
    enabled: isNetShort && !!id,
    staleTime: 5 * 60 * 1000,
  });

  const reelshortDetailQuery = useQuery<any>({
    queryKey: ['reelshort', 'detail', id],
    queryFn: () => fetchReelShortDetail(id),
    enabled: isReelShort && !!id,
  });

  const dramaboxTrendingQuery = useQuery({
    queryKey: ['dramas', 'trending'],
    queryFn: () => fetchJson<Drama[]>(`/api/dramabox/trending`),
    enabled: isDramabox,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  const meloloTrendingQuery = useQuery({
    queryKey: ['melolo', 'trending'],
    queryFn: () => fetchJson(`/api/melolo/trending`),
    enabled: isMelolo,
    staleTime: 5 * 60 * 1000,
  });

  const freereelsTrendingQuery = useQuery({
    queryKey: ['freereels', 'home'],
    queryFn: () => fetchJson(`/api/freereels/home`),
    enabled: isFreeReels,
    staleTime: 5 * 60 * 1000,
  });

  const flickreelsTrendingQuery = useQuery({
    queryKey: ['flickreels', 'latest'],
    queryFn: () => fetchJson(`/api/flickreels/latest`),
    enabled: isFlickReels,
    staleTime: 5 * 60 * 1000,
  });

  const netshortTrendingQuery = useQuery({
    queryKey: ['netshort', 'foryou', 1],
    queryFn: () => fetchJson(`/api/netshort/foryou?page=1`),
    enabled: isNetShort,
    staleTime: 2 * 60 * 1000,
  });

  const reelshortTrendingQuery = useQuery({
    queryKey: ['reelshort', 'homepage'],
    queryFn: () => fetchJson(`/api/reelshort/homepage`),
    enabled: isReelShort,
    staleTime: 1000 * 60 * 5,
  });

  const { detail, episodes, isLoading, isEpisodesLoading, error } = useMemo(() => {
    if (isDramabox) {
      let book: {
        bookId: string;
        bookName: string;
        cover: string;
        chapterCount: number;
        introduction: string;
        tags?: string[];
        shelfTime?: string;
      } | null = null;

      const detailData = dramaboxDetailQuery.data;
      if (isDirectFormat(detailData)) {
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

      return {
        detail: book
          ? {
              title: book.bookName,
              cover: book.cover,
              description: book.introduction,
              totalEpisodes: book.chapterCount,
              tags: book.tags,
              platformLabel: 'DramaBox',
              shelfTime: book.shelfTime,
            }
          : null,
        episodes: dramaboxEpisodesQuery.data || [],
        isLoading: dramaboxDetailQuery.isLoading,
        isEpisodesLoading: dramaboxEpisodesQuery.isLoading,
        error: dramaboxDetailQuery.error,
      };
    }

    if (isMelolo) {
      const drama = meloloDetailQuery.data?.data?.video_data;
      return {
        detail: drama
          ? {
              title: drama.series_title,
              cover: drama.series_cover,
              description: drama.series_intro,
              totalEpisodes: drama.episode_cnt,
              platformLabel: 'Melolo',
              coverOverride: drama.series_cover.includes('.heic')
                ? `https://wsrv.nl/?url=${encodeURIComponent(drama.series_cover)}&output=jpg`
                : drama.series_cover,
            }
          : null,
        episodes: drama?.video_list || [],
        isLoading: meloloDetailQuery.isLoading,
        isEpisodesLoading: false,
        error: meloloDetailQuery.error,
      };
    }

    if (isFreeReels) {
      const drama = freereelsDetailQuery.data?.data;
      return {
        detail: drama
          ? {
              title: drama.title,
              cover: drama.cover,
              description: drama.desc || 'Tidak ada deskripsi tersedia.',
              totalEpisodes: drama.episode_count || 0,
              tags: drama.content_tags || [],
              platformLabel: 'FreeReels',
            }
          : null,
        episodes: drama?.episodes || [],
        isLoading: freereelsDetailQuery.isLoading,
        isEpisodesLoading: false,
        error: freereelsDetailQuery.error,
      };
    }

    if (isFlickReels) {
      const data = flickreelsDetailQuery.data as any;
      const drama = data?.drama;
      const eps = data?.episodes || [];
      return {
        detail: drama
          ? {
              title: drama.title,
              cover: drama.cover,
              description: drama.description || 'Tidak ada deskripsi tersedia.',
              totalEpisodes: eps.length || drama.chapterCount || 0,
              tags: drama.labels || [],
              platformLabel: 'FlickReels',
            }
          : null,
        episodes: eps,
        isLoading: flickreelsDetailQuery.isLoading,
        isEpisodesLoading: false,
        error: flickreelsDetailQuery.error,
      };
    }

    if (isNetShort) {
      const data = netshortDetailQuery.data as any;
      return {
        detail: data?.success
          ? {
              title: data.title,
              cover: data.cover,
              description: data.description || 'Tidak ada deskripsi tersedia.',
              totalEpisodes: data.totalEpisodes || 0,
              tags: data.labels || [],
              platformLabel: 'NetShort',
              isFinished: data.isFinish,
            }
          : null,
        episodes: [],
        isLoading: netshortDetailQuery.isLoading,
        isEpisodesLoading: false,
        error: netshortDetailQuery.error,
      };
    }

    if (isReelShort) {
      const data = reelshortDetailQuery.data as any;
      return {
        detail: data?.success
          ? {
              title: data.title,
              cover: data.cover,
              description: data.description || 'Tidak ada deskripsi tersedia.',
              totalEpisodes: data.totalEpisodes || 0,
              platformLabel: 'ReelShort',
            }
          : null,
        episodes: [],
        isLoading: reelshortDetailQuery.isLoading,
        isEpisodesLoading: false,
        error: reelshortDetailQuery.error,
      };
    }

    return { detail: null, episodes: [], isLoading: false, isEpisodesLoading: false, error: null };
  }, [
    isDramabox,
    isMelolo,
    isFreeReels,
    isFlickReels,
    isNetShort,
    isReelShort,
    dramaboxDetailQuery.data,
    dramaboxDetailQuery.isLoading,
    dramaboxDetailQuery.error,
    dramaboxEpisodesQuery.data,
    dramaboxEpisodesQuery.isLoading,
    meloloDetailQuery.data,
    meloloDetailQuery.isLoading,
    meloloDetailQuery.error,
    freereelsDetailQuery.data,
    freereelsDetailQuery.isLoading,
    freereelsDetailQuery.error,
    flickreelsDetailQuery.data,
    flickreelsDetailQuery.isLoading,
    flickreelsDetailQuery.error,
    netshortDetailQuery.data,
    netshortDetailQuery.isLoading,
    netshortDetailQuery.error,
    reelshortDetailQuery.data,
    reelshortDetailQuery.isLoading,
    reelshortDetailQuery.error,
  ]);

  const trendingDramas: Drama[] = useMemo(() => {
    if (isDramabox) return (dramaboxTrendingQuery.data as Drama[]) || [];
    if (isMelolo) {
      const data = meloloTrendingQuery.data as any;
      if (!data?.books) return [];
      return data.books.map((book: any) => ({
        bookId: book.book_id,
        bookName: book.book_name,
        coverWap: book.thumb_url,
        introduction: book.abstract || '',
        chapterCount: book.serial_count || 0,
        tags: [],
        shelfTime: '',
        inLibrary: false,
      }));
    }
    if (isFreeReels) {
      const data = freereelsTrendingQuery.data as any;
      const books = data?.data?.items?.slice(0, 3).flatMap((mod: any) => mod.items || []) || [];
      const uniqueKeys = Array.from(new Set(books.map((b: any) => b.key)));
      return uniqueKeys.slice(0, 16).map((key) => {
        const b = books.find((x: any) => x.key === key)!;
        return {
          bookId: String(b.key),
          bookName: b.title,
          coverWap: b.cover,
          introduction: b.desc || '',
          chapterCount: b.episode_count || 0,
          tags: b.content_tags || [],
          shelfTime: '',
          inLibrary: false,
        };
      });
    }
    if (isFlickReels) {
      const data = flickreelsTrendingQuery.data as any;
      if (!data?.data) return [];
      const books = data.data.flatMap((section: any) => section.list || []);
      return books.slice(0, 16).map((b: any) => ({
        bookId: String(b.playlet_id),
        bookName: b.title,
        coverWap: b.cover,
        introduction: b.introduce || '',
        chapterCount: parseInt(b.upload_num || '0'),
        tags: b.playlet_tag_name || [],
        shelfTime: '',
        inLibrary: false,
      }));
    }
    if (isNetShort) {
      const data = netshortTrendingQuery.data as any;
      if (!data?.data) return [];
      return data.data.slice(0, 16).map((drama: any) => ({
        bookId: drama.shortPlayId,
        bookName: drama.title,
        coverWap: drama.cover,
        introduction: '',
        chapterCount: drama.totalEpisodes || 0,
        tags: drama.labels || [],
        shelfTime: '',
        inLibrary: false,
      }));
    }
    if (isReelShort) {
      const data = reelshortTrendingQuery.data as any;
      const books = data?.data?.lists?.find((l: any) => l.books && l.books.length > 0)?.books || [];
      return books.slice(0, 16).map((book: any) => ({
        bookId: book.book_id,
        bookName: book.book_title,
        coverWap: book.book_pic,
        introduction: book.special_desc || '',
        chapterCount: book.chapter_count,
        tags: book.theme || [],
        shelfTime: '',
        inLibrary: false,
      }));
    }
    return [];
  }, [
    isDramabox,
    isMelolo,
    isFreeReels,
    isFlickReels,
    isNetShort,
    isReelShort,
    dramaboxTrendingQuery.data,
    meloloTrendingQuery.data,
    freereelsTrendingQuery.data,
    flickreelsTrendingQuery.data,
    netshortTrendingQuery.data,
    reelshortTrendingQuery.data,
  ]);

  const trendingLoading =
    (isDramabox && dramaboxTrendingQuery.isLoading) ||
    (isMelolo && meloloTrendingQuery.isLoading) ||
    (isFreeReels && freereelsTrendingQuery.isLoading) ||
    (isFlickReels && flickreelsTrendingQuery.isLoading) ||
    (isNetShort && netshortTrendingQuery.isLoading) ||
    (isReelShort && reelshortTrendingQuery.isLoading) ||
    false;

  const isPlatformValid = isDramabox || isMelolo || isFreeReels || isFlickReels || isNetShort || isReelShort;

  const buildWatchHref = (episodeIndex: number, episodeId?: string, isPrimary?: boolean) => {
    switch (platform) {
      case 'dramabox':
        return isPrimary ? `/drama/watch/dramabox/${id}` : `/drama/watch/dramabox/${id}?ep=${episodeIndex}`;
      case 'melolo':
        return episodeId ? `/drama/watch/melolo/${id}/${episodeId}?ep=${episodeIndex}` : '#';
      case 'freereels':
        return `/drama/watch/freereels/${id}?ep=${episodeIndex}`;
      case 'flickreels':
        return episodeId ? `/drama/watch/flickreels/${id}/${episodeId}?ep=${episodeIndex}` : '#';
      case 'netshort':
        return `/drama/watch/netshort/${id}?ep=${episodeIndex}`;
      case 'reelshort':
        return isPrimary ? `/drama/watch/reelshort/${id}` : `/drama/watch/reelshort/${id}?ep=${episodeIndex}`;
      default:
        return '#';
    }
  };

  if (!isPlatformValid) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <UnifiedErrorDisplay title="Platform tidak ditemukan" message="Platform drama tidak dikenali." onRetry={() => router.push('/drama')} retryLabel="Kembali" />
      </div>
    );
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <UnifiedErrorDisplay title="Drama tidak ditemukan" message="Tidak dapat memuat detail drama. Silakan coba lagi." onRetry={() => router.push('/')} retryLabel="Kembali ke Beranda" />
      </div>
    );
  }

  const coverUrl = detail.coverOverride || detail.cover;
  const episodeList = isMelolo || isFlickReels ? (episodes as any[]) : Array.from({ length: detail.totalEpisodes || 0 }, (_, i) => ({ index: i + 1 }));
  const firstEpisodeId = isMelolo
    ? (episodes as any[])?.[0]?.vid
    : isFlickReels
      ? (episodes as any[])?.[0]?.id
      : undefined;

  const canPlayPrimary = isMelolo || isFlickReels ? !!firstEpisodeId : true;

  return (
    <main className="min-h-screen bg-black">
      <div className="relative min-h-[60vh] md:min-h-[70vh] flex items-end pb-12">
        <div className="absolute inset-0 overflow-hidden">
          <img src={coverUrl} alt="" className="w-full h-full object-cover opacity-30 blur-2xl scale-110" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black/20" />
        </div>

        <div className="relative w-full max-w-7xl mx-auto px-4 md:px-8">
          <div className="mb-6 mt-16">
            <button
              onClick={() => router.push('/drama')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-white transition-all group shadow-2xl"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold">Kembali</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 md:gap-12 items-end">
            <div className="hidden md:block">
              <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 group">
                <img src={coverUrl} alt={detail.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {canPlayPrimary && (
                    <Link
                      href={buildWatchHref(1, firstEpisodeId, true)}
                      className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl"
                    >
                      <Play className="w-8 h-8 text-white fill-current ml-1" />
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6 md:pb-4">
              <div className="space-y-4">
                <div className="md:hidden flex justify-center mb-6">
                  <div className="w-72 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <img src={coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black font-display tracking-tight text-white leading-[1.1] text-center md:text-left">{detail.title}</h1>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <Badge variant="default" className="bg-primary text-white border-none px-4 py-1.5 font-bold shadow-lg">
                    {detail.platformLabel}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-white/60 text-sm font-medium">
                    <Play className="w-4 h-4" />
                    <span>{detail.totalEpisodes} Episode</span>
                  </div>
                  {detail.shelfTime && (
                    <div className="flex items-center gap-1.5 text-white/60 text-sm font-medium">
                      <Calendar className="w-4 h-4" />
                      <span>{detail.shelfTime?.split(' ')[0]}</span>
                    </div>
                  )}
                  {detail.isFinished && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-green-500/20">
                      Tamat
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                {canPlayPrimary && (
                  <Link
                    href={buildWatchHref(1, firstEpisodeId, true)}
                    className="group relative inline-flex w-fit items-center justify-center gap-2 px-3 py-2 sm:px-6 sm:py-3 rounded-2xl bg-primary text-white font-medium text-sm sm:text-base hover:shadow-[0_0_30px_rgba(229,9,20,0.4)] transition-all active:scale-95 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                    <Play className="w-6 h-6 fill-current" />
                    Mulai Menonton
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12">
          <div className="space-y-12">
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-6 bg-primary rounded-full" />
                <h2 className="text-xl font-bold text-white tracking-wide uppercase">Sinopsis</h2>
              </div>
              <p className="text-white/70 leading-relaxed text-lg lg:text-xl font-light">{detail.description}</p>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h2 className="text-xl font-bold text-white tracking-wide uppercase">Daftar Episode</h2>
                </div>
                <span className="text-sm text-white/40">{detail.totalEpisodes} Total</span>
              </div>

              {isEpisodesLoading ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {episodeList.map((ep: any, idx: number) => {
                    const episodeIndex = isMelolo || isFlickReels ? idx + 1 : ep.index || idx + 1;
                    const episodeId = isMelolo ? ep.vid : isFlickReels ? ep.id : undefined;
                    return (
                      <Link
                        key={episodeId || episodeIndex}
                        href={buildWatchHref(episodeIndex, episodeId)}
                        className="aspect-square flex flex-col items-center justify-center rounded-xl bg-white/5 border border-white/5 text-white/60 hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 group"
                      >
                        <span className="text-sm font-bold">{episodeIndex}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">Informasi Tambahan</h3>
              <div className="space-y-4">
                {detail.tags && detail.tags.length > 0 && (
                  <div>
                    <span className="text-sm text-white/40 block mb-1">Tag</span>
                    <div className="flex flex-wrap gap-2">
                      {detail.tags.map((tag: any, idx: number) => (
                        <Badge key={`${tag}-${idx}`} variant="secondary" className="bg-zinc-800 text-xs py-1">
                          {tag?.tag_name || tag?.name || tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-sm text-white/40 block mb-1">Platform</span>
                  <span className="text-white font-medium">{detail.platformLabel} Original</span>
                </div>
              </div>
            </section>

            <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
              <p className="text-xs text-yellow-500/60 leading-relaxed italic text-center">Konten ini disediakan oleh platform pihak ketiga. NobarDrama tidak menyimpan file video di server kami.</p>
            </div>
          </div>
        </div>

        <div className="mt-20">
          <DramaSection title="Mungkin Anda Suka" dramas={trendingDramas} isLoading={trendingLoading} />
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
