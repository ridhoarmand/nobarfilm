import { safeJson, encryptedResponse } from '@/lib/api-utils';
import { NextRequest, NextResponse } from 'next/server';
import { SearchResponse, Subject, ContentTypeCount } from '@/types/api';

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.sansekai.my.id/api') + '/moviebox';

const ALLOWED_SUBJECT_TYPES = new Set([1, 2]);

function filterSubjects(subjects: Subject[] | undefined) {
  if (!Array.isArray(subjects)) return subjects;
  return subjects.filter((item) => typeof item?.subjectType === 'number' && ALLOWED_SUBJECT_TYPES.has(item.subjectType));
}

function filterCounts(counts: ContentTypeCount[] | undefined) {
  if (!Array.isArray(counts)) return counts;
  return counts.filter((item) => typeof item?.subjectType === 'number' && ALLOWED_SUBJECT_TYPES.has(item.subjectType));
}

const MOVIEBOX_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
  'Accept-Encoding': 'gzip',
  'Sec-WebSocket-Version': '13',
  'Cache-Control': 'no-cache',
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const page = searchParams.get('page') || '1';

    if (!query) {
      return encryptedResponse([]);
    }

    const response = await fetch(`${UPSTREAM_API}/search?query=${encodeURIComponent(query)}&page=${page}`, {
      headers: MOVIEBOX_HEADERS,
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: response.status });
    }

    const data = await safeJson<SearchResponse>(response);
    if (Array.isArray(data?.items)) {
      data.items = filterSubjects(data.items) ?? [];
    }
    if (Array.isArray(data?.counts)) {
      data.counts = filterCounts(data.counts) ?? [];
    }
    return encryptedResponse(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
