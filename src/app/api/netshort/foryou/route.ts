import { safeJson, encryptedResponse } from '@/lib/api-utils';import { NextRequest } from 'next/server';

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.sansekai.my.id/api') + '/netshort';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';

    const response = await fetch(`${UPSTREAM_API}/foryou?page=${page}`, {
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      return encryptedResponse({ success: false, data: [] });
    }

    const json = await safeJson<Record<string, unknown>>(response);
    const data = json;

    // Normalize the response
    const dramas = ((data.contentInfos as Record<string, unknown>[]) || []).map((item) => ({
      shortPlayId: item.shortPlayId,
      shortPlayLibraryId: item.shortPlayLibraryId,
      title: item.shortPlayName,
      cover: item.shortPlayCover,
      labels: (item.labelArray as string[]) || [],
      heatScore: item.heatScoreShow || '',
      scriptName: item.scriptName,
    }));

    return encryptedResponse({
      success: true,
      data: dramas,
      maxOffset: data.maxOffset,
      completed: data.completed,
    });
  } catch (error) {
    console.error('NetShort ForYou Error:', error);
    return encryptedResponse({ success: false, data: [] });
  }
}
