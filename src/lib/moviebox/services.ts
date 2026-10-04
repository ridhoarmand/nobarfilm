import crypto from 'crypto';
import { serverCache, cacheKeys, cacheTTL } from '../cache';
import {
  HomepageResponse,
  TrendingResponse,
  DetailResponse,
  SourcesResponse,
  SearchResponse,
  Subject,
  SubjectType,
  OperatingSection,
  Season,
  Caption,
} from '@/types/api';
import {
  HOST,
  ALLOWED_SUBJECT_TYPES,
  WEB_REFERER_ORIGIN,
  H5_PATH_PREFIX,
  H5_SEARCH_REFERER,
  PLACEHOLDER_PATH_MARKERS,
  MIN_REAL_DURATION_SECONDS,
} from './config';
import { normalizeSubject, filterSubjects, isAdultContent } from './normalizers';
import { callMobileApi } from './client';
import { h5Fetch } from './webClient';

// allow: SIZE_OK — task scope restricts edits to this single file; the auth block
// (loginUser..registerUser below) is the part that would move to its own module first.
function parseStreamResolution(item: any, parentTitle?: string): number {
  const rawRes = parseInt(String(item.resolutions || item.resolution || 0), 10);
  if (!isNaN(rawRes) && rawRes > 0) return rawRes;

  const candidates = [item.title, parentTitle, item.url];
  for (const text of candidates) {
    if (typeof text === 'string') {
      const match = text.match(/(\d{3,4})[pP]?/);
      if (match) {
        const val = parseInt(match[1], 10);
        if ([240, 360, 480, 540, 720, 1080, 1440, 2160].includes(val)) {
          return val;
        }
      }
    }
  }

  return 360;
}

// Provider-parity sections via POST /subject/filter (flat body: tabId + classify/country/
// genre/year/sort). Discovered from the H5 site SSR payload + live-verified with diverse
// results (see .omo/evidence/ — Anime: Slime/Bleach/AoT, Hollywood: Avengers/TWD).
const HOMEPAGE_SECTIONS: Array<{ title: string; filter: { tabId: number; classify?: string; country?: string; genre?: string } }> = [
  { title: 'Film Trending', filter: { tabId: 2 } },
  { title: 'Film Indonesia', filter: { tabId: 2, country: 'Indonesia' } },
  { title: 'Anime', filter: { tabId: 5, genre: 'Anime' } },
  { title: 'Serial Korea', filter: { tabId: 5, country: 'Korea' } },
  { title: 'Hollywood', filter: { tabId: 2, country: 'United States' } },
  { title: 'Drama China', filter: { tabId: 5, country: 'China' } },
];

// H5 bundle has a /ranking-list route but it is network-unverified — the ranking route
// serves the Hottest-movies filter instead, with keyword search as fallback.
const RANKING_KEYWORD = 'trending';

// Load-bearing referer shape (.omo/evidence/host-referer-matrix.md rows 5-7): /movies/ +
// type=/movie/detail + EMPTY detailSe/detailEp on the WEB_REFERER_ORIGIN host.
function movieReferer(subjectId: string, detailPath: string): string {
  return `${WEB_REFERER_ORIGIN}/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=`;
}

function toSubjects(raw: any): Subject[] {
  if (!Array.isArray(raw)) return [];
  const seenTitles = new Set<string>();
  const seenIds = new Set<string>();
  const out: Subject[] = [];
  for (const sub of raw.map((s: any) => normalizeSubject(s)).filter(
    (s: Subject) => ALLOWED_SUBJECT_TYPES.has(s.subjectType) && !isAdultContent(s) && s.hasResource !== false,
  )) {
    // H5 search returns per-season/per-dub rows: S1/S2/S3 share one subjectId AND the
    // same show can appear under a second catalog id. Dedup by title, then by id.
    const t = sub.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (t && seenTitles.has(t)) continue;
    if (seenIds.has(sub.subjectId)) continue;
    seenTitles.add(t);
    seenIds.add(sub.subjectId);
    out.push(sub);
  }
  return out;
}

