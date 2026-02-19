import { NextRequest, NextResponse } from 'next/server';import { createClient } from '@/lib/supabase/server';
import { SaveProgressPayload } from '@/types/watch-history';

export async function POST(request: NextRequest) {
  try {
    const body: SaveProgressPayload = await request.json();

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

    // Validate required fields
    if (!body.subject_id || !body.title || body.duration_seconds === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate completion status
    const progressPercent = (body.progress_seconds / body.duration_seconds) * 100;
    const completed = body.completed ?? progressPercent >= 90;

    // Upsert watch history (insert or update if exists)
    const { data, error } = await supabase
      .from('watch_history')
      .upsert(
        {
          user_id: userId,
          subject_id: body.subject_id,
          subject_type: body.subject_type,
          title: body.title,
          cover_url: body.cover_url || null,
          current_episode: body.current_episode || 1,
          total_episodes: body.total_episodes || null,
          progress_seconds: Math.floor(body.progress_seconds),
          duration_seconds: Math.floor(body.duration_seconds),
          completed,
          last_watched_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,subject_id,current_episode',
        },
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving watch progress:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in update watch history:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
