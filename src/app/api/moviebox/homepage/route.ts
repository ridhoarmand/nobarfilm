import { encryptedResponse, getClientToken } from '@/lib/api-utils';
import { movieBoxService } from '@/lib/moviebox';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const clientToken = getClientToken(request);
    const data = await movieBoxService.getHomepage(clientToken);
    return encryptedResponse(data);
  } catch (error: any) {
    console.error('[homepage] API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message?.includes('Akses Terbatas') ? 403 : 500 }
    );
  }
}
