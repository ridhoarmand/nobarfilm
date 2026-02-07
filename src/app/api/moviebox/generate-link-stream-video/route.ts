import { safeJson, encryptedResponse } from '@/lib/api-utils';import { serverCache, cacheKeys, cacheTTL } from '@/lib/cache';
import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.sansekai.my.id/api') + '/moviebox';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  const cacheKey = cacheKeys.streamLink(url);

  // Check cache first
  const cached = serverCache.get<{ streamUrl?: string }>(cacheKey);
  if (cached) {
    console.log(`[Cache] HIT for stream link: ${url.substring(0, 50)}...`);
    return encryptedResponse(cached);
  }

  console.log(`[Cache] MISS for stream link: ${url.substring(0, 50)}...`);

  try {
    const response = await fetch(`${UPSTREAM_API}/generate-link-stream-video?url=${encodeURIComponent(url)}`, { cache: 'no-store' });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: response.status });
    }

    const data = await safeJson(response);

    // Store in cache (3 hours TTL)
    if (data && typeof data === 'object' && 'streamUrl' in data) {
      serverCache.set(cacheKey, data, cacheTTL.STREAM_LINK);
      console.log(`[Cache] STORED stream link for 3 hours`);
    }

    return encryptedResponse(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
