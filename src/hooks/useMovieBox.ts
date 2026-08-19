import { useQuery, UseQueryOptions, keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import type { HomepageResponse, TrendingResponse, SearchResponse, DetailResponse, SourcesResponse, ApiError, Caption } from '@/types/api';
import { fetchJson } from '@/lib/fetcher';

const API_BASE = '/api/moviebox';

// Query keys for caching
export const movieBoxQueryKeys = {
  homepage: ['moviebox', 'homepage'] as const,
  trending: (page: number) => ['moviebox', 'trending', page] as const,
  search: (query: string, page: number) => ['moviebox', 'search', query, page] as const,
  detail: (subjectId: string) => ['moviebox', 'detail', subjectId] as const,
  sources: (subjectId: string, season: number | null, episode: number | null) => ['moviebox', 'sources', subjectId, season, episode] as const,
  playerMetadata: (subjectId: string, season: number | null, episode: number | null) => ['moviebox', 'player-metadata', subjectId, season, episode] as const,
  rankingList: (id: string, page: number) => ['moviebox', 'ranking-list', id, page] as const,
};

export interface PlayerMetadataResponse {
  subjectId: string;
  selected: {
    season: number;
    episode: number;
  };
  seasons: number[];
  episodes: number[];
  qualities: number[];
  audioOptions: Array<{ code: string; label: string }>;
  subtitles: Caption[];
  playerMode: 'direct' | 'embed';
  embedUrl: string | null;
}

/**
 * Hook to fetch homepage data
 */
export function useMovieBoxHomepage(options?: Omit<UseQueryOptions<HomepageResponse, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<HomepageResponse, ApiError>({
    queryKey: movieBoxQueryKeys.homepage,
    queryFn: () => fetchJson<HomepageResponse>(`${API_BASE}/homepage`),
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Hook to fetch trending movies/series
 */
export function useMovieBoxTrending(page: number = 0, options?: Omit<UseQueryOptions<TrendingResponse, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<TrendingResponse, ApiError>({
    queryKey: movieBoxQueryKeys.trending(page),
    queryFn: () => fetchJson<TrendingResponse>(`${API_BASE}/trending?page=${page}`),
    staleTime: 1000 * 60 * 3, // 3 minutes
    placeholderData: keepPreviousData,
    ...options,
  });
}

/**
 * Hook to fetch trending with infinite query
 */
export function useInfiniteMovieBoxTrending() {
  return useInfiniteQuery({
    queryKey: ['moviebox', 'trending', 'infinite'],
    queryFn: ({ pageParam = 0 }) => fetchJson<TrendingResponse>(`${API_BASE}/trending?page=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (lastPage: TrendingResponse, allPages: TrendingResponse[]) => {
      if (!lastPage || lastPage.subjectList?.length === 0) return undefined;
      return allPages.length; // Next page is current page count
    },
    staleTime: 1000 * 60 * 3,
  });
}

/**
 * Hook to search for movies/series
 */
export function useMovieBoxSearch(query: string, page: number = 1, options?: Omit<UseQueryOptions<SearchResponse, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<SearchResponse, ApiError>({
    queryKey: movieBoxQueryKeys.search(query, page),
    queryFn: () => fetchJson<SearchResponse>(`${API_BASE}/search?query=${encodeURIComponent(query)}&page=${page}`),
    enabled: query.length > 0, // Only search if query is not empty
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to fetch movie/series details
 */
export function useMovieBoxDetail(subjectId: string, options?: Omit<UseQueryOptions<DetailResponse, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<DetailResponse, ApiError>({
    queryKey: movieBoxQueryKeys.detail(subjectId),
    queryFn: () => fetchJson<DetailResponse>(`${API_BASE}/detail/${subjectId}`),
    enabled: !!subjectId, // Only fetch if subjectId is provided
    staleTime: 1000 * 60 * 10, // 10 minutes (detail data doesn't change often)
    ...options,
  });
}

/**
 * Hook to fetch playback sources
 */
export function useMovieBoxSources(subjectId: string, season?: number, episode?: number, options?: Omit<UseQueryOptions<SourcesResponse, ApiError>, 'queryKey' | 'queryFn'>) {
  const query = new URLSearchParams();
  if (typeof season === 'number') query.set('season', season.toString());
  if (typeof episode === 'number') query.set('episode', episode.toString());
  const queryString = query.toString();
  const url = `${API_BASE}/sources/${subjectId}${queryString ? `?${queryString}` : ''}`;

  return useQuery<SourcesResponse, ApiError>({
    queryKey: movieBoxQueryKeys.sources(subjectId, typeof season === 'number' ? season : null, typeof episode === 'number' ? episode : null),
    queryFn: () => fetchJson<SourcesResponse>(url),
    enabled: !!subjectId, // Only fetch if subjectId is provided
    staleTime: 1000 * 60 * 2, // 2 minutes (URLs expire, need fresh data)
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent flickering on alt-tab
    ...options,
  });
}

export function useMovieBoxPlayerMetadata(subjectId: string, season?: number, episode?: number, options?: Omit<UseQueryOptions<PlayerMetadataResponse, ApiError>, 'queryKey' | 'queryFn'>) {
  const query = new URLSearchParams();
  if (typeof season === 'number') query.set('season', season.toString());
  if (typeof episode === 'number') query.set('episode', episode.toString());
  const queryString = query.toString();
  const url = `${API_BASE}/player-metadata/${subjectId}${queryString ? `?${queryString}` : ''}`;

  return useQuery<PlayerMetadataResponse, ApiError>({
    queryKey: movieBoxQueryKeys.playerMetadata(subjectId, typeof season === 'number' ? season : null, typeof episode === 'number' ? episode : null),
    queryFn: () => fetchJson<PlayerMetadataResponse>(url),
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// Cache key generator for stream URLs
const getStreamCacheKey = (subjectId: string, season?: number, episode?: number) => `nobar-stream-${subjectId}-${season ?? 'na'}-${episode ?? 'na'}`;

export interface StreamDownloadItem {
  resolution: number;
  url: string;
  streamUrl: string;
}

export interface PlaybackData {
  streamUrl: string;
  allDownloads: StreamDownloadItem[];
  captions: Caption[];
  embedUrl?: string;
}

// Helper to get cached stream data
function getCachedStreamData(cacheKey: string): (PlaybackData & { expiry: number }) | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      // Check if not expired and contains valid streams
      if (data.expiry && data.expiry > Date.now()) {
        if (Array.isArray(data.allDownloads) && data.allDownloads.length > 0 && Boolean(data.streamUrl)) {
          return data;
        }
      }
      // Invalid or expired, remove from cache
      localStorage.removeItem(cacheKey);
    }
  } catch {}
  return null;
}

// Helper to cache stream data
function cacheStreamData(cacheKey: string, data: PlaybackData, expiryMinutes = 15) {
  if (typeof window === 'undefined') return;
  if (!data || !data.streamUrl || !Array.isArray(data.allDownloads) || data.allDownloads.length === 0) return;
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        ...data,
        expiry: Date.now() + expiryMinutes * 60 * 1000,
      }),
    );
  } catch {}
}

/**
 * Hook to get playback URL with stream sources
 * Uses localStorage caching to avoid repeated API calls
 */
export function useMovieBoxPlaybackUrl(
  subjectId: string,
  season?: number,
  episode?: number,
  quality: number = 0,
  options?: Omit<UseQueryOptions<PlaybackData, ApiError>, 'queryKey' | 'queryFn'>,
) {
  const query = new URLSearchParams();
  if (typeof season === 'number') query.set('season', season.toString());
  if (typeof episode === 'number') query.set('episode', episode.toString());
  const queryString = query.toString();
  const url = `${API_BASE}/sources/${subjectId}${queryString ? `?${queryString}` : ''}`;
  const cacheKey = getStreamCacheKey(subjectId, season, episode);

  const queryResult = useQuery<PlaybackData, ApiError>({
    queryKey: ['moviebox', 'playback', subjectId, typeof season === 'number' ? season : null, typeof episode === 'number' ? episode : null] as const,
    queryFn: async () => {
      // Check localStorage cache first
      const cached = getCachedStreamData(cacheKey);
      if (cached && Array.isArray(cached.allDownloads) && cached.allDownloads.length > 0) {
        const targetIndex = quality === -1 ? 0 : quality;
        return {
          streamUrl: cached.allDownloads?.[targetIndex]?.streamUrl || cached.streamUrl,
          allDownloads: cached.allDownloads || [],
          captions: cached.captions || [],
          embedUrl: cached.embedUrl,
        };
      }

      const sources = await fetchJson<SourcesResponse>(url);

      if (!sources.downloads || sources.downloads.length === 0) {
        throw new Error('No playback sources available');
      }

      // Sort downloads descending by resolution (so index 0 is the highest quality)
      const sortedDownloads = [...sources.downloads].sort((a, b) => (b.resolution || 0) - (a.resolution || 0));

      // Construct stream URLs using direct CDN URLs (prevents 429 rate limiting & proxy bottlenecks)
      const allDownloads: StreamDownloadItem[] = sortedDownloads.map((item) => {
        const isMobileCdn = item.url.includes('/bt/') || item.url.includes('hcdn');
        const proxiedUrl = `/api/proxy/video?url=${encodeURIComponent(item.url)}&referer=${encodeURIComponent('https://lok-lok.cc/')}`;
        return {
          resolution: item.resolution || 0,
          url: item.url,
          streamUrl: isMobileCdn ? proxiedUrl : item.url,
        };
      });

      const targetIndex = quality === -1 ? 0 : quality;
      const selectedStream = allDownloads[targetIndex]?.streamUrl || allDownloads[0]?.streamUrl || sortedDownloads[0].url;

      const result: PlaybackData = {
        streamUrl: selectedStream,
        allDownloads,
        captions: sources.captions || [],
      };

      // Cache the result
      cacheStreamData(cacheKey, result, 15); // 15 minutes cache

      return result;
    },
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // Keep in memory for 15 minutes
    retry: false, // Never retry automatically on error
    refetchOnWindowFocus: false,
    ...options,
  });

  return queryResult;
}

/**
 * Hook to fetch ranking / category list
 */
export function useMovieBoxRankingList(
  categoryType: string,
  page: number = 1,
  options?: Omit<UseQueryOptions<SearchResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SearchResponse, ApiError>({
    queryKey: movieBoxQueryKeys.rankingList(categoryType, page),
    queryFn: () => fetchJson<SearchResponse>(`${API_BASE}/ranking-list?id=${encodeURIComponent(categoryType)}&page=${page}`),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
    enabled: !!categoryType,
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Infinite hook to fetch ranking / category list with infinite scrolling
 */
export function useInfiniteMovieBoxRankingList(categoryType: string) {
  return useInfiniteQuery<SearchResponse, ApiError>({
    queryKey: ['moviebox', 'ranking-list-infinite', categoryType],
    queryFn: ({ pageParam = 1 }) =>
      fetchJson<SearchResponse>(`${API_BASE}/ranking-list?id=${encodeURIComponent(categoryType)}&page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pager?.hasMore && lastPage.pager?.nextPage) {
        return parseInt(lastPage.pager.nextPage, 10);
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    enabled: !!categoryType,
    refetchOnWindowFocus: false,
  });
}
