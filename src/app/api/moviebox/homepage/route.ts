import { encryptedResponse } from '@/lib/api-utils';
import { movieBoxService } from '@/lib/moviebox';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await movieBoxService.getHomepage();
    return encryptedResponse(data);
  } catch (error) {
    console.error('[homepage] API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
