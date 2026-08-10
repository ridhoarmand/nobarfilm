import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

// Helper function to convert SRT to VTT
function srtToVtt(srtContent: string): string {
  // Remove UTF-8 BOM if present and normalize line breaks
  const cleanContent = srtContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();

  // If the content is already WebVTT, return it as-is
  if (cleanContent.startsWith('WEBVTT')) {
    return cleanContent;
  }

  // Replace comma with dot in timestamps (00:00:00,000 --> 00:00:00.000)
  const vttContent = cleanContent
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .replace(/(\d{2}:\d{2}),(\d{3})/g, '00:$1.$2');

  // Add WEBWTT header
  return `WEBVTT\n\n${vttContent}`;
}

// Helper function to convert WebVTT to SRT
function vttToSrt(vttContent: string): string {
  const cleanContent = vttContent.replace(/^\uFEFF/, '').replace(/^WEBVTT/i, '').replace(/\r\n/g, '\n').trim();
  return cleanContent.replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, '$1,$2');
}

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
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://lok-lok.cc/',
        'Origin': 'https://lok-lok.cc',
      },
      redirect: 'follow',
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
    const vttContent = srtToVtt(rawContent);
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Subtitle proxy error:', message);
    return NextResponse.json({ error: 'Failed to fetch subtitle' }, { status: 500 });
  }
}
