import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isValidImageTarget(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname.endsWith('.aoneroom.com') ||
      hostname.endsWith('.weserv.nl') ||
      hostname === 'wsrv.nl' ||
      hostname.endsWith('.byteoversea.com') ||
      hostname.endsWith('.akamaized.net') ||
      hostname.endsWith('.themoviebox.org') ||
      hostname.endsWith('.hcdn3.com') ||
      hostname.endsWith('.hcdn.com')
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  if (!isValidImageTarget(url)) {
    return NextResponse.json({ error: 'Disallowed image host' }, { status: 403 });
  }

  try {
    const targetUrl = new URL(url);
    return NextResponse.redirect(targetUrl, 302);
  } catch {
    return NextResponse.json({ error: 'Invalid URL parameter' }, { status: 400 });
  }
}
