import { encryptedResponse } from '@/lib/api-utils';
import { serverCache, cacheKeys, cacheTTL } from '@/lib/cache';
import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const referer = searchParams.get('referer') || undefined;

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
    const origin = request.nextUrl.origin;
    const params = new URLSearchParams({ url });
    if (referer) params.set('referer', referer);
    const fallback = {
      streamUrl: `${origin}/api/proxy/video?${params.toString()}`,
      mode: 'proxy',
    };

    serverCache.set(cacheKey, fallback, 600);
    return encryptedResponse(fallback);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
