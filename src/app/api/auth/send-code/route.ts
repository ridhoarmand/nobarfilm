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
    const { email, type = 1 } = body; // type=1 for registration/SMS verification

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }
    const clientIp = request.headers.get('x-forwarded-for') || '';
    const codeRes = await movieBoxService.getSmsCode(email, type, clientIp);

    if (codeRes.code !== 0) {
      return NextResponse.json(
        { success: false, error: codeRes.message || 'Failed to send verification code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully'
    });
  } catch (error: any) {
    console.error('[send-code-route] API Error:', error);
    let status = 500;
    let errorMsg = error.message || 'Internal Server Error';

    if (error.message && error.message.includes('HTTP Error:')) {
      const match = error.message.match(/HTTP Error:\s*(\d+)/);
      if (match) {
        status = parseInt(match[1], 10);
        if (status === 429) {
          errorMsg = 'Terlalu banyak permintaan (Rate limit terlampaui). Silakan coba lagi beberapa saat lagi.';
        }
      }
    }

    return NextResponse.json(
      { success: false, error: errorMsg },
      { status }
    );
  }
}
