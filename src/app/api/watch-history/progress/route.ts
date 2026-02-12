import { NextResponse, NextRequest } from 'next/server';import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const subjectId = searchParams.get('subject_id');
    const episode = parseInt(searchParams.get('episode') || '0');

    if (!subjectId) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query watch history
    let query = supabase.from('watch_history').select('progress_seconds, duration_seconds, completed, last_watched_at').eq('user_id', user.id).eq('subject_id', subjectId);

    // If episode is provided and > 0, filter by episode
    if (episode > 0) {
      query = query.eq('current_episode', episode);
    } else {
      // For movies or if we just want the latest regardless of episode (though usually we want specific episode)
      // If no episode specified, maybe we want the most recently watched episode?
      // For now, let's assume if episode is 0 (movie), we query where current_episode is 0 or 1 (some systems use 1 for movies)
      // But typically movies have episode 0 or 1.
      // Let's rely on the client passing the correct episode.
      // If it's a movie, client passes 0 or 1.
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching watch progress:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ progress: 0 });
    }

    return NextResponse.json({
      progress: data.progress_seconds,
      duration: data.duration_seconds,
      completed: data.completed,
      last_watched_at: data.last_watched_at,
    });
  } catch (error: any) {
    console.error('Error in get watch progress:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
