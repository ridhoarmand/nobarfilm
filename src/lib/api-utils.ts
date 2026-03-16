import { NextResponse } from 'next/server';

export async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text || !text.trim()) {
    throw new Error(`Empty response from upstream: ${response.url}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON Parse Error:', error);
    console.error('Raw Text (truncated):', text.substring(0, 200));
    throw new Error('Invalid JSON response from upstream');
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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    'Referer': 'https://api.sansekai.my.id/',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
  };
}
