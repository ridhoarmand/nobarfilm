import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

/**
 * Image Proxy with Long Cache Duration
 * Special handling for fizzopic.org (Melolo) images which need mobile-like headers
 * Uses wsrv.nl as fallback for image conversion
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    let response: Response | null = null;

    // For fizzopic.org (Melolo images), try direct fetch with mobile-like headers first
    // These servers often block external proxies but allow direct requests with proper headers
    if (decodedUrl.includes('fizzopic.org') || decodedUrl.includes('novel-sign')) {
      console.log('Detected Melolo image, trying direct fetch with mobile headers...');
      response = await fetch(decodedUrl, {
        headers: {
          'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 10; SM-G960F Build/QP1A.190711.020)',
          'Accept-Encoding': 'gzip',
          Connection: 'Keep-Alive',
          Host: 'p19-novel-sign-sg.fizzopic.org',
        },
      });

      // If HEIC is returned, we can serve it directly - modern browsers will handle it
      // or we try the wsrv.nl proxy for conversion
      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'image/heic';

        // If it's HEIC and we need to convert, use wsrv.nl
        if (contentType.includes('heic') || decodedUrl.includes('.heic')) {
          console.log('HEIC detected, trying wsrv.nl for conversion...');
          const wsrvUrl = `https://wsrv.nl/?url=${encodeURIComponent(decodedUrl)}&output=jpg&q=85`;
          const wsrvResponse = await fetch(wsrvUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });

          if (wsrvResponse.ok) {
            response = wsrvResponse;
          }
          // If wsrv fails, we'll use the original HEIC response
        }
      }
    }

    // If not a fizzopic URL or direct fetch failed, try the standard proxy chain
    if (!response || !response.ok) {
      // Try wsrv.nl first - it handles SSL issues, CORS, and image conversion
      const wsrvUrl = `https://wsrv.nl/?url=${encodeURIComponent(decodedUrl)}&output=jpg&q=85`;
      response = await fetch(wsrvUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
    }

    // Fallback: Try alternative weserv domain
    if (!response.ok) {
      console.log('wsrv.nl failed, trying images.weserv.nl...');
      const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(decodedUrl)}&output=jpg&q=85`;
      response = await fetch(weservUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
    }

    // Final fallback: Try direct fetch with browser-like headers
    if (!response.ok) {
      console.log('weserv failed, trying direct fetch...');
      response = await fetch(decodedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: new URL(decodedUrl).origin + '/',
          'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'image',
          'sec-fetch-mode': 'no-cors',
          'sec-fetch-site': 'cross-site',
        },
      });
    }

    if (!response.ok) {
      console.error(`All proxies failed for: ${decodedUrl}, status: ${response.status}`);
      return new NextResponse(null, {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache for 7 days - images rarely change
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse(null, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
