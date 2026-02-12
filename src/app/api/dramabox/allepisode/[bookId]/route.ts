import { safeJson, encryptedResponse } from '@/lib/api-utils';import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.sansekai.my.id/api') + '/dramabox';

export async function GET(request: NextRequest, { params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const headersList = await headers();
  const accept = headersList.get('accept') || '';

  // If API fetch -> proxy to upstream
  try {
    const response = await fetch(`${UPSTREAM_API}/allepisode?bookId=${bookId}`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: response.status });
    }

    const data = await safeJson(response);
    return encryptedResponse(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