/** H5 search (POST /subject/search, h5 referer REQUIRED per host-referer-matrix) → SearchResponse. */
async function h5SearchResponse(keyword: string, page: number, perPage: number): Promise<SearchResponse> {
  const json: any = await h5Fetch('/subject/search', {
    method: 'POST',
    body: { keyword, page, perPage },
    referer: H5_SEARCH_REFERER,
  });
  if (json?.code !== 0) {
    throw new Error(`H5 search error: ${json?.message || 'unknown error'}`);
  }
  const parsed = toSubjects(json.data?.items);
  const pager = json.data?.pager || {};
  return {
    items: parsed,
    pager: {
      hasMore: pager.hasMore ?? parsed.length >= perPage,
      nextPage: String(pager.nextPage || page + 1),
      page: String(page),
      perPage,
      totalCount: typeof pager.totalCount === 'number' ? pager.totalCount : parsed.length,
    },
    counts: [
      {
        subjectType: SubjectType.Movie,
        name: 'Movie',
        num: parsed.filter((item) => item.subjectType === SubjectType.Movie).length,
      },
      {
        subjectType: SubjectType.Series,
        name: 'Series',
        num: parsed.filter((item) => item.subjectType === SubjectType.Series).length,
      },
    ],
    url: `${WEB_REFERER_ORIGIN}${H5_PATH_PREFIX}/subject/search?keyword=${encodeURIComponent(keyword)}`,
    referer: `${WEB_REFERER_ORIGIN}/`,
  };
}

