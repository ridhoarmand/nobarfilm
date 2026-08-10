import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic'; // Prevent static optimization

function isValidProxyTargetUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();

    // Prevent access to loopback / private IP ranges / cloud metadata IPs
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, 20, 10000);
  if (!rateLimit.success && rateLimit.response) {
    return rateLimit.response;
  }

  const urlParams = req.nextUrl.searchParams;
  const url = urlParams.get('url');
  const refererParam = urlParams.get('referer');
  const filename = urlParams.get('filename');

  if (!url) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  if (!isValidProxyTargetUrl(url)) {
    return new NextResponse('Forbidden target URL', { status: 403 });
  }

  try {
    const range = req.headers.get('range');
    const isMobileCdn = url.includes('/bt/') || url.includes('hcdn3.') || url.includes('hcdn');
    const headers: Record<string, string> = {
      'User-Agent': isMobileCdn
        ? 'okhttp/4.9.0'
        : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
      Accept: '*/*',
    };

    if (!isMobileCdn) {
      headers['Referer'] = refererParam || 'https://lok-lok.cc/';
      headers['Origin'] = 'https://lok-lok.cc';
    }

    if (range) {
      headers['Range'] = range;
    }

    // 1. Fetch from Upstream using native fetch (connected to client request signal)
    const upstreamRes = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: req.signal,
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
    if (!isM3u8 && !isVtt) {
      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', contentType || 'video/mp4');
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Accept-Ranges', 'bytes');

      if (filename) {
        const safeFilename = filename.replace(/[^a-zA-Z0-9._\- ]/g, '_');
        responseHeaders.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
      }

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
