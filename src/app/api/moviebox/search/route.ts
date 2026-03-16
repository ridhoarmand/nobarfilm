import { safeJson, encryptedResponse, getMovieboxHeaders } from '@/lib/api-utils';import { serverCache, cacheKeys, cacheTTL } from '@/lib/cache';
import { NextRequest, NextResponse } from 'next/server';
import { SearchResponse, Subject, ContentTypeCount } from '@/types/api';

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.sansekai.my.id/api').replace(/\/+$/, '') + '/moviebox';

const ALLOWED_SUBJECT_TYPES = new Set([1, 2]);

function filterSubjects(subjects: Subject[] | undefined) {
  if (!Array.isArray(subjects)) return subjects;
  return subjects.filter((item) => typeof item?.subjectType === 'number' && ALLOWED_SUBJECT_TYPES.has(item.subjectType));
}

function filterCounts(counts: ContentTypeCount[] | undefined) {
  if (!Array.isArray(counts)) return counts;
  return counts.filter((item) => typeof item?.subjectType === 'number' && ALLOWED_SUBJECT_TYPES.has(item.subjectType));
}


export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const page = searchParams.get('page') || '1';
  const cacheKey = cacheKeys.apiResponse('search', `q=${query}&p=${page}`);

  try {
    if (!query) {
      return encryptedResponse([]);
    }

    // 1. Memory Cache HIT check
    const cachedData = serverCache.get<SearchResponse>(cacheKey);
    if (cachedData) {
      if (process.env.DEBUG_HTTP) console.log(`[search] Memory Cache HIT for "${query}" in ${(performance.now() - startTime).toFixed(2)}ms`);
      return encryptedResponse(cachedData);
    }

    const fetchStartTime = performance.now();
    const response = await fetch(`${UPSTREAM_API}/search?query=${encodeURIComponent(query)}&page=${page}`, {
      headers: getMovieboxHeaders(),
      next: { revalidate: 300 },
    });

    const fetchEndTime = performance.now();
    if (process.env.DEBUG_HTTP) {
      console.log(`[search] Upstream fetch for "${query}" took ${(fetchEndTime - fetchStartTime).toFixed(2)}ms`);
    }

    if (!response.ok) {
      console.error(`[search] Upstream Error: ${response.status} for ${response.url}`);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: response.status });
    }

    const data = await safeJson<SearchResponse>(response);

    // 2. Data Filtering
    const processingStartTime = performance.now();
    if (Array.isArray(data?.items)) {
      data.items = filterSubjects(data.items) ?? [];
    }
    if (Array.isArray(data?.counts)) {
      data.counts = filterCounts(data.counts) ?? [];
    }
    const processingEndTime = performance.now();
    if (process.env.DEBUG_HTTP) {
      console.log(`[search] Data processing took ${(processingEndTime - processingStartTime).toFixed(2)}ms`);
    }

    // 3. Save to Memory Cache
    serverCache.set(cacheKey, data, cacheTTL.API_RESPONSE);

    if (process.env.DEBUG_HTTP) {
      console.log(`[search] Total request time for "${query}": ${(performance.now() - startTime).toFixed(2)}ms`);
    }

    return encryptedResponse(data);
  } catch (error) {
    console.error('[search] API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
