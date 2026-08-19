import { NextResponse } from 'next/server';
import { createRoom } from '../../../../../server/party/roomManager';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Request body tidak valid' },
        { status: 400 },
      );
    }

    const { displayName, avatarColor, subjectId, season = 0, episode = 0 } = body;
    if (!displayName || !subjectId) {
      return NextResponse.json(
        { success: false, error: 'Nama dan ID film wajib diisi' },
        { status: 400 },
      );
    }

    const tempSocketId = `init-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const room = createRoom(
      tempSocketId,
      String(displayName).trim().slice(0, 20),
      avatarColor || '#EF4444',
      String(subjectId),
      Number(season) || 0,
      Number(episode) || 0,
    );

    return NextResponse.json({
      success: true,
      roomCode: room.code,
    });
  } catch (err: any) {
    console.error('Error creating party room:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal membuat room' },
      { status: 500 },
    );
  }
}
