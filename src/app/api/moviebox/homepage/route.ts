import { encryptedResponse } from '@/lib/api-utils';
import { movieBoxService } from '@/lib/moviebox';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await movieBoxService.getHomepage();
    return encryptedResponse(data, 200, {
      'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
    });
  } catch (error: any) {
    console.error('[homepage] API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message?.includes('Akses Terbatas') ? 403 : 500 }
    );
  }
}
