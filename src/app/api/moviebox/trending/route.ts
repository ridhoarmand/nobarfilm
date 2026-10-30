import { encryptedResponse } from '@/lib/api-utils';
import { movieBoxService } from '@/lib/moviebox';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '0');

  try {
    const data = await movieBoxService.getTrending(page);
    return encryptedResponse(data, 200, {
      'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
    });
  } catch (error: any) {
    console.error('[trending] API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message?.includes('Akses Terbatas') ? 403 : 500 }
    );
  }
}
