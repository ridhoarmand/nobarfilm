import { NextRequest, NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory rate limiting store for API routes
const rateLimitMap = new Map<string, RateLimitRecord>();

// Periodically clean up expired records every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000);
}

/**
 * Checks rate limit for incoming Next.js API requests.
 * @param req NextRequest
 * @param limit Max requests allowed in the time window (default: 20)
 * @param windowMs Time window in milliseconds (default: 10000ms / 10 seconds)
 */
export function checkRateLimit(
  req: NextRequest,
  limit: number = 20,
  windowMs: number = 10000
): { success: boolean; response?: NextResponse } {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const pathname = req.nextUrl.pathname;
  const key = `${ip}:${pathname}`;
  const now = Date.now();

  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { success: true };
  }

  if (record.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Terlalu banyak permintaan. Silakan tunggu ${retryAfterSec} detik.`,
          retryAfter: retryAfterSec,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSec),
            'Content-Type': 'application/json',
          },
        }
      ),
    };
  }

  record.count += 1;
  return { success: true };
}
