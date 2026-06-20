import { movieBoxService } from '@/lib/moviebox';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
