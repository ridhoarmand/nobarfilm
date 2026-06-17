import { encryptedResponse } from '@/lib/api-utils';
import { movieBoxService } from '@/lib/moviebox';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const loginRes = await movieBoxService.loginUser(email, password);

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
