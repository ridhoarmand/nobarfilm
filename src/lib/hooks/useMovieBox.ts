import { useQuery, UseQueryOptions, keepPreviousData } from '@tanstack/react-query';import { movieBoxAPI } from '@/lib/api/moviebox';
import type { HomepageResponse, TrendingResponse, SearchResponse, DetailResponse, SourcesResponse, ApiError } from '@/types/api';

// Query keys for caching
export const queryKeys = {
  homepage: ['homepage'] as const,
  trending: (page: number) => ['trending', page] as const,
  search: (query: string, page: number) => ['search', query, page] as const,
  detail: (subjectId: string) => ['detail', subjectId] as const,
  sources: (subjectId: string, season: number, episode: number) => ['sources', subjectId, season, episode] as const,
};

/**
 * Hook to fetch homepage data
 */
export function useHomepage(options?: Omit<UseQueryOptions<HomepageResponse, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<HomepageResponse, ApiError>({
    queryKey: queryKeys.homepage,
    queryFn: () => movieBoxAPI.getHomepage(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}
export function useTrending(page: number = 0, options?: Omit<UseQueryOptions<TrendingResponse, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<TrendingResponse, ApiError>({
    queryKey: queryKeys.trending(page),
    queryFn: () => movieBoxAPI.getTrending(page),
    staleTime: 1000 * 60 * 3, // 3 minutes
    placeholderData: keepPreviousData,
    ...options,
  });
}

/**
 * Hook to search for content
 */
export function useSearch(query: string, page: number = 1, options?: Omit<UseQueryOptions<SearchResponse, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<SearchResponse, ApiError>({
    queryKey: queryKeys.search(query, page),
    queryFn: () => movieBoxAPI.search(query, page),
    enabled: query.length > 0, // Only search if query is not empty
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to fetch movie/series details
 */
export function useDetail(subjectId: string, options?: Omit<UseQueryOptions<DetailResponse, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<DetailResponse, ApiError>({
    queryKey: queryKeys.detail(subjectId),
    queryFn: () => movieBoxAPI.getDetail(subjectId),
    enabled: !!subjectId, // Only fetch if subjectId is provided
    staleTime: 1000 * 60 * 10, // 10 minutes (detail data doesn't change often)
    ...options,
  });
}

/**
 * Hook to fetch playback sources
 */
export function useSources(subjectId: string, season: number = 0, episode: number = 1, options?: Omit<UseQueryOptions<SourcesResponse, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<SourcesResponse, ApiError>({
    queryKey: queryKeys.sources(subjectId, season, episode),
    queryFn: () => movieBoxAPI.getSources(subjectId, season, episode),
    enabled: !!subjectId, // Only fetch if subjectId is provided
    staleTime: 1000 * 60 * 2, // 2 minutes (URLs expire, need fresh data)
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes (renamed from cacheTime in v5)
    refetchOnWindowFocus: false, // Prevent flickering on alt-tab
    ...options,
  });
}

/**
 * Hook to generate stream link from a specific source URL
 * Caches the result for 24 hours to avoid hitting the API frequently
 */
export function useGenerateStreamLink(url: string | undefined, options?: Omit<UseQueryOptions<{ streamUrl: string }, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<{ streamUrl: string }, ApiError>({
    queryKey: ['generate-stream', url] as const,
    queryFn: () => movieBoxAPI.generateStreamLink(url!),
    enabled: !!url,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 2, // 48 hours
    retry: 2,
    refetchOnWindowFocus: false, // Prevent flickering on alt-tab
    ...options,
  });
}

/**
 * Hook to get playback URL with automatic stream link generation
 */
export function usePlaybackUrl(
  subjectId: string,
  season: number = 0,
  episode: number = 1,
  quality: number = 0,
  options?: Omit<UseQueryOptions<{ streamUrl: string; captions: any[] }, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<{ streamUrl: string; captions: any[] }, ApiError>({
    queryKey: ['playback', subjectId, season, episode, quality] as const,
    queryFn: () => movieBoxAPI.getPlaybackUrl(subjectId, season, episode, quality),
    enabled: !!subjectId,
    staleTime: 1000 * 60, // 1 minute (URLs expire quickly)
    gcTime: 1000 * 60 * 2, // 2 minutes cache (renamed from cacheTime in v5)
    retry: 2, // Retry failed requests
    refetchOnWindowFocus: false, // Prevent flickering on alt-tab
    ...options,
  });
}
