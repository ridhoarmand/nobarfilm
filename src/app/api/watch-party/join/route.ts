import { NextRequest, NextResponse } from 'next/server';import { createClient } from '@/lib/supabase/server';
import { JoinPartyPayload } from '@/types/watch-party';

export async function POST(request: NextRequest) {
  try {
    const body: JoinPartyPayload = await request.json();

    // Init Supabase with cookies
    const supabase = await createClient();

    // Get current user (validated)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Validate room code
    if (!body.room_code || body.room_code.length !== 6) {
      return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
    }

    // Call Supabase function to join room
    const { data, error } = await supabase.rpc('join_watch_party_room', {
      p_room_code: body.room_code.toUpperCase(),
      p_user_id: userId,
    });

    if (error) {
      console.error('Error joining watch party:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Extract result
    const result = data[0];

    if (!result.res_success) {
      return NextResponse.json({ error: result.res_message }, { status: 400 });
    }

    // Fetch room details
    const { data: roomData, error: roomError } = await supabase.from('watch_party_rooms').select('*').eq('id', result.res_room_id).single();

    if (roomError) {
      console.error('Error fetching room:', roomError);
      return NextResponse.json({ error: 'Failed to fetch room details' }, { status: 500 });
    }

    // Fetch participants
    const { data: participants, error: participantsError } = await supabase.from('watch_party_participants').select('*').eq('room_id', result.res_room_id).eq('is_connected', true);

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
    }

    return NextResponse.json({
      success: true,
      room: roomData,
      participants: participants || [],
      message: result.res_message,
    });
  } catch (error: unknown) {
    console.error('Error in join watch party:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
