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
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }
    const clientIp = request.headers.get('x-forwarded-for') || '';
    const checkRes = await movieBoxService.checkMailAccount(email, clientIp);

    if (checkRes.code !== 0) {
      return NextResponse.json(
        { success: false, error: checkRes.message || 'Failed to check account' },
        { status: 400 }
      );
    }

    // Response structure contains { exists, hasPassword, reset }
    return NextResponse.json({
      success: true,
      data: {
        exists: checkRes.data?.exists ?? false,
        hasPassword: checkRes.data?.hasPassword ?? false,
        reset: checkRes.data?.reset ?? false,
      }
    });
  } catch (error: any) {
    console.error('[check-email-route] API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
