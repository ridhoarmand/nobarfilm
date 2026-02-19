import { safeJson, encryptedResponse } from '@/lib/api-utils';import { NextRequest } from 'next/server';

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.sansekai.my.id/api') + '/netshort';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
      return encryptedResponse({ success: true, data: [] });
    }

    const response = await fetch(`${UPSTREAM_API}/search?query=${encodeURIComponent(query)}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return encryptedResponse({ success: true, data: [] });
    }

    const json = await safeJson<unknown>(response);
    const data = json as Record<string, unknown>;

    // Search results are in searchCodeSearchResult array
    const results = (data.searchCodeSearchResult as Record<string, unknown>[]) || [];

    const normalizedResults = results.map((item) => ({
      shortPlayId: item.shortPlayId as string,
      shortPlayLibraryId: item.shortPlayLibraryId as string,
      // Remove <em> tags from title
      title: ((item.shortPlayName as string) || '').replace(/<\/?em>/g, ''),
      cover: item.shortPlayCover as string,
      labels: (item.labelNameList as string[]) || [],
      heatScore: (item.formatHeatScore as string) || '',
      description: item.shotIntroduce as string,
    }));

    return encryptedResponse({
      success: true,
      data: normalizedResults,
    });
  } catch (error) {
    console.error('NetShort Search Error:', error);
    return encryptedResponse({ success: true, data: [] });
  }
}
