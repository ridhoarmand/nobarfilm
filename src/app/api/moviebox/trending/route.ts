import { encryptedResponse } from '@/lib/api-utils';
import { movieBoxService } from '@/lib/moviebox';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '0');

  try {
    const data = await movieBoxService.getTrending(page);
    return encryptedResponse(data);
  } catch (error) {
    console.error('[trending] API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
