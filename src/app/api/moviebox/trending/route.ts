import { safeJson, encryptedResponse } from '@/lib/api-utils';
import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.sansekai.my.id/api') + '/moviebox';

const ALLOWED_SUBJECT_TYPES = new Set([1, 2]);

interface MovieBoxSubject {
  subjectType?: number;
  [key: string]: unknown;
}

function filterSubjects(subjects: unknown[] | undefined) {
  if (!Array.isArray(subjects)) return subjects;
  return subjects.filter((item) => {
    const s = item as MovieBoxSubject;
    return typeof s?.subjectType === 'number' && ALLOWED_SUBJECT_TYPES.has(s.subjectType);
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '0';

    const response = await fetch(`${UPSTREAM_API}/trending?page=${page}`, {
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: response.status });
    }

    const data = await safeJson<{ subjectList?: unknown[] }>(response);
    if (Array.isArray(data?.subjectList)) {
      data.subjectList = filterSubjects(data.subjectList);
    }
    return encryptedResponse(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
