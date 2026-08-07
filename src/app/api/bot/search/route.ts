import { movieBoxService } from '@/lib/moviebox';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = (searchParams.get('q') || searchParams.get('query') || '').trim();
  const page = parseInt(searchParams.get('page') || '1', 10);

  if (!query) {
    return NextResponse.json(
      {
        success: false,
        message: 'Parameter query (q) wajib diisi.',
        total: 0,
        items: [],
      },
      { status: 400 }
    );
  }

  try {
    const data = await movieBoxService.search(query, Number.isNaN(page) ? 1 : page);

    const items = (data.items || []).map((item) => ({
      id: item.subjectId,
      title: item.title,
      type: item.subjectType === 2 ? 'Series' : 'Movie',
      typeCode: item.subjectType,
      releaseDate: item.releaseDate || '',
      rating: item.imdbRatingValue || '0.0',
      cover: item.cover?.url || item.coverHorizontalUrl || '',
      description: item.description || '',
      genre: item.genre || '',
      watchUrl: `https://film.idho.eu.org/watch/${item.subjectId}`,
    }));

    return NextResponse.json({
      success: true,
      query,
      page: data.pager?.page || page,
      hasMore: data.pager?.hasMore || false,
      total: items.length,
      items,
    });
  } catch (error: any) {
    console.error('[bot-search] API Error:', error.message);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal mencari film.',
        items: [],
      },
      { status: 500 }
    );
  }
}
