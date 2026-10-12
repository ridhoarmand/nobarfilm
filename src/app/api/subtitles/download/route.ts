import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, encryptedResponse } from '@/lib/api-utils';
import { ApiError } from '@/lib/fetcher';
import { downloadSubdlSubtitle } from '@/lib/subdl';

const headers = { 'Cache-Control': 'no-store' };
const errors: Record<number, string> = {
  400: 'Permintaan subtitle tidak valid.',
  410: 'Hasil pencarian kedaluwarsa. Cari kembali.',
  422: 'File subtitle tidak dapat digunakan. Pilih hasil lain.',
  429: 'Kuota subtitle penyedia sedang habis. Coba lagi setelah kuota tersedia.',
  502: 'Penyedia subtitle tidak dapat dihubungi. Coba lagi.',
  503: 'Subtitle eksternal belum dikonfigurasi.',
};

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(request, 5, 10000);
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
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') invalid();
    if (!request.body) return invalid();
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2048) {
          await reader.cancel();
          invalid();
        }
        chunks.push(value);
      }
    } catch {
      return invalid();
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let body: unknown;
    try {
      body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      return invalid();
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return invalid();
    const record = body as Record<string, unknown>;
    if (Object.keys(record).length !== 1 || typeof record.token !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(record.token)) return invalid();
    return encryptedResponse(await downloadSubdlSubtitle(record.token), 200, headers);
  } catch (error) {
    const status = error instanceof ApiError && errors[error.status] ? error.status : 502;
    return NextResponse.json({ error: errors[status] }, { status, headers });
  }
}
