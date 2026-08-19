import { movieBoxService } from '@/lib/moviebox';
import { NextResponse, NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, 5, 60000);
    if (!rateLimit.success && rateLimit.response) return rateLimit.response;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ code: 400, message: 'Invalid JSON request body' }, { status: 400 });
    }
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: 'Email and verification code are required' },
        { status: 400 }
      );
    }
    const clientIp = request.headers.get('x-forwarded-for') || '';
    const verifyRes = await movieBoxService.checkSmsCode(email, code, clientIp);

    if (verifyRes.code !== 0) {
      return NextResponse.json(
        { success: false, error: verifyRes.message || 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Code verified successfully'
    });
  } catch (error: any) {
    console.error('[verify-code-route] API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
