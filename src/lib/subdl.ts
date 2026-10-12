import { randomUUID } from 'node:crypto';
import { cacheKeys, cacheTTL, serverCache } from './cache';
import { ApiError } from './fetcher';
import type {
  OtherSubtitleDownload,
  OtherSubtitleResult,
  OtherSubtitleTitle,
} from '../types/other-subtitles';

const API_ORIGIN = 'https://api.subdl.com';
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const messages = {
  400: 'Permintaan subtitle tidak valid.',
  410: 'Hasil pencarian kedaluwarsa. Cari kembali.',
  422: 'File subtitle tidak dapat digunakan. Pilih hasil lain.',
  429: 'Kuota subtitle penyedia sedang habis. Coba lagi setelah kuota tersedia.',
  502: 'Penyedia subtitle tidak dapat dihubungi. Coba lagi.',
  503: 'Subtitle eksternal belum dikonfigurasi.',
};
type ErrorStatus = keyof typeof messages;
type MediaType = OtherSubtitleTitle['type'];
type DownloadTicket = {
  providerId: string;
  parentId: string;
  release: string;
  type: MediaType;
  season?: number;
  episode?: number;
};

const inflightDownloads = new Map<string, Promise<string>>();

function fail(status: ErrorStatus): never {
  throw new ApiError(messages[status], status);
}

function apiKey(): string {
  const key = process.env.SUBDL_API_KEY?.trim();
  if (!key) fail(503);
  return key;
}

function key(namespace: string, params: string): string {
  return cacheKeys.apiResponse(`subdl:${namespace}`, params);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(502);
  return value as Record<string, unknown>;
}

function guardedUrl(url: URL): void {
  if (url.protocol !== 'https:' || url.username || url.password ||
      (url.port && url.port !== '443') ||
      (url.hostname !== 'api.subdl.com' && url.hostname !== 'dl.subdl.com')) fail(502);
}

async function readBytes(response: Response, limit: number, status: ErrorStatus): Promise<Uint8Array> {
  if (!response.body) fail(status);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        fail(status);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function providerBytes(path: string, params: URLSearchParams, download = false): Promise<Uint8Array> {
  const secret = apiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    let url = new URL(path, API_ORIGIN);
    url.search = params.toString();
    for (let redirects = 0; ; redirects++) {
      guardedUrl(url);
      const headers = new Headers();
      if (url.hostname === 'api.subdl.com') headers.set('Authorization', `Bearer ${secret}`);
      const response = await fetch(url, { headers, signal: controller.signal, redirect: 'manual' });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get('Location');
        if (!location || redirects >= 3) fail(502);
        url = new URL(location, url);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 401) fail(503);
        if (response.status === 429) fail(429);
        if (download && (response.status === 403 || response.status === 409)) fail(422);
        fail(502);
      }
      if (download) {
        const contentType = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
        if (contentType && !['application/octet-stream', 'application/x-subrip', 'application/srt',
          'text/plain', 'text/vtt', 'text/srt', 'text/x-subrip'].includes(contentType)) {
          await response.body?.cancel();
          fail(422);
        }
      }
      return await readBytes(response, download ? 1024 * 1024 : 2 * 1024 * 1024, download ? 422 : 502);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    fail(502);
  } finally {
    clearTimeout(timeout);
  }
}

