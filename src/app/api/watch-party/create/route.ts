import { NextRequest, NextResponse } from 'next/server';import { createClient } from '@/lib/supabase/server';
import { CreatePartyPayload } from '@/types/watch-party';

export async function POST(request: NextRequest) {
  try {
    const body: CreatePartyPayload = await request.json();

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

    // Validate required fields
    if (!body.subject_id || !body.title || body.subject_type === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for existing active room by this user for the same content
    const { data: existingRoom } = await supabase
      .from('watch_party_rooms')
      .select('id, room_code, expires_at')
      .eq('host_id', userId)
      .eq('subject_id', body.subject_id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    // If user already has an active room for this content, return it
    if (existingRoom) {
      console.log(`[Room Dedup] Returning existing room ${existingRoom.room_code} for user ${userId}`);
      return NextResponse.json({
        success: true,
        roomId: existingRoom.id,
        roomCode: existingRoom.room_code,
        reused: true, // Flag to indicate this is a reused room
      });
    }

    // Clean up user's old expired rooms for this content
    await supabase.from('watch_party_rooms').delete().eq('host_id', userId).eq('subject_id', body.subject_id).lt('expires_at', new Date().toISOString());

    // Call Supabase function to create room
    const { data, error } = await supabase.rpc('create_watch_party_room', {
      p_host_id: userId,
      p_subject_id: body.subject_id,
      p_subject_type: body.subject_type,
      p_title: body.title,
      p_cover_url: body.cover_url || null,
      p_current_episode: body.current_episode || 1,
    });

    if (error) {
      console.error('Error creating watch party:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Extract room_id and room_code from response
    const result = data[0];

    return NextResponse.json({
      success: true,
      roomId: result.res_room_id,
      roomCode: result.res_room_code,
      reused: false,
    });
  } catch (error: any) {
    console.error('Error in create watch party:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
