import { NextResponse } from 'next/server';

export async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  
  if (process.env.DEBUG_HTTP) {
    console.log(`[HTTP DEBUG] URL: ${response.url}`);
    console.log(`[HTTP DEBUG] Status: ${response.status}`);
    console.log(`[HTTP DEBUG] Headers:`, JSON.stringify(Object.fromEntries(response.headers.entries())));
    console.log(`[HTTP DEBUG] Body (truncated):`, text.substring(0, 500));
  }

  if (!text || !text.trim()) {
    throw new Error(`Empty response from upstream: ${response.url}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    console.error(`[safeJson] Parse Error for ${response.url}`);
    console.error(`[safeJson] Status: ${response.status}`);
    console.error(`[safeJson] Raw Text (truncated):`, text.substring(0, 500));
    throw new Error(`Invalid JSON response from upstream (${response.status})`);
  }
}

export function encryptedResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Common headers for Moviebox Upstream API to avoid 403 Forbidden
 * Mimics a real browser request more accurately.
 */
export function getMovieboxHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
    'Accept-Encoding': 'gzip',
    'Sec-WebSocket-Version': '13',
    'Cache-Control': 'no-cache',
  };
}
