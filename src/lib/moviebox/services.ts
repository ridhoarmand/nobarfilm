import crypto from 'crypto';
import { serverCache, cacheKeys, cacheTTL } from '../cache';
import {
  HomepageResponse,
  TrendingResponse,
  DetailResponse,
  SourcesResponse,
  SearchResponse,
  Subject,
  BannerItem,
  SubjectType,
  OperatingSection,
  Season,
  Caption,
} from '@/types/api';
import { HOST, ALLOWED_SUBJECT_TYPES } from './config';
import { normalizeCover, normalizeSubject, filterSubjects, isAdultContent } from './normalizers';
import { callMobileApi, getAccessToken } from './client';

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

  async getHomepage(clientToken?: string | null): Promise<HomepageResponse> {
    const key = cacheKeys.apiResponse('homepage', clientToken ? 'auth' : 'guest');
    const cached = serverCache.get<HomepageResponse>(key);
    if (cached) return cached;

    try {
      console.log('[MovieBox SDK] Fetching rich homepage from Mobile App BFF API (Tabs: 29, 1, 19, 18)');
      let activeToken = clientToken;
      if (!activeToken) {
        try {
          activeToken = await getAccessToken();
        } catch (authErr: any) {
          console.warn('[MovieBox SDK] Master token fallback failed for getHomepage:', authErr.message);
        }
      }

      // Fetch curated tabs: Tab 29 (Indonesia), Tab 1 (Trending), Tab 19 (Western), Tab 18 (Asian)
      const tabRequests = ['29', '1', '19', '18'].map((tabId) =>
        callMobileApi(
          'GET',
          '/wefeed-mobile-bff/tab-operating',
          {
            host: HOST,
            tabId,
            page: '1',
            pageSize: '30',
            lang: 'id',
            area: 'ID',
          },
          null,
          false,
          activeToken
        ).catch((err) => {
          console.warn(`[MovieBox SDK] Failed to fetch tabId ${tabId}:`, err.message);
          return { code: -1, data: { items: [] } };
        })
      );

      const [resIndo, resTrend, resWest, resAsia] = await Promise.all(tabRequests);

      // Separate curated sections from "Because U Watched" sections
      const curatedRaw: any[] = [];
      const becauseRaw: any[] = [];

      // 1. Add Top Banner & Trending from Tab 1
      for (const it of Array.isArray(resTrend.data?.items) ? resTrend.data.items : []) {
        const title = (it.title || '').toLowerCase();
        if (it.type === 'BANNER') {
          curatedRaw.unshift(it);
        } else if (title.startsWith('because')) {
          becauseRaw.push(it);
        } else {
          curatedRaw.push(it);
        }
      }

      // 2. Add Indonesia Curated Tab (Tab 29)
      for (const it of Array.isArray(resIndo.data?.items) ? resIndo.data.items : []) {
        const title = (it.title || '').toLowerCase();
        if (title.startsWith('because')) {
          becauseRaw.push(it);
        } else {
          curatedRaw.push(it);
        }
      }

      // 3. Add Western / Hollywood Curated Tab (Tab 19)
      for (const it of Array.isArray(resWest.data?.items) ? resWest.data.items : []) {
        const title = (it.title || '').toLowerCase();
        if (title.startsWith('because')) {
          becauseRaw.push(it);
        } else {
          curatedRaw.push(it);
        }
      }

      // 4. Add Asian / K-Drama Curated Tab (Tab 18)
      for (const it of Array.isArray(resAsia.data?.items) ? resAsia.data.items : []) {
        const title = (it.title || '').toLowerCase();
        if (title.startsWith('because')) {
          becauseRaw.push(it);
        } else {
          curatedRaw.push(it);
        }
      }

      // Assemble all sections: Curated on top, Because U Watched at the bottom
      const allRawSections = [...curatedRaw, ...becauseRaw];

      const isExcludedSection = (title: string) => {
        const lower = (title || '').toLowerCase();
        return (
          lower.includes('user watch history') ||
          lower.includes('dark desire') ||
          lower.includes('bromance') ||
          lower.includes('girls love') ||
          lower.includes("girl's love") ||
          lower.includes('boys love') ||
          lower.includes("boy's love") ||
          lower.includes('yuri') ||
          lower.includes('yaoi') ||
          lower.includes('nollywood') ||
          lower.includes('made in africa') ||
          lower.includes('black show') ||
          lower.includes('black teen') ||
          lower.includes('adult') ||
          lower.includes('18+') ||
          lower.includes('erotic') ||
          lower.includes('hentai') ||
          lower.includes('dewasa') ||
          lower.includes('violent&lustful') ||
          lower.includes('late-night show')
        );
      };

      const operatingList: OperatingSection[] = [];
      const subjectsList: Subject[] = [];
      let bannerSection: BannerItem[] = [];
      const seenTitles = new Set<string>();

      let pos = 0;
      for (const item of allRawSections) {
        const itemTitle = item.title || '';
        if (isExcludedSection(itemTitle)) {
          continue;
        }

        if (item.type === 'BANNER') {
          if (seenTitles.has('__banner__')) continue;
          const rawBanners: any[] = Array.isArray(item.banner?.banners)
            ? item.banner.banners
            : Array.isArray(item.banner?.items)
              ? item.banner.items
              : [];

          const bannerItems: BannerItem[] = rawBanners
            .map((bItem: any) => {
              const sub = bItem.subject || bItem;
              let subjectId = String(sub.subjectId || sub.id || '');
              if (!subjectId && typeof bItem.deepLink === 'string') {
                const match = bItem.deepLink.match(/id=(\d+)/);
                if (match) subjectId = match[1];
              }

              if (!subjectId) return null;

              const normSub = normalizeSubject(sub.subjectId ? sub : { ...sub, subjectId });
              if (isAdultContent(normSub) || normSub.hasResource === false) return null;

              subjectsList.push(normSub);
              return {
                id: String(bItem.id || normSub.subjectId),
                title: bItem.content || bItem.title || normSub.title,
                image: normalizeCover(bItem.image?.url || normSub.cover?.url, 600),
                url: `/detail/${normSub.subjectId}`,
                subjectId: normSub.subjectId,
                subjectType: normSub.subjectType,
                subject: normSub,
              };
            })
            .filter(Boolean) as BannerItem[];

          if (bannerItems.length > 0) {
            seenTitles.add('__banner__');
            bannerSection = bannerItems;
            operatingList.push({
              type: 'BANNER',
              position: pos++,
              title: 'Film & Serial Terpopuler',
              banner: { items: bannerItems },
            });
          }
        } else if (
          item.type === 'SUBJECTS_MOVIE' ||
          item.type === 'SUBJECTS_SERIES' ||
          item.type === 'SUBJECTS_DRAMA' ||
          (typeof item.type === 'string' && item.type.startsWith('SUBJECTS_'))
        ) {
          if (!itemTitle || seenTitles.has(itemTitle.toLowerCase())) continue;

          const rawSubs = Array.isArray(item.subjects) ? item.subjects : [];
          const normSubs = rawSubs
            .map((sub: any) => normalizeSubject(sub))
            .filter((sub: any) => ALLOWED_SUBJECT_TYPES.has(sub.subjectType) && !isAdultContent(sub) && sub.hasResource !== false);

          if (normSubs.length > 0) {
            seenTitles.add(itemTitle.toLowerCase());
            subjectsList.push(...normSubs);

            // Extract categoryType from deepLink (e.g. oneroom://...categoryType=5283462032510044280)
            let categoryType = '';
            if (typeof item.deepLink === 'string') {
              const match = item.deepLink.match(/categoryType=(\d+)/);
              if (match) categoryType = match[1];
            }
            if (!categoryType && item.opId) {
              categoryType = String(item.opId);
            }

            operatingList.push({
              type: 'SUBJECTS_MOVIE',
              position: pos++,
              title: itemTitle,
              subjects: normSubs,
              categoryType: categoryType || undefined,
              opId: item.opId ? String(item.opId) : undefined,
            });
          }
        }
      }

      const topPickList = bannerSection.map((i) => i.subject).filter(Boolean) as Subject[];
      if (topPickList.length === 0) {
        topPickList.push(...subjectsList.slice(0, 8));
      }

      const data: HomepageResponse = {
        topPickList,
        homeList: operatingList,
        url: `https://${HOST}/`,
        referer: `https://${HOST}/`,
        allPlatform: [],
        banner: bannerSection.length > 0 ? { items: bannerSection } : null,
        live: null,
        platformList: resTrend.data?.platformList || [],
        shareParam: null,
        operatingList,
      };

      serverCache.set(key, data, cacheTTL.API_RESPONSE);
      return data;
    } catch (mobileErr: any) {
      if (!clientToken) {
        try {
          console.log('[MovieBox SDK] Retrying getHomepage with Master Account token...');
          const masterToken = await getAccessToken();
          if (masterToken) {
            return await this.getHomepage(masterToken);
          }
        } catch (masterErr: any) {
          console.warn('[MovieBox SDK] Master token homepage retry failed:', masterErr.message);
        }
      }
      throw mobileErr;
    }
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
    const key = cacheKeys.apiResponse('ranking-list', `${categoryType}&p=${page}&pp=${safePerPage}`);
    const cached = serverCache.get<SearchResponse>(key);
    if (cached) return cached;

    const response = await callMobileApi(
      'POST',
      '/wefeed-mobile-bff/subject-api/list',
      { host: HOST, lang: 'id', area: 'ID' },
      { page, perPage: safePerPage, categoryType },
      false,
      null
    );

    if (response.code !== 0) {
      throw new Error(`Mobile Gateway ranking list error: ${response.message || 'unknown error'}`);
    }

    const rawList = Array.isArray(response.data?.items) ? response.data.items : [];
    const parsed: Subject[] = rawList
      .map((sub: any) => normalizeSubject(sub))
      .filter((sub: Subject) => ALLOWED_SUBJECT_TYPES.has(sub.subjectType) && !isAdultContent(sub) && sub.hasResource !== false);

    const pagerData = response.data?.pager || {};
    const data: SearchResponse = {
      items: parsed,
      pager: {
        hasMore: pagerData.hasMore ?? parsed.length >= safePerPage,
        nextPage: String(pagerData.nextPage || page + 1),
        page: String(page),
        perPage: safePerPage,
        totalCount: typeof pagerData.totalCount === 'number' ? pagerData.totalCount : parsed.length,
      },
      counts: [],
      url: `https://${HOST}/wefeed-mobile-bff/subject-api/list?categoryType=${categoryType}`,
      referer: `https://${HOST}/`,
    };

    serverCache.set(key, data, cacheTTL.API_RESPONSE);
    return data;
  },

  async getTrending(page: number = 0, clientToken?: string | null): Promise<TrendingResponse> {
    const key = cacheKeys.apiResponse('trending', `page=${page}&auth=${clientToken ? '1' : '0'}`);
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

  async search(query: string, page: number = 1, clientToken?: string | null): Promise<SearchResponse> {
    const key = cacheKeys.apiResponse('search', `q=${query}&p=${page}&auth=${clientToken ? '1' : '0'}`);
    const cached = serverCache.get<SearchResponse>(key);
    if (cached) return cached;

    const payload = {
      page: page,
      perPage: 20,
      keyword: query,
    };

    const response = await callMobileApi(
      'POST',
      '/wefeed-mobile-bff/subject-api/search/v2',
      { host: HOST },
      payload,
      true,
      clientToken
    );

    if (response.code !== 0) {
      throw new Error(`Mobile Gateway search error: ${response.message || 'unknown error'}`);
    }

    const searchList = Array.isArray(response.data?.results) ? response.data.results : [];
    const parsed: Subject[] = searchList
      .filter((item: any) => item.topicType === 'SUBJECT' && Array.isArray(item.subjects))
      .flatMap((item: any) => item.subjects.map((sub: any) => normalizeSubject(sub)))
      .filter((sub: Subject) => ALLOWED_SUBJECT_TYPES.has(sub.subjectType) && !isAdultContent(sub) && sub.hasResource !== false);

    const data: SearchResponse = {
      items: parsed,
      pager: {
        hasMore: parsed.length >= 20,
        nextPage: String(page + 1),
        page: String(page),
        perPage: 20,
        totalCount: parsed.length,
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
      url: `https://${HOST}/wefeed-mobile-bff/subject-api/search/v2?keyword=${encodeURIComponent(query)}`,
      referer: `https://${HOST}/`,
    };

    serverCache.set(key, data, cacheTTL.API_RESPONSE);
    return data;
  },

  async getDetail(subjectId: string, clientToken?: string | null): Promise<DetailResponse> {
    const key = cacheKeys.apiResponse('detail', `${subjectId}&auth=${clientToken ? '1' : '0'}`);
    const cached = serverCache.get<DetailResponse>(key);
    if (cached) return cached;

    try {
      console.log(`[MovieBox SDK] Fetching detail from Mobile App BFF API for ${subjectId}`);
      const response = await callMobileApi(
        'GET',
        '/wefeed-mobile-bff/subject-api/get',
        {
          host: HOST,
          subjectId,
          lang: 'id',
          area: 'ID',
        },
        null,
        true,
        clientToken
      );

      if (response.code !== 0) {
        throw new Error(`Mobile Gateway detail error: ${response.message || 'unknown error'}`);
      }

      const rawSubject = response.data;
      if (!rawSubject || !rawSubject.subjectId) {
        throw new Error('Mobile Gateway detail response missing subject data');
      }

      const subject = normalizeSubject(rawSubject);
      if (isAdultContent(rawSubject) || isAdultContent(subject)) {
        throw new Error('Akses Terbatas: Konten dari sumber ini tidak tersedia.');
      }
      let seasons: Season[] = [];

      if (subject.subjectType === SubjectType.Series) {
        try {
          const seasonInfoRes = await callMobileApi(
            'GET',
            '/wefeed-mobile-bff/subject-api/season-info',
            {
              host: HOST,
              subjectId,
              lang: 'id',
              area: 'ID',
            },
            null,
            true,
            clientToken
          );
          if (seasonInfoRes.code === 0 && Array.isArray(seasonInfoRes.data?.seasons)) {
            seasons = seasonInfoRes.data.seasons.map((se: any) => ({
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
          }
        } catch (err: any) {
          console.error(`[MovieBox SDK] Failed to fetch season-info for ${subjectId}:`, err.message);
        }
      }

      if (seasons.length === 0) {
        if (subject.subjectType === SubjectType.Series) {
          seasons.push({ se: 1, maxEp: 1, allEp: '1', resolutions: [] });
        } else {
          seasons.push({ se: 0, maxEp: 0, allEp: '1', resolutions: [] });
        }
      }

      // Extract real original source provider name from resourceDetectors
      let detectedSource = '';
      let detectedUploadBy = '';
      if (Array.isArray(subject.resourceDetectors) && subject.resourceDetectors.length > 0) {
        const first = subject.resourceDetectors[0];
        detectedSource = first.domain || first.source || '';
        detectedUploadBy = first.uploadBy || '';
      } else if (Array.isArray(rawSubject.resourceDetectors) && rawSubject.resourceDetectors.length > 0) {
        const first = rawSubject.resourceDetectors[0];
        detectedSource = first.source || '';
        detectedUploadBy = first.uploadBy || '';
      }

      const data: DetailResponse = {
        subject,
        stars: subject.staffList || [],
        resource: {
          seasons,
          source: detectedSource || (subject.hasResource ? 'moviebox-stream' : ''),
          uploadBy: detectedUploadBy || 'community',
        },
        metadata: {
          title: subject.title,
          description: subject.description || '',
          image: subject.cover.url,
          url: `https://${HOST}/wefeed-mobile-bff/subject-api/get?subjectId=${subjectId}`,
          referer: `https://${HOST}/`,
        },
        url: `https://${HOST}/wefeed-mobile-bff/subject-api/get?subjectId=${subjectId}`,
        referer: `https://${HOST}/`,
        isForbid: false,
        watchTimeLimit: 0,
      };

      serverCache.set(key, data, cacheTTL.API_RESPONSE * 2);
      return data;
    } catch (mobileErr: any) {
      if (!clientToken) {
        try {
          console.log(
            `[MovieBox SDK] Detail fetch failed with guest token, trying Master Account token fallback for ${subjectId}...`
          );
          const masterToken = await getAccessToken();
          if (masterToken) {
            return await this.getDetail(subjectId, masterToken);
          }
        } catch (masterErr: any) {
          console.warn(`[MovieBox SDK] Master token detail fallback failed:`, masterErr.message);
        }
      }
      throw mobileErr;
    }
  },

  async getSources(
    subjectId: string,
    season?: number,
    episode?: number,
    clientToken?: string | null
  ): Promise<SourcesResponse> {
    let resolvedSeason = typeof season === 'number' && Number.isFinite(season) ? season : undefined;
    let resolvedEpisode = typeof episode === 'number' && Number.isFinite(episode) ? episode : undefined;

    if (resolvedSeason === undefined || resolvedEpisode === undefined) {
      const detail = await this.getDetail(subjectId, clientToken);
      const isSeries = detail.subject.subjectType === SubjectType.Series;
      if (resolvedSeason === undefined) {
        resolvedSeason = isSeries ? 1 : 0;
      }
      if (resolvedEpisode === undefined) {
        resolvedEpisode = resolvedSeason === 0 ? 0 : 1;
      }
    }

    if (resolvedSeason === 0) {
      resolvedEpisode = 0;
    }

    if (resolvedSeason < 0) resolvedSeason = 0;
    if (resolvedEpisode < 0) resolvedEpisode = 0;

    const queryString = `se=${resolvedSeason}&ep=${resolvedEpisode}`;
    const key = cacheKeys.apiResponse('sources', `${subjectId}:${queryString}&auth=${clientToken ? '1' : '0'}`);
    const cached = serverCache.get<SourcesResponse>(key);
    if (cached && cached.hasResource && Array.isArray(cached.downloads) && cached.downloads.length > 0) {
      return cached;
    }
    serverCache.delete(key);

    try {
      console.log(`[MovieBox SDK] Fetching sources from Mobile App BFF API for ${subjectId}`);
      let activeToken = clientToken;
      if (!activeToken) {
        try {
          activeToken = await getAccessToken();
        } catch (authErr: any) {
          console.warn('[MovieBox SDK] Master token fallback failed, using guest session:', authErr.message);
        }
      }

      const playInfoRes = await callMobileApi(
        'GET',
        '/wefeed-mobile-bff/subject-api/play-info',
        {
          host: HOST,
          subjectId,
          se: String(resolvedSeason),
          ep: String(resolvedEpisode),
          lang: 'id',
          area: 'ID',
        },
        null,
        true,
        activeToken
      );

      if (playInfoRes.code !== 0) {
        throw new Error(`Mobile Gateway play-info error: ${playInfoRes.message || 'unknown error'}`);
      }

      let streams = Array.isArray(playInfoRes.data?.streams) ? playInfoRes.data.streams : [];
      const fullStreams = streams.filter((item: any) => {
        const isTrailerUrl = typeof item.url === 'string' && item.url.includes('/other/');
        const shortDuration = typeof item.duration === 'number' && item.duration > 0 && item.duration < 300;
        return !isTrailerUrl && !shortDuration;
      });

      if (fullStreams.length > 0) {
        streams = fullStreams;
      }

      const downloads = streams
        .map((item: any) => ({
          id: String(item.id || ''),
          url: String(item.url || ''),
          resolution: parseStreamResolution(item, playInfoRes.data?.title),
          size: String(item.size || '0'),
        }))
        .filter((item: any) => item.url && item.resolution > 0)
        .sort((a: any, b: any) => b.resolution - a.resolution);

      const processedSources = downloads.map((item: any) => ({
        id: item.id || `stream-${item.resolution}`,
        quality: item.resolution,
        directUrl: item.url,
        size: item.size,
        format: 'mp4',
      }));

      let captions: Caption[] = [];
      if (downloads.length > 0) {
        const streamId = downloads[0].id;
        const rawList: any[] = [];

        // Method 1: Fetch via get-stream-captions (Used primarily by Movies and stream-bound captions)
        try {
          const captionsRes = await callMobileApi(
            'GET',
            '/wefeed-mobile-bff/subject-api/get-stream-captions',
            {
              host: HOST,
              subjectId,
              streamId,
              lang: 'id',
            },
            null,
            true,
            activeToken
          );

          if (captionsRes.code === 0 && captionsRes.data) {
            if (Array.isArray(captionsRes.data.extCaptions)) rawList.push(...captionsRes.data.extCaptions);
            if (Array.isArray(captionsRes.data.subtitles)) rawList.push(...captionsRes.data.subtitles);
            if (Array.isArray(captionsRes.data.captions)) rawList.push(...captionsRes.data.captions);
          }
        } catch (capErr: any) {
          console.warn(`[MovieBox SDK] Failed to fetch stream-captions for streamId ${streamId}:`, capErr.message);
        }

        // Method 2: If empty, fetch via get-ext-captions (Used by TV Series and episode resources)
        if (rawList.length === 0) {
          try {
            const epNum = resolvedEpisode && resolvedEpisode > 0 ? resolvedEpisode : 1;
            const extCaptionsRes = await callMobileApi(
              'GET',
              '/wefeed-mobile-bff/subject-api/get-ext-captions',
              {
                host: HOST,
                subjectId,
                resourceId: streamId,
                episode: String(epNum),
                lang: 'id',
              },
              null,
              true,
              activeToken
            );

            if (extCaptionsRes.code === 0 && extCaptionsRes.data) {
              if (Array.isArray(extCaptionsRes.data.extCaptions)) rawList.push(...extCaptionsRes.data.extCaptions);
              if (Array.isArray(extCaptionsRes.data.subtitles)) rawList.push(...extCaptionsRes.data.subtitles);
              if (Array.isArray(extCaptionsRes.data.captions)) rawList.push(...extCaptionsRes.data.captions);
            }
          } catch (extCapErr: any) {
            console.warn(`[MovieBox SDK] Failed to fetch get-ext-captions for resourceId ${streamId}:`, extCapErr.message);
          }
        }

        const seenUrls = new Set<string>();
        captions = rawList
          .map((item: any, index: number) => ({
            id: String(item.id || `caption-${index}`),
            lan: String(item.lan || ''),
            lanName: String(item.lanName || item.lan || ''),
            url: String(item.url || ''),
            size: String(item.size || '0'),
            delay: typeof item.delay === 'number' ? item.delay : 0,
          }))
          .filter((item: any) => {
            if (!item.url || seenUrls.has(item.url)) return false;
            seenUrls.add(item.url);
            return true;
          });
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
    } catch (err: any) {
      console.error(`[MovieBox SDK] getSources error for ${subjectId} se=${resolvedSeason} ep=${resolvedEpisode}:`, err.message);

      if (!clientToken) {
        try {
          const masterToken = await getAccessToken();
          if (masterToken) {
            return await this.getSources(subjectId, season, episode, masterToken);
          }
        } catch (masterErr: any) {
          console.warn(`[MovieBox SDK] Master token fallback for getSources failed:`, masterErr.message);
        }
      }

      const fallbackData: SourcesResponse = {
        downloads: [],
        captions: [],
        processedSources: [],
        limited: false,
        limitedCode: '',
        freeNum: 0,
        hasResource: false,
      };
      return fallbackData;
    }
  },

  async testCall(method: string, path: string, queryParams: any, body: any, clientToken?: string | null): Promise<any> {
    return await callMobileApi(method, path, queryParams, body, false, clientToken);
  },
};
