import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { WEB_CLIENT_UA, WEB_REFERER_ORIGIN } from '@/lib/moviebox/config';
import { fetchPublic, BlockedUrlError } from '@/lib/safeFetch';
import { toWebVtt, vttToSrt } from '@/lib/subtitleFormat';

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request, 15, 10000);
  if (!rateLimit.success && rateLimit.response) {
    return rateLimit.response;
  }

  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const format = searchParams.get('format') || 'vtt';

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Fetch subtitle content from external server with referer header
    const response = await fetchPublic(url, {
      headers: {
        'User-Agent': WEB_CLIENT_UA,
        'Referer': `${WEB_REFERER_ORIGIN}/`,
        'Origin': WEB_REFERER_ORIGIN,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch subtitle: ${response.status} ${response.statusText}`);
    }

    const rawContent = await response.text();
    const isDownload = searchParams.get('download') === 'true' || Boolean(searchParams.get('filename'));
    const requestedFilename = searchParams.get('filename') || `subtitle.${format}`;
    const safeFilename = requestedFilename.replace(/[^a-zA-Z0-9._\- ]/g, '_');

    if (format === 'srt') {
      const srtFormatted = vttToSrt(rawContent);
      const headers: Record<string, string> = {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      };
      if (isDownload) {
        headers['Content-Disposition'] = `attachment; filename="${safeFilename}"`;
      }
      return new NextResponse(srtFormatted, { headers });
    }

    // Convert to WebVTT
    const vttContent = toWebVtt(rawContent);
    const headers: Record<string, string> = {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    };
    if (isDownload) {
      headers['Content-Disposition'] = `attachment; filename="${safeFilename}"`;
    }

    return new NextResponse(vttContent, { headers });
  } catch (error: unknown) {
    if (error instanceof BlockedUrlError) {
      return NextResponse.json({ error: 'Forbidden target URL' }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Subtitle proxy error:', message);
    return NextResponse.json({ error: 'Failed to fetch subtitle' }, { status: 500 });
  }
}
