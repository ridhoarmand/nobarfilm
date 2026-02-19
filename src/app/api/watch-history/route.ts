import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ContinueWatchingItem } from '@/types/watch-history';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch incomplete watch history, ordered by last watched
    const { data, error } = await supabase.from('watch_history').select('*').eq('user_id', user.id).eq('completed', false).order('last_watched_at', { ascending: false }).limit(10);

    if (error) {
      console.error('Error fetching watch history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to ContinueWatchingItem with progress_percent
    const items: ContinueWatchingItem[] = (data || []).map((item) => ({
      id: item.id,
      subject_id: item.subject_id,
      subject_type: item.subject_type,
      title: item.title,
      cover_url: item.cover_url,
      current_episode: item.current_episode,
      total_episodes: item.total_episodes,
      progress_seconds: item.progress_seconds,
      duration_seconds: item.duration_seconds,
      progress_percent: item.duration_seconds > 0 ? Math.round((item.progress_seconds / item.duration_seconds) * 100) : 0,
      last_watched_at: item.last_watched_at,
    }));

    return NextResponse.json({ items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in get watch history:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
