import { encryptedResponse, getClientToken } from '@/lib/api-utils';
import { movieBoxService } from '@/lib/moviebox';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = (searchParams.get('query') || '').trim();
  const page = parseInt(searchParams.get('page') || '1', 10);

  try {
    if (!query) {
      return encryptedResponse({
        items: [],
        pager: { hasMore: false, nextPage: '1', page: '1', perPage: 0, totalCount: 0 },
        counts: [],
        url: '',
        referer: '',
      });
    }

    const clientToken = getClientToken(request);
    const data = await movieBoxService.search(query, Number.isNaN(page) ? 1 : page, clientToken);
    return encryptedResponse(data);
  } catch (error: any) {
    console.error('[search] API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message?.includes('Akses Terbatas') ? 403 : 500 }
    );
  }
}
