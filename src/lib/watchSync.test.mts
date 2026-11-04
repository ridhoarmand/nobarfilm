import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, fromEntry, mergeHistory, toEntry, videoKey, type WatchEntry } from './watchSync';
import type { ContinueWatchingItem } from '../types/watch-history';

const iso = (ms: number) => new Date(ms).toISOString();

const episode = (n: number, positionMs: number, durationMs: number, updatedAt: number): WatchEntry => ({
  subject: {
    subjectId: 's1', title: 'Drama', coverUrl: 'c.jpg', genre: '', durationMinutes: 0, releaseYear: '',
    rating: '', description: '', subjectType: 2, coverHorizontalUrl: '', dubs: [],
  },
  season: 1, episode: n, episodeCount: 3, positionMs, durationMs, updatedAt,
});

const localMovie = (updatedAt: number): ContinueWatchingItem => ({
  id: 'm1', subject_id: 'm1', subject_type: 1, title: 'Film', cover_url: null, current_season: 0,
  current_episode: 0, total_episodes: null, progress_seconds: 600, duration_seconds: 6000,
  progress_percent: 10, last_watched_at: iso(updatedAt),
});

test('video key matches the app (nobarVideoKey)', () => {
  assert.equal(videoKey('m1', null, null), 'nobar_m1');
  assert.equal(videoKey('s1', 2, 5), 'nobar_s1_s2_e5');
});

test('a movie round-trips with ms times and null season/episode, like the app', () => {
  const entry = toEntry(localMovie(1_000_000));
  assert.equal(entry.episode, null);
  assert.equal(entry.season, null);
  assert.equal(entry.positionMs, 600_000);
  assert.equal(entry.updatedAt, 1_000_000);
  assert.deepEqual(fromEntry(entry), { ...localMovie(1_000_000), id: 'm1' });
});

test('finished episode advances to the next one; finished last episode or movie disappears', () => {
  assert.equal(advance(episode(1, 99_000, 100_000, 1))?.episode, 2);
  assert.equal(advance(episode(1, 99_000, 100_000, 1))?.positionMs, 0);
  assert.equal(advance(episode(3, 99_000, 100_000, 1)), null);
  assert.equal(advance(episode(2, 50_000, 100_000, 1))?.episode, 2);
});

test('newest updatedAt per title wins; local wins ties and newer local progress', () => {
  const remote = [episode(1, 10_000, 100_000, 100), episode(2, 20_000, 100_000, 200)];
  const merged = mergeHistory([localMovie(50)], remote);
  assert.deepEqual(merged.map((m) => [m.subject_id, m.current_episode, m.progress_seconds]), [['m1', 0, 600], ['s1', 2, 20]]);

  const newerLocal = { ...fromEntry(episode(3, 5_000, 100_000, 300)) };
  assert.equal(mergeHistory([newerLocal], remote)[0].current_episode, 3);
});

test('a title finished on the phone is removed from the web list', () => {
  const finishedMovie = toEntry(localMovie(500));
  finishedMovie.positionMs = finishedMovie.durationMs;
  assert.deepEqual(mergeHistory([localMovie(100)], [finishedMovie]), []);
});
