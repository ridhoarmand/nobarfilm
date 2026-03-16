import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

/**
 * Image Proxy with Long Cache Duration
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

    // Try wsrv.nl first - it handles SSL issues, CORS, and image conversion
    const w = searchParams.get('w');
    const h = searchParams.get('h');
    const output = searchParams.get('output') || 'webp';
    const quality = searchParams.get('q') || '80';

    let wsrvUrl = `https://wsrv.nl/?url=${encodeURIComponent(decodedUrl)}&output=${output}&q=${quality}`;
    if (w) wsrvUrl += `&w=${w}`;
    if (h) wsrvUrl += `&h=${h}`;
    wsrvUrl += '&fit=cover';

    response = await fetch(wsrvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    // Fallback: Try alternative weserv domain
    if (!response.ok) {
      console.log('wsrv.nl failed, trying images.weserv.nl...');
      let weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(decodedUrl)}&output=${output}&q=${quality}`;
      if (w) weservUrl += `&w=${w}`;
      if (h) weservUrl += `&h=${h}`;
      weservUrl += '&fit=cover';
      
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
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
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
