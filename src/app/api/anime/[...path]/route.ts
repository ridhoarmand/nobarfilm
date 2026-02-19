import { NextRequest, NextResponse } from 'next/server';
const API_BASE_URL = process.env.NEXT_ANIME_API_BASE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const endpoint = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${API_BASE_URL}/${endpoint}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