export const movieBoxService = {
  async loginUser(email: string, passwordPlain: string, clientIp?: string | null): Promise<any> {
    const md5Password = crypto.createHash('md5').update(passwordPlain).digest('hex');
    const payload = {
      authType: 1,
      mail: email,
      password: md5Password,
      package_name: 'com.moviebox.android',
    };

    const response = await callMobileApi(
      'POST',
      '/wefeed-mobile-bff/user-api/login',
      { host: HOST },
      payload,
      false,
      null,
      clientIp
    );

    return response;
  },

  async getUserInfo(userId: string, clientToken: string): Promise<any> {
    const response = await callMobileApi(
      'GET',
      '/wefeed-mobile-bff/user-api/info',
      { host: HOST, userId },
      null,
      false,
      clientToken
    );

    return response;
  },

  async checkMailAccount(email: string, clientIp?: string | null): Promise<any> {
    const payload = {
      authType: 1,
      mail: email,
      package_name: 'com.moviebox.android',
    };
    return await callMobileApi(
      'POST',
      '/wefeed-mobile-bff/user-api/check-mail-account',
      { host: HOST },
      payload,
      false,
      null,
      clientIp
    );
  },

  async getSmsCode(email: string, type: number = 1, clientIp?: string | null): Promise<any> {
    const payload = {
      authType: 1,
      mail: email,
      type: type,
      package_name: 'com.moviebox.android',
    };
    return await callMobileApi(
      'POST',
      '/wefeed-mobile-bff/user-api/get-sms-code',
      { host: HOST },
      payload,
      false,
      null,
      clientIp
    );
  },

  async checkSmsCode(email: string, code: string, clientIp?: string | null): Promise<any> {
    const payload = {
      authType: 1,
      mail: email,
      verificationCode: code,
      package_name: 'com.moviebox.android',
    };
    return await callMobileApi(
      'POST',
      '/wefeed-mobile-bff/user-api/check-sms-code',
      { host: HOST },
      payload,
      false,
      null,
      clientIp
    );
  },

  async registerUser(
    email: string,
    code: string,
    passwordPlain: string,
    inviteCode: string = '',
    clientIp?: string | null
  ): Promise<any> {
    const md5Password = crypto.createHash('md5').update(passwordPlain).digest('hex');
    const payload = {
      authType: 1,
      mail: email,
      verificationCode: code,
      password: md5Password,
      inviteCode: inviteCode,
      package_name: 'com.moviebox.android',
    };
    return await callMobileApi(
      'POST',
      '/wefeed-mobile-bff/user-api/register',
      { host: HOST },
      payload,
      false,
      null,
      clientIp
    );
  },

  async getHomepage(_clientToken?: string | null): Promise<HomepageResponse> {
    const key = cacheKeys.apiResponse('homepage', 'h5');
    const cached = serverCache.get<HomepageResponse>(key);
    if (cached) return cached;

    console.log(`[MovieBox SDK] Building H5 filter homepage (${HOMEPAGE_SECTIONS.length} sections)`);
    const sections = await Promise.all(
      HOMEPAGE_SECTIONS.map(async (section) => {
        try {
          const json: any = await h5Fetch('/subject/filter', {
            method: 'POST',
            body: { classify: 'All', country: 'All', genre: 'All', year: 'All', sort: 'Hottest', page: 1, perPage: 20, ...section.filter },
          });
          return { ...section, subjects: json?.code === 0 ? toSubjects(json.data?.items ?? json.data?.list) : [] };
        } catch (err: any) {
          console.warn(`[MovieBox SDK] Homepage section "${section.title}" failed:`, err.message);
          return { ...section, subjects: [] as Subject[] };
        }
      })
    );

    const operatingList: OperatingSection[] = [];
    const subjectsList: Subject[] = [];
    const seenTitles = new Set<string>();
    let pos = 0;
    for (const section of sections) {
      const fresh = section.subjects.filter((s) => !seenTitles.has(s.title.toLowerCase()));
      if (fresh.length === 0) continue;
      fresh.forEach((s) => seenTitles.add(s.title.toLowerCase()));
      subjectsList.push(...fresh);
      operatingList.push({ type: 'SUBJECTS_MOVIE', position: pos++, title: section.title, subjects: fresh });
    }
    if (subjectsList.length === 0) {
      throw new Error('H5 homepage gagal: semua section filter kosong.');
    }

    const data: HomepageResponse = {
      topPickList: operatingList[0]?.subjects?.slice(0, 8) ?? [],
      homeList: operatingList,
      url: `${WEB_REFERER_ORIGIN}/`,
      referer: `${WEB_REFERER_ORIGIN}/`,
      allPlatform: [],
      banner: null,
      live: null,
      platformList: [],
      shareParam: null,
      operatingList,
    };

    serverCache.set(key, data, cacheTTL.API_RESPONSE);
    return data;
  },

  async getRankingList(categoryType: string, page: number = 1, perPage: number = 20): Promise<SearchResponse> {
    const BLOCKED_CATEGORY_IDS = new Set([
      '562771270434276240', // Bromance
      '638000603330921096', // Girls Love Story
    ]);

    if (BLOCKED_CATEGORY_IDS.has(String(categoryType))) {
      throw new Error('Akses Terbatas: Kategori ini tidak tersedia.');
    }

    const safePerPage = Math.min(Math.max(1, perPage), 20);
    const key = cacheKeys.apiResponse('ranking-list', `curated&p=${page}&pp=${safePerPage}`);
    const cached = serverCache.get<SearchResponse>(key);
    if (cached) return cached;

    const data = await h5SearchResponse(RANKING_KEYWORD, page, safePerPage);
    serverCache.set(key, data, cacheTTL.API_RESPONSE);
    return data;
  },

  async getTrending(page: number = 0, clientToken?: string | null): Promise<TrendingResponse> {
    const key = cacheKeys.apiResponse('trending', `page=${page}`);
    const cached = serverCache.get<TrendingResponse>(key);
    if (cached) return cached;

    const homepage = await this.getHomepage(clientToken);
    const combined = filterSubjects(
      homepage.operatingList.flatMap((section) => section.subjects || []).filter(Boolean)
    );

    const pageSize = 24;
    const offset = Math.max(0, page) * pageSize;
    const data: TrendingResponse = {
      subjectList: combined.slice(offset, offset + pageSize),
      pager: {
        hasMore: offset + pageSize < combined.length,
        nextPage: String(page + 1),
        page: String(page),
        perPage: pageSize,
        totalCount: combined.length,
      },
    };

    serverCache.set(key, data, cacheTTL.API_RESPONSE);
    return data;
  },

  async search(query: string, page: number = 1, _clientToken?: string | null): Promise<SearchResponse> {
    const key = cacheKeys.apiResponse('search', `q=${query}&p=${page}`);
    const cached = serverCache.get<SearchResponse>(key);
    if (cached) return cached;

    const data = await h5SearchResponse(query, page, 20);
    serverCache.set(key, data, cacheTTL.API_RESPONSE);
    return data;
  },

  async getDetail(subjectId: string, _clientToken?: string | null): Promise<DetailResponse> {
    const key = cacheKeys.apiResponse('detail', subjectId);
    const cached = serverCache.get<DetailResponse>(key);
    if (cached) return cached;

    console.log(`[MovieBox SDK] Fetching H5 detail for ${subjectId}`);
    const json: any = await h5Fetch('/detail', { query: { subjectId } });
    if (json?.code !== 0 || !json?.data?.subject?.subjectId) {
      throw new Error(`Judul dengan id ${subjectId} tidak ada di katalog web (${json?.message || 'tanpa pesan'}).`);
    }

    const rawSubject = json.data.subject;
    const subject = normalizeSubject(rawSubject);
    if (isAdultContent(rawSubject) || isAdultContent(subject)) {
      throw new Error('Akses Terbatas: Konten dari sumber ini tidak tersedia.');
    }

    const rawSeasons = Array.isArray(json.data.resource?.seasons) ? json.data.resource.seasons : [];
    const seasons: Season[] = rawSeasons.map((se: any) => ({
      se: typeof se.se === 'number' ? se.se : 1,
      maxEp: typeof se.maxEp === 'number' ? se.maxEp : 1,
      allEp: String(se.allEp || ''),
      resolutions: Array.isArray(se.resolutions)
        ? se.resolutions.map((res: any) => ({
            resolution: typeof res.resolution === 'number' ? res.resolution : 480,
            epNum: typeof res.epNum === 'number' ? res.epNum : 1,
          }))
        : [],
    }));
    if (seasons.length === 0) {
      seasons.push(
        subject.subjectType === SubjectType.Series
          ? { se: 1, maxEp: 1, allEp: '1', resolutions: [] }
          : { se: 0, maxEp: 0, allEp: '1', resolutions: [] }
      );
    }

    const webDetailUrl = `${WEB_REFERER_ORIGIN}/movies/${subject.h5DetailPath || subjectId}?id=${subjectId}`;
    const data: DetailResponse = {
      subject,
      stars: Array.isArray(json.data.stars) ? json.data.stars : subject.staffList || [],
      resource: {
        seasons,
        source: String(json.data.resource?.source || '') || (subject.hasResource ? 'moviebox-stream' : ''),
        uploadBy: String(json.data.resource?.uploadBy || '') || 'community',
      },
      metadata: {
        title: subject.title,
        description: subject.description || '',
        image: subject.cover.url,
        url: webDetailUrl,
        referer: `${WEB_REFERER_ORIGIN}/`,
      },
      url: webDetailUrl,
      referer: `${WEB_REFERER_ORIGIN}/`,
      isForbid: json.data.isForbid === true,
      watchTimeLimit: typeof json.data.watchTimeLimit === 'number' ? json.data.watchTimeLimit : 0,
    };

    serverCache.set(key, data, cacheTTL.API_RESPONSE * 2);
    return data;
  },

  async getSources(
    subjectId: string,
    season?: number,
    episode?: number,
    _clientToken?: string | null
  ): Promise<SourcesResponse> {
    const detail = await this.getDetail(subjectId);
    const isSeries = detail.subject.subjectType === SubjectType.Series;

    let resolvedSeason = typeof season === 'number' && Number.isFinite(season) ? season : isSeries ? 1 : 0;
    let resolvedEpisode = typeof episode === 'number' && Number.isFinite(episode) ? episode : resolvedSeason === 0 ? 0 : 1;
    if (resolvedSeason === 0) resolvedEpisode = 0;
    if (resolvedSeason < 0) resolvedSeason = 0;
    if (resolvedEpisode < 0) resolvedEpisode = 0;

    const key = cacheKeys.apiResponse('sources', `${subjectId}:se=${resolvedSeason}&ep=${resolvedEpisode}`);
    const cached = serverCache.get<SourcesResponse>(key);
    if (cached && cached.hasResource) return cached;

    const detailPath = detail.subject.h5DetailPath;
    if (!detailPath) {
      throw new Error(`Judul ${subjectId} tidak memiliki detailPath di katalog web.`);
    }

    console.log(`[MovieBox SDK] Fetching H5 subject/play for ${subjectId} se=${resolvedSeason} ep=${resolvedEpisode}`);
    const json: any = await h5Fetch('/subject/play', {
      query: { subjectId, se: String(resolvedSeason), ep: String(resolvedEpisode), detailPath },
      referer: movieReferer(subjectId, detailPath),
    });
    if (json?.code !== 0) {
      throw new Error(`H5 play error: ${json?.message || 'unknown error'}`);
    }
    const rawStreams: any[] = Array.isArray(json.data?.streams) ? json.data.streams : [];

    const filtered = rawStreams.filter((item: any) => {
      const isTrailerUrl = PLACEHOLDER_PATH_MARKERS.some((m) => typeof item.url === 'string' && item.url.includes(m));
      const shortDuration = typeof item.duration === 'number' && item.duration > 0 && item.duration < MIN_REAL_DURATION_SECONDS;
      return !isTrailerUrl && !shortDuration;
    });
    // Only use filtered list if it still has content; otherwise keep all (real content can live on a placeholder-path host).
    const streams = filtered.length > 0 ? filtered : rawStreams;

    // Placeholder/degraded guard: every resolution collapses to the SAME url with an empty
    // signCookie — that is an ad/trailer asset, not the film. Reject so the player shows
    // "source unavailable" instead of playing the wrong video.
    const uniqueUrls = new Set(streams.map((s: any) => String(s.url || '')));
    const allSameUrl = uniqueUrls.size === 1 && streams.length > 1;
    const signaturesEmpty = streams.every((s: any) => String(s.signCookie || '') === '' && String(s.idType || '') === '');
    const looksLikePlaceholder = allSameUrl && signaturesEmpty && streams.length > 0;
    if (looksLikePlaceholder) {
      console.warn(`[MovieBox SDK] Placeholder/degraded stream for ${subjectId} rejected (all streams share one url, empty signCookie).`);
    }

    const downloads = (looksLikePlaceholder ? [] : streams)
      .map((item: any) => ({
        id: String(item.id || ''),
        url: String(item.url || ''),
        resolution: parseStreamResolution(item),
        size: String(item.size || '0'),
      }))
      .filter((item: any) => item.url && item.resolution > 0)
      .sort((a: any, b: any) => b.resolution - a.resolution);

    const processedSources = downloads.map((item: any) => ({
      id: item.id || `stream-${item.resolution}`,
      quality: item.resolution,
      directUrl: item.url,
      size: item.size,
      format: String(item.format || 'mp4').toLowerCase(),
    }));

    const captions: Caption[] = [];
    const captionStream = downloads[0];
    if (captionStream?.id) {
      const stream: unknown = streams.find((value: unknown) =>
        value !== null && typeof value === 'object' && 'id' in value && String(value.id) === captionStream.id);
      const streamFormat = stream !== null && typeof stream === 'object' && 'format' in stream && typeof stream.format === 'string'
        ? stream.format : 'MP4';
      const captionJson = await h5Fetch('/subject/caption', {
        query: { format: String(streamFormat).toUpperCase(), id: captionStream.id, subjectId, detailPath },
        referer: movieReferer(subjectId, detailPath),
      });
      if (!captionJson || typeof captionJson !== 'object' || !('code' in captionJson) || captionJson.code !== 0) {
        const message = captionJson && typeof captionJson === 'object' && 'message' in captionJson && typeof captionJson.message === 'string'
          ? captionJson.message : 'invalid response';
        throw new Error(`H5 caption error: ${message}`);
      }
      const captionData = 'data' in captionJson ? captionJson.data : undefined;
      if (captionData && typeof captionData === 'object' && 'captions' in captionData && Array.isArray(captionData.captions)) {
        for (const value of captionData.captions) {
          const caption: unknown = value;
          if (!caption || typeof caption !== 'object' ||
            !('url' in caption) || typeof caption.url !== 'string' || !caption.url ||
            !('lan' in caption) || typeof caption.lan !== 'string' || !caption.lan) continue;
          captions.push({
            id: 'id' in caption && typeof caption.id === 'string' ? caption.id : '',
            lan: caption.lan,
            lanName: 'lanName' in caption && typeof caption.lanName === 'string' ? caption.lanName : caption.lan,
            url: caption.url,
            size: 'size' in caption && typeof caption.size === 'string' ? caption.size : '0',
            delay: 'delay' in caption && typeof caption.delay === 'number' ? caption.delay : 0,
          });
        }
      }
    }

    const data: SourcesResponse = {
      downloads,
      captions,
      processedSources,
      limited: false,
      limitedCode: '',
      freeNum: 0,
      hasResource: downloads.length > 0,
    };

    if (downloads.length > 0) {
      serverCache.set(key, data, 120);
    }
    return data;
  },

  async testCall(method: string, path: string, queryParams: any, body: any, clientToken?: string | null): Promise<any> {
    return await callMobileApi(method, path, queryParams, body, false, clientToken);
  },
};
