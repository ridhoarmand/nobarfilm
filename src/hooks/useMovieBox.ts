import { useQuery, UseQueryOptions, keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import type { HomepageResponse, TrendingResponse, SearchResponse, DetailResponse, SourcesResponse, ApiError } from '@/types/api';
import { fetchJson } from '@/lib/fetcher';

const API_BASE = '/api/moviebox';

// Query keys for caching
export const movieBoxQueryKeys = {
  homepage: ['moviebox', 'homepage'] as const,
  trending: (page: number) => ['moviebox', 'trending', page] as const,
  search: (query: string, page: number) => ['moviebox', 'search', query, page] as const,
  detail: (subjectId: string) => ['moviebox', 'detail', subjectId] as const,
  sources: (subjectId: string, season: number, episode: number) => ['moviebox', 'sources', subjectId, season, episode] as const,
};

/**
 * Hook to fetch homepage data
 */
export function useMovieBoxHomepage(options?: Omit<UseQueryOptions<HomepageResponse, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<HomepageResponse, ApiError>({
    queryKey: movieBoxQueryKeys.homepage,
    queryFn: () => fetchJson<HomepageResponse>(`${API_BASE}/homepage`),
    staleTime: 1000 * 60 * 5, // 5 minutes
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
export function useMovieBoxSources(subjectId: string, season: number = 0, episode: number = 1, options?: Omit<UseQueryOptions<SourcesResponse, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<SourcesResponse, ApiError>({
    queryKey: movieBoxQueryKeys.sources(subjectId, season, episode),
    queryFn: () => fetchJson<SourcesResponse>(`${API_BASE}/sources/${subjectId}?season=${season}&episode=${episode}`),
    enabled: !!subjectId, // Only fetch if subjectId is provided
    staleTime: 1000 * 60 * 2, // 2 minutes (URLs expire, need fresh data)
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent flickering on alt-tab
    ...options,
  });
}

/**
 * Hook to get playback URL with stream sources
 */
export function useMovieBoxPlaybackUrl(
  subjectId: string,
  season: number = 0,
  episode: number = 1,
  quality: number = 0,
  options?: Omit<UseQueryOptions<{ streamUrl: string; captions: any[] }, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<{ streamUrl: string; captions: any[] }, ApiError>({
    queryKey: ['moviebox', 'playback', subjectId, season, episode, quality] as const,
    queryFn: async () => {
      const sources = await fetchJson<SourcesResponse>(`${API_BASE}/sources/${subjectId}?season=${season}&episode=${episode}`);
      
      if (!sources.downloads || sources.downloads.length === 0) {
        throw new Error('No playback sources available');
      }

      // Select quality (default to first available)
      const selectedSource = sources.downloads[quality] || sources.downloads[0];

      return {
        streamUrl: selectedSource.url,
        captions: sources.captions || [],
      };
    },
    enabled: !!subjectId,
    staleTime: 1000 * 60, // 1 minute (URLs expire quickly)
    gcTime: 1000 * 60 * 2, // 2 minutes cache
    retry: 2, // Retry failed requests
    refetchOnWindowFocus: false, // Prevent flickering on alt-tab
    ...options,
  });
}
