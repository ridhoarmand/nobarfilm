import { AnimeResponse, Anime, Episode, Schedule, Genre } from '@/types/anime';const API_BASE_URL = process.env.NEXT_ANIME_API_BASE_URL || 'http://localhost:8000';

export class AnimeApi {
  private static async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (process.env.NEXT_ANIME_API_KEY) {
      headers['x-api-key'] = process.env.NEXT_ANIME_API_KEY;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      throw new Error(`Anime API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  }

  static async getOngoing(page = 1) {
    return this.fetch<AnimeResponse<Anime[]>>(`/ongoing?page=${page}`, { next: { revalidate: 60 } });
  }

  static async getCompleted(page = 1) {
    return this.fetch<AnimeResponse<Anime[]>>(`/completed?page=${page}`, { next: { revalidate: 60 } });
  }

  static async getSearch(query: string) {
    return this.fetch<AnimeResponse<Anime[]>>(`/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
  }

  static async getAnimeList(page = 1, initial = 'A') {
    return this.fetch<AnimeResponse<Anime[]>>(`/anime-list?page=${page}&initial=${encodeURIComponent(initial)}`, { next: { revalidate: 3600 } });
  }

  static async getDetail(slug: string) {
    return this.fetch<AnimeResponse<Anime>>(`/anime/${slug}`, { next: { revalidate: 60 } });
  }

  static async getEpisode(slug: string) {
    return this.fetch<AnimeResponse<Episode>>(`/episode/${slug}`, { next: { revalidate: 60 } });
  }

  static async getSchedule() {
    return this.fetch<AnimeResponse<Schedule>>(`/schedule`, { next: { revalidate: 3600 } }); // Cache hourly
  }

  static async getGenres() {
    return this.fetch<AnimeResponse<Genre[]>>(`/genres`, { next: { revalidate: 86400 } });
  }

  static async getByGenre(genre: string, page = 1) {
    return this.fetch<AnimeResponse<Anime[]>>(`/genres/${genre}?page=${page}`, { next: { revalidate: 300 } });
  }
}