async function providerJson(path: string, params: URLSearchParams): Promise<Record<string, unknown>> {
  const bytes = await providerBytes(path, params);
  try {
    return record(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    fail(502);
  }
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function validateType(type: MediaType): void {
  if (type !== 'movie' && type !== 'tv') fail(400);
}

export async function searchSubdlTitles(query: string, type: MediaType): Promise<OtherSubtitleTitle[]> {
  apiKey();
  validateType(type);
  if (typeof query !== 'string') fail(400);
  query = query.trim();
  if (query.length < 2 || query.length > 150) fail(400);
  const cacheKey = key('titles', `${type}:${encodeURIComponent(query)}`);
  let titles = serverCache.get<OtherSubtitleTitle[]>(cacheKey);
  if (!titles) {
    const payload = await providerJson('/api/v2/movies/search', new URLSearchParams({ q: query, type, limit: '10' }));
    if (!Array.isArray(payload.results) || payload.status === false) fail(502);
    titles = payload.results.map((value): OtherSubtitleTitle => {
      const row = record(value);
      if (typeof row.sd_id !== 'string' || !ID.test(row.sd_id) ||
          typeof row.name !== 'string' || !row.name.trim() ||
          (row.type !== 'movie' && row.type !== 'tv') ||
          (row.year != null && !positiveInteger(row.year))) fail(502);
      return { id: row.sd_id, title: row.name, type: row.type, year: row.year == null ? null : row.year as number };
    }).filter((title) => title.type === type);
    serverCache.set(cacheKey, titles, cacheTTL.API_RESPONSE);
  }
  for (const title of titles) {
    serverCache.set(key('candidate', `${title.type}:${title.id}`), title, cacheTTL.API_RESPONSE);
  }
  return titles;
}

function mapSubtitle(value: unknown, type: MediaType, season?: number, episode?: number): DownloadTicket | null {
  const row = record(value);
  if (row.language !== 'ID' || row.full_season === true) return null;
  if (!Array.isArray(row.unpack_files)) fail(502);
  // Search can unpack only the requested episode from a larger archive; that parent still cannot serve format=file.
  if (row.unpack_files.length !== 1) return null;
  const file = record(row.unpack_files[0]);
  if (file.language !== 'ID' || file.from_pack === true) return null;
  if (file.format != null && (typeof file.format !== 'string' || !['srt', 'vtt'].includes(file.format.toLowerCase()))) return null;
  if (typeof file.name === 'string' && /\.(?:ass|ssa|zip|rar|7z)$/i.test(file.name)) return null;
  if (type === 'tv') {
    const fileSeason = positiveInteger(file.season) ? file.season : row.season;
    const fileEpisode = positiveInteger(file.episode) ? file.episode : row.episode;
    if (fileSeason !== season || fileEpisode !== episode ||
        (positiveInteger(row.season) && row.season !== season) ||
        (positiveInteger(row.episode) && row.episode !== episode) ||
        (positiveInteger(row.episode_from) && row.episode_from !== episode) ||
        (positiveInteger(row.episode_end) && row.episode_end !== episode)) return null;
  } else if ([row.season, row.episode, row.episode_from, row.episode_end, file.season, file.episode].some(positiveInteger)) {
    return null;
  }
  if (typeof row.subtitlePage !== 'string') fail(502);
  const match = /^\/s\/info\/([A-Za-z0-9_-]{1,64})\/?$/.exec(row.subtitlePage);
  if (!match || typeof file.file_n_id !== 'string' || !ID.test(file.file_n_id)) fail(502);
  const release = typeof file.release_name === 'string' && file.release_name.trim()
    ? file.release_name : row.release_name;
  if (typeof release !== 'string' || !release.trim()) fail(502);
  return { providerId: `${match[1]}:${file.file_n_id}`, parentId: match[1], release, type, season, episode };
}

export async function searchSubdlSubtitles(
  titleId: string, type: MediaType, season?: number, episode?: number,
): Promise<OtherSubtitleResult[]> {
  apiKey();
  validateType(type);
  if (typeof titleId !== 'string' || !ID.test(titleId) ||
      (type === 'tv' && (!positiveInteger(season) || !positiveInteger(episode))) ||
      (type === 'movie' && (season !== undefined || episode !== undefined))) fail(400);
  if (!serverCache.get<OtherSubtitleTitle>(key('candidate', `${type}:${titleId}`))) fail(410);
  const cacheKey = key('subtitles', `${type}:${titleId}:${season ?? ''}:${episode ?? ''}`);
  let files = serverCache.get<DownloadTicket[]>(cacheKey);
  if (!files) {
    const params = new URLSearchParams({ sd_id: titleId, type, languages: 'ID', unpack: '1' });
    if (type === 'tv') {
      params.set('season', String(season));
      params.set('episode', String(episode));
    }
    const payload = await providerJson('/api/v2/subtitles/search', params);
    if (payload.status !== true || !Array.isArray(payload.subtitles)) fail(502);
    const unique = new Map<string, DownloadTicket>();
    for (const row of payload.subtitles) {
      const file = mapSubtitle(row, type, season, episode);
      if (file) unique.set(file.providerId, file);
    }
    files = Array.from(unique.values());
    serverCache.set(cacheKey, files, cacheTTL.API_RESPONSE);
  }
  return files.map((file) => {
    const token = randomUUID();
    serverCache.set(key('ticket', token), file, cacheTTL.API_RESPONSE);
    return { id: file.providerId, token, release: file.release, language: 'id' };
  });
}

function subtitleText(bytes: Uint8Array): string {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) fail(422);
  let encoding = 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
  if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';
  let text: string;
  try {
    text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch {
    fail(422);
  }
  if (!text.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text) ||
      /<(?:!doctype\s+html|html|head|body|script)\b/i.test(text) ||
      !/^(?:(?:\d{2,}:)?[0-5]\d:[0-5]\d)[,.]\d{3}[ \t]+-->[ \t]+(?:(?:\d{2,}:)?[0-5]\d:[0-5]\d)[,.]\d{3}(?:[ \t].*)?\r?$/m.test(text)) fail(422);
  return text;
}

export async function downloadSubdlSubtitle(token: string): Promise<OtherSubtitleDownload> {
  apiKey();
  if (typeof token !== 'string' || !UUID.test(token)) fail(400);
  const ticket = serverCache.get<DownloadTicket>(key('ticket', token));
  if (!ticket) fail(410);
  const cacheKey = key('file', ticket.providerId);
  let text = serverCache.get<string>(cacheKey);
  if (text === null) {
    let request = inflightDownloads.get(ticket.providerId);
    if (!request) {
      request = (async () => {
        try {
          const bytes = await providerBytes(`/api/v2/subtitles/${ticket.parentId}/download`, new URLSearchParams({ format: 'file' }), true);
          const content = subtitleText(bytes);
          serverCache.set(cacheKey, content, cacheTTL.API_RESPONSE);
          return content;
        } finally {
          inflightDownloads.delete(ticket.providerId);
        }
      })();
      inflightDownloads.set(ticket.providerId, request);
    }
    text = await request;
  }
  return { label: `Indonesia · SubDL · ${ticket.release}`, text };
}
