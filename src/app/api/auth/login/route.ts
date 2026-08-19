import { encryptedResponse, checkRateLimit } from '@/lib/api-utils';
import { movieBoxService } from '@/lib/moviebox';
import { NextResponse, NextRequest } from 'next/server';

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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }
    const clientIp = request.headers.get('x-forwarded-for') || '';
    const loginRes = await movieBoxService.loginUser(email, password, clientIp);

    if (loginRes.code !== 0 || !loginRes.data?.token) {
      return NextResponse.json(
        { success: false, error: loginRes.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    const { token, userId } = loginRes.data;

    let nickname = email.split('@')[0];
    let avatar = '';

    try {
      const infoRes = await movieBoxService.getUserInfo(userId, token);
      if (infoRes.code === 0 && infoRes.data) {
        nickname = infoRes.data.nickname || nickname;
        avatar = infoRes.data.avatar || avatar;
      }
    } catch (infoErr: any) {
      console.error('[login-route] Failed to fetch user info:', infoErr.message);
    }

    return encryptedResponse({
      token,
      user: {
        userId,
        nickname,
        avatar
      }
    });
  } catch (error: any) {
    console.error('[login-route] API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
