import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  try {
    const targetUrl = new URL(url);
    return NextResponse.redirect(targetUrl, 302);
  } catch {
    return NextResponse.json({ error: 'Invalid URL parameter' }, { status: 400 });
  }
}
