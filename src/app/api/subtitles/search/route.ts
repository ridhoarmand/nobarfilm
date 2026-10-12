import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, encryptedResponse } from '@/lib/api-utils';
import { ApiError } from '@/lib/fetcher';
import { searchSubdlTitles, searchSubdlSubtitles } from '@/lib/subdl';

const headers = { 'Cache-Control': 'no-store' };
const errors: Record<number, string> = {
  400: 'Permintaan subtitle tidak valid.',
  410: 'Hasil pencarian kedaluwarsa. Cari kembali.',
  422: 'File subtitle tidak dapat digunakan. Pilih hasil lain.',
  429: 'Kuota subtitle penyedia sedang habis. Coba lagi setelah kuota tersedia.',
  502: 'Penyedia subtitle tidak dapat dihubungi. Coba lagi.',
  503: 'Subtitle eksternal belum dikonfigurasi.',
};

export async function GET(request: NextRequest) {
  const limit = checkRateLimit(request, 10, 10000);
  if (!limit.success && limit.response) {
    limit.response.headers.set('Cache-Control', 'no-store');
    return limit.response;
  }

  try {
    const invalid = () => { throw new ApiError(errors[400], 400); };
    const origin = request.headers.get('origin');
    const requestOrigin = new URL(request.nextUrl.origin);
    requestOrigin.host = request.headers.get('host') || requestOrigin.host;
    if (origin && origin !== requestOrigin.origin) invalid();
    const params = request.nextUrl.searchParams;
    const allowed = new Set(['query', 'titleId', 'type', 'season', 'episode']);
    for (const key of params.keys()) {
      if (!allowed.has(key) || params.getAll(key).length !== 1) invalid();
    }
    const type = params.get('type');
    if (type !== 'movie' && type !== 'tv') return invalid();
    if (params.has('query') === params.has('titleId')) invalid();

    if (params.has('query')) {
      const query = params.get('query')!.trim();
      if (query.length < 2 || query.length > 150 || params.has('season') || params.has('episode')) invalid();
      return encryptedResponse({ titles: await searchSubdlTitles(query, type) }, 200, headers);
    }

    const titleId = params.get('titleId')!;
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(titleId)) invalid();
    let season: number | undefined;
    let episode: number | undefined;
    if (type === 'tv') {
      const parsePositive = (value: string | null) => {
        if (!value || !/^[1-9]\d*$/.test(value)) return invalid();
        const number = Number(value);
        if (!Number.isSafeInteger(number)) invalid();
        return number;
      };
      season = parsePositive(params.get('season'));
      episode = parsePositive(params.get('episode'));
    } else if (params.has('season') || params.has('episode')) {
      invalid();
    }
    return encryptedResponse({ subtitles: await searchSubdlSubtitles(titleId, type, season, episode) }, 200, headers);
  } catch (error) {
    const status = error instanceof ApiError && errors[error.status] ? error.status : 502;
    return NextResponse.json({ error: errors[status] }, { status, headers });
  }
}
