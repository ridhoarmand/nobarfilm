export interface WatchHistory {  id: string;
  user_id: string;
  subject_id: string;
  subject_type: number; // 1 = Movie, 2 = Series
  title: string;
  cover_url: string | null;

  // Progress
  current_episode: number;
  total_episodes: number | null;
  progress_seconds: number;
  duration_seconds: number;

  // Status
  completed: boolean;

  // Timestamps
  last_watched_at: string;
  created_at: string;
  updated_at: string;
}

export interface WatchHistoryWithProgress extends WatchHistory {
  progress_percent: number;
}

export interface SaveProgressPayload {
  subject_id: string;
  subject_type: number;
  title: string;
  cover_url?: string;
  current_episode?: number;
  total_episodes?: number;
  progress_seconds: number;
  duration_seconds: number;
  completed?: boolean;
}

export interface ContinueWatchingItem {
  id: string;
  subject_id: string;
  subject_type: number;
  title: string;
  cover_url: string | null;
  current_episode: number;
  total_episodes: number | null;
  progress_seconds: number;
  duration_seconds: number;
  progress_percent: number;
  last_watched_at: string;
}

export interface NextEpisodeInfo {
  hasNext: boolean;
  nextEpisode?: number;
  episodeInfo?: {
    title: string;
    thumbnail: string;
    duration: number;
  };
}
