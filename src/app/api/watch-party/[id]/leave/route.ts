import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roomId = params.id;

    // Init Supabase with cookies
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Update participant status to disconnected
    const { error } = await supabase
      .from('watch_party_participants')
      .update({
        is_connected: false,
        last_seen_at: new Date().toISOString(),
      })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error leaving watch party:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in leave watch party:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
