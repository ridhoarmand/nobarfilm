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
