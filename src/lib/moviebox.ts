import { safeJson, getMovieboxHeaders } from './api-utils';
import { serverCache, cacheKeys, cacheTTL } from './cache';
import { HomepageResponse, TrendingResponse, DetailResponse, SourcesResponse, Subject, BannerItem } from '@/types/api';

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.sansekai.my.id/api').replace(/\/+$/, '') + '/moviebox';
const ALLOWED_SUBJECT_TYPES = new Set([1, 2]);

function isAllowedSubjectType(subjectType?: number) {
  return typeof subjectType === 'number' && ALLOWED_SUBJECT_TYPES.has(subjectType);
}

function filterSubjects(subjects: Subject[] | undefined): Subject[] {
  if (!Array.isArray(subjects)) return [];
  return subjects.filter((item) => isAllowedSubjectType(item.subjectType));
}

function filterBannerItems(items: BannerItem[] | undefined): BannerItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => isAllowedSubjectType(item.subjectType || item.subject?.subjectType));
}

/**
 * Centralized MovieBox API Service
 * Bypasses API routes for server-to-server calls.
 */
export const movieBoxService = {
  async getHomepage(): Promise<HomepageResponse> {
    const key = cacheKeys.apiResponse('homepage', '');
    const cached = serverCache.get<HomepageResponse>(key);
    if (cached) return cached;

    const response = await fetch(`${UPSTREAM_API}/homepage`, {
      headers: getMovieboxHeaders(),
      next: { revalidate: 900 },
    });

    if (!response.ok) throw new Error(`Upstream Error: ${response.status}`);
    const data = await safeJson<HomepageResponse>(response);

    // Data filtering
    if (Array.isArray(data?.operatingList)) {
      data.operatingList = data.operatingList.map((section) => {
        if (Array.isArray(section?.subjects)) {
          return { ...section, subjects: filterSubjects(section.subjects) };
        }
        if (section?.banner?.items) {
          return { ...section, banner: { ...section.banner, items: filterBannerItems(section.banner.items) || [] } };
        }
        return section;
      });
    }

    if (data?.banner?.items) {
      data.banner.items = filterBannerItems(data.banner.items);
    }

    if (Array.isArray(data?.topPickList)) {
      data.topPickList = filterSubjects(data.topPickList);
    }

    serverCache.set(key, data, cacheTTL.API_RESPONSE);
    return data;
  },

  async getTrending(page: number = 0): Promise<TrendingResponse> {
    const key = cacheKeys.apiResponse('trending', `page=${page}`);
    const cached = serverCache.get<TrendingResponse>(key);
    if (cached) return cached;

    const response = await fetch(`${UPSTREAM_API}/trending?page=${page}`, {
      headers: getMovieboxHeaders(),
      next: { revalidate: 900 },
    });

    if (!response.ok) throw new Error(`Upstream Error: ${response.status}`);
    const data = await safeJson<TrendingResponse>(response);

    if (Array.isArray(data?.subjectList)) {
      data.subjectList = filterSubjects(data.subjectList);
    }

    serverCache.set(key, data, cacheTTL.API_RESPONSE);
    return data;
  },

  async getDetail(subjectId: string): Promise<DetailResponse> {
    const key = cacheKeys.apiResponse('detail', subjectId);
    const cached = serverCache.get<DetailResponse>(key);
    if (cached) return cached;

    // Try query param first
    let response = await fetch(`${UPSTREAM_API}/detail?subjectId=${subjectId}`, {
      headers: getMovieboxHeaders(),
      next: { revalidate: 1800 },
    });

    // Fallback to path param if 404
    if (!response.ok && response.status === 404) {
      response = await fetch(`${UPSTREAM_API}/detail/${subjectId}`, {
        headers: getMovieboxHeaders(),
        next: { revalidate: 1800 },
      });
    }

    if (!response.ok) throw new Error(`Upstream Error: ${response.status}`);
    const data = await safeJson<DetailResponse>(response);

    serverCache.set(key, data, cacheTTL.API_RESPONSE * 2);
    return data;
  },

  async getSources(subjectId: string, season?: number, episode?: number): Promise<SourcesResponse> {
    const query = new URLSearchParams();
    if (typeof season === 'number') query.set('season', season.toString());
    if (typeof episode === 'number') query.set('episode', episode.toString());
    const queryString = query.toString();
    
    // Links expire fast, so cache less
    const key = cacheKeys.apiResponse('sources', `${subjectId}:${queryString}`);
    const cached = serverCache.get<SourcesResponse>(key);
    if (cached) return cached;

    // Query params approach: ?subjectId=foo&season=...
    const fullQueryProps = new URLSearchParams(query);
    fullQueryProps.set('subjectId', subjectId);
    
    let response = await fetch(`${UPSTREAM_API}/sources?${fullQueryProps.toString()}`, {
      headers: getMovieboxHeaders(),
      next: { revalidate: 300 },
    });

    // Fallback to path param approach if 404
    if (!response.ok && response.status === 404) {
      response = await fetch(`${UPSTREAM_API}/sources/${subjectId}${queryString ? `?${queryString}` : ''}`, {
        headers: getMovieboxHeaders(),
        next: { revalidate: 300 },
      });
    }

    if (!response.ok) throw new Error(`Upstream Error: ${response.status}`);
    const data = await safeJson<SourcesResponse>(response);

    serverCache.set(key, data, 120); // 2 minutes link cache
    return data;
  }
};
