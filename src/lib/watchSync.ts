import type { ContinueWatchingItem } from '@/types/watch-history';
import { getSupabase } from './supabaseClient';

/**
 * Progres tonton tersinkron dengan aplikasi NontonYuk lewat tabel Supabase `watch_progress`
 * (skema: nonton-yuk/supabase/watch_progress.sql). Satu baris per video; `entry` berformat
 * `WatchEntry.toMap()` milik aplikasi (lib/nobar.dart), waktu dalam milidetik.
 * Riwayat lokal tetap `ContinueWatchingItem`; konversi hanya terjadi di sini.
 */
export interface WatchEntry {
  subject: {
    subjectId: string;
    title: string;
    coverUrl: string;
    genre: string;
    durationMinutes: number;
    releaseYear: string;
    rating: string;
    description: string;
    subjectType: number;
    coverHorizontalUrl: string;
    dubs: unknown[];
  };
  season: number | null;
  episode: number | null;
  episodeCount: number;
  positionMs: number;
  durationMs: number;
  updatedAt: number;
}

export const HISTORY_KEY = 'nobarfilm_watch_history';
const MAX_ITEMS = 15;

/** Sama dengan `nobarVideoKey` di aplikasi. */
export function videoKey(subjectId: string, season: number | null, episode: number | null): string {
  return episode == null ? `nobar_${subjectId}` : `nobar_${subjectId}_s${season ?? 0}_e${episode}`;
}

const timeOf = (item: ContinueWatchingItem) => Date.parse(item.last_watched_at) || 0;

export function toEntry(item: ContinueWatchingItem): WatchEntry {
  const series = item.subject_type === 2;
  return {
    subject: {
      subjectId: item.subject_id,
      title: item.title,
      coverUrl: item.cover_url ?? '',
      genre: '',
      durationMinutes: 0,
      releaseYear: '',
      rating: '',
      description: '',
      subjectType: item.subject_type,
      coverHorizontalUrl: '',
      dubs: [],
    },
    season: series ? (item.current_season ?? 1) : null,
    episode: series ? item.current_episode : null,
    episodeCount: Math.max(1, item.total_episodes ?? 1),
    positionMs: Math.round(item.progress_seconds * 1000),
    durationMs: Math.round(item.duration_seconds * 1000),
    updatedAt: timeOf(item),
  };
}

export function fromEntry(entry: WatchEntry): ContinueWatchingItem {
  const series = entry.episode != null;
  const progress = Math.floor(entry.positionMs / 1000);
  const duration = Math.floor(entry.durationMs / 1000);
  return {
    id: entry.subject.subjectId,
    subject_id: entry.subject.subjectId,
    subject_type: entry.subject.subjectType || (series ? 2 : 1),
    title: entry.subject.title,
    cover_url: entry.subject.coverUrl || null,
    current_season: series ? (entry.season ?? 1) : 0,
    current_episode: series ? (entry.episode as number) : 0,
    total_episodes: series ? entry.episodeCount : null,
    progress_seconds: progress,
    duration_seconds: duration,
    progress_percent: duration > 0 ? Math.round((progress / duration) * 100) : 0,
    last_watched_at: new Date(entry.updatedAt).toISOString(),
  };
}

/** Port `WatchHistory.advance`: selesai (≤3 dtk sebelum akhir) = episode berikutnya, atau hilang. */
export function advance(entry: WatchEntry): WatchEntry | null {
  const finished = entry.durationMs > 0 && entry.positionMs >= entry.durationMs - 3000;
  if (!finished) return entry;
  if (entry.episode == null || entry.episode >= entry.episodeCount) return null;
  return { ...entry, episode: entry.episode + 1, positionMs: 0, durationMs: 0 };
}

/**
 * Port `WatchHistory.mergeHistory`: per judul, baris remote terbaru menang bila lebih baru dari lokal.
 * Hasil urut lama → baru (format penyimpanan lokal), maksimal 15 item.
 */
export function mergeHistory(local: ContinueWatchingItem[], remote: WatchEntry[]): ContinueWatchingItem[] {
  const latest = new Map<string, WatchEntry>();
  for (const entry of remote) {
    const id = entry.subject?.subjectId;
    if (!id) continue;
    const have = latest.get(id);
    if (!have || entry.updatedAt > have.updatedAt) latest.set(id, entry);
  }
  const bySubject = new Map(local.map((item) => [item.subject_id, item]));
  for (const [id, row] of latest) {
    const mine = bySubject.get(id);
    if (mine && timeOf(mine) >= row.updatedAt) continue;
    const next = advance(row);
    if (next) bySubject.set(id, fromEntry(next));
    else bySubject.delete(id);
  }
  return [...bySubject.values()].sort((a, b) => timeOf(a) - timeOf(b)).slice(-MAX_ITEMS);
}

async function signedInClient() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ? supabase : null;
}

/** Kirim progres satu video. [completed] = ditandai selesai agar perangkat lain ikut maju/menghapusnya. */
export async function pushProgress(item: ContinueWatchingItem, completed: boolean): Promise<void> {
  try {
    const supabase = await signedInClient();
    if (!supabase) return;
    const entry = toEntry(item);
    if (completed) entry.positionMs = entry.durationMs;
    await supabase.from('watch_progress').upsert(
      {
        video_key: videoKey(item.subject_id, entry.season, entry.episode),
        subject_id: item.subject_id,
        entry,
        updated_at: entry.updatedAt,
      },
      { onConflict: 'user_id,video_key' },
    );
  } catch {
    // Sinkron hanya pelengkap; gagal kirim tidak mengganggu pemutaran.
  }
}

const lastPullAt = new Map<string, number>();

/**
 * Tarik progres dari HP/peramban lain lalu gabungkan ke riwayat lokal.
 * Paling sering tiap 30 dtk per cakupan; true bila riwayat lokal berubah.
 */
export async function syncFromRemote(subjectId?: string): Promise<boolean> {
  try {
    const supabase = await signedInClient();
    if (!supabase) return false;
    // Batas dihitung setelah login dicek, supaya tarikan pertama sesudah login tidak terlewat.
    const scope = subjectId ?? '*';
    const now = Date.now();
    if (now - (lastPullAt.get(scope) ?? 0) < 30_000) return false;
    lastPullAt.set(scope, now);
    const base = supabase.from('watch_progress').select('entry');
    const { data, error } = await (subjectId ? base.eq('subject_id', subjectId) : base)
      .order('updated_at', { ascending: false })
      .limit(300);
    if (error || !data?.length) return false;
    const remote = data.map((row) => row.entry as WatchEntry).filter((entry) => entry && typeof entry === 'object');
    const raw = localStorage.getItem(HISTORY_KEY);
    let local: ContinueWatchingItem[] = [];
    try {
      local = raw ? (JSON.parse(raw) as ContinueWatchingItem[]) : [];
    } catch {}
    const merged = JSON.stringify(mergeHistory(local, remote));
    if (merged === (raw ?? '[]')) return false;
    localStorage.setItem(HISTORY_KEY, merged);
    return true;
  } catch {
    return false;
  }
}

/** Sesudah login: kirim riwayat lokal yang sudah ada agar ikut muncul di HP. */
export async function pushLocalHistory(): Promise<void> {
  let local: ContinueWatchingItem[] = [];
  try {
    local = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as ContinueWatchingItem[];
  } catch {}
  await Promise.all(local.map((item) => pushProgress(item, false)));
}
