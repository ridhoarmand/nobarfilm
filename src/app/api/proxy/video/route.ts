import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic'; // Prevent static optimization

export async function GET(req: NextRequest) {
  const urlParams = req.nextUrl.searchParams;
  const url = urlParams.get('url');
  const refererParam = urlParams.get('referer');

  if (!url) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  try {
    const range = req.headers.get('range');
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*',
      Referer: refererParam || new URL(url).origin + '/',
      // NOTE: Do NOT send Origin header - video CDN returns 403 if Origin doesn't match their whitelist
    };

    if (range) {
      headers['Range'] = range;
    }

    // 1. Fetch from Upstream using native fetch
    const upstreamRes = await fetch(url, {
      headers,
      redirect: 'follow',
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      console.error(`Proxy fetch failed for ${url}: ${upstreamRes.status}`);
      return new NextResponse(`Upstream Error: ${upstreamRes.statusText}`, { status: upstreamRes.status });
    }

    const contentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();
    const finalUrl = upstreamRes.url;
    const lowUrl = finalUrl.toLowerCase();

    // 2. Identify Type
    const isM3u8 = contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl') || lowUrl.includes('.m3u8');

    const isVtt = contentType.includes('text/vtt') || lowUrl.endsWith('.vtt') || lowUrl.endsWith('.srt');

    // 3. IF BINARY (MP4, TS, etc) -> STREAM DIRECTLY
    if (!isM3u8 && !isVtt && (lowUrl.includes('.mp4') || lowUrl.includes('.ts') || contentType.includes('video/'))) {
      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', contentType || 'video/mp4');
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Accept-Ranges', 'bytes');

      const contentLength = upstreamRes.headers.get('content-length');
      if (contentLength) responseHeaders.set('Content-Length', contentLength);

      const contentRange = upstreamRes.headers.get('content-range');
      if (contentRange) responseHeaders.set('Content-Range', contentRange);

      return new NextResponse(upstreamRes.body, {
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: responseHeaders,
      });
    }

    // 4. IF TEXT/HLS -> BUFFER & REWRITE
    // Get arrayBuffer and convert to Buffer for consistency with existing logic
    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const decoder = new TextDecoder();

    // Double check content (sometimes headers lie)
    const firstChunk = decoder.decode(buffer.slice(0, 100));
    const isM3u8Content = firstChunk.includes('#EXTM3U');

    // DETERMINE VALID ORIGIN for rewrites
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const origin = `${proto}://${host}`;

    if (isM3u8 || isM3u8Content) {
      const text = decoder.decode(buffer);
      const baseUrl = new URL(finalUrl);

      const subUrl = urlParams.get('sub');
      const isMasterPlaylist = text.includes('#EXT-X-STREAM-INF');

      let rewritten = text
        .split(/\r?\n/)
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          const createProxyUrl = (targetUrl: string) => {
            let base = `${origin}/api/proxy/video?url=${encodeURIComponent(targetUrl)}`;
            if (refererParam) base += `&referer=${encodeURIComponent(refererParam)}`;
            return base;
          };

          if (trimmed.startsWith('#')) {
            return line.replace(/URI="([^"]+)"/g, (match, uri) => {
              try {
                const absoluteUrl = new URL(uri, baseUrl.href).href;
                return `URI="${createProxyUrl(absoluteUrl)}"`;
              } catch {
                return match;
              }
            });
          }

          try {
            const absoluteUrl = new URL(trimmed, baseUrl.href).href;
            return createProxyUrl(absoluteUrl);
          } catch {
            return line;
          }
        })
        .join('\n');

      if (isMasterPlaylist && subUrl) {
        let proxiedSubUrl = `${origin}/api/proxy/video?url=${encodeURIComponent(subUrl)}`;
        if (refererParam) proxiedSubUrl += `&referer=${encodeURIComponent(refererParam)}`;

        const mediaLine = `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Indonesia",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="id",URI="${proxiedSubUrl}"`;
        rewritten = rewritten.replace('#EXTM3U', '#EXTM3U\n' + mediaLine);
        rewritten = rewritten.replace(/#EXT-X-STREAM-INF:(.*)/g, (match, attrs) => {
          if (attrs.includes('SUBTITLES=')) return match;
          return `#EXT-X-STREAM-INF:${attrs},SUBTITLES="subs"`;
        });
      }

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      });
    }

    // VTT/SRT Logic
    if (isVtt || lowUrl.endsWith('.srt')) {
      let vttContent = decoder.decode(buffer);
      const isSrt = lowUrl.includes('.srt');

      if (isSrt && !firstChunk.includes('WEBVTT')) {
        vttContent = vttContent.replace(/\r\n/g, '\n').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
        vttContent = 'WEBVTT\n\n' + vttContent;
      }

      vttContent = vttContent.replace(/((?:\d{2}:)?\d{2}:\d{2}\.\d{3} --> (?:\d{2}:)?\d{2}:\d{2}\.\d{3})(.*)/g, (match, time, rest) => (rest.includes('line:') ? match : `${time} line:75%${rest}`));

      return new NextResponse(vttContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/vtt',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      });
    }

    // FALLBACK: Just return buffered content (e.g. small unknown files)
    return new NextResponse(buffer, {
      status: upstreamRes.status || 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
