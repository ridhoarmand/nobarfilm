import { encryptedResponse } from '@/lib/api-utils';
import { movieBoxService } from '@/lib/moviebox';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, code, inviteCode } = body;

    if (!email || !password || !code) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and verification code are required' },
        { status: 400 }
      );
    }
    const clientIp = request.headers.get('x-forwarded-for') || '';
    const regRes = await movieBoxService.registerUser(email, code, password, inviteCode || '', clientIp);

    if (regRes.code !== 0 || !regRes.data?.token) {
      return NextResponse.json(
        { success: false, error: regRes.message || 'Registration failed' },
        { status: 400 }
      );
    }

    const { token, userId } = regRes.data;

    let nickname = email.split('@')[0];
    let avatar = '';

    try {
      const infoRes = await movieBoxService.getUserInfo(userId, token);
      if (infoRes.code === 0 && infoRes.data) {
        nickname = infoRes.data.nickname || nickname;
        avatar = infoRes.data.avatar || avatar;
      }
    } catch (infoErr: any) {
      console.error('[register-route] Failed to fetch user info:', infoErr.message);
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
    console.error('[register-route] API Error:', error);
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
