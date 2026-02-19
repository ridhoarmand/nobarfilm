import { NextRequest, NextResponse } from 'next/server';import { AnimeApi } from '@/lib/anime-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const initial = searchParams.get('initial') || 'A';

  try {
    const data = await AnimeApi.getAnimeList(page, initial);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Anime List API Error:', error);
    return NextResponse.json({ status: false, message: 'Failed to fetch anime list' }, { status: 500 });
  }
}
