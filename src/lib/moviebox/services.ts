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
import { HOST, H5_UPSTREAM, ALLOWED_SUBJECT_TYPES } from './config';
import { getH5Headers } from './crypto';
import { normalizeCover, normalizeSubject, filterSubjects } from './normalizers';
import { callMobileApi, getAccessToken } from './client';

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

    if (!clientToken) {
      try {
        console.log('[MovieBox SDK] Guest mode: Fetching homepage from H5 API');
        const response = await fetch(`${H5_UPSTREAM}/home?lang=id&locale=id_ID`, {
          headers: getH5Headers(),
          next: { revalidate: 900 },
        });
        if (response.ok) {
          const raw = await response.json();
          if (raw.code === 0 && raw.data && Array.isArray(raw.data.operatingList)) {
            const items = raw.data.operatingList;
            const operatingList: OperatingSection[] = [];
            const subjectsList: Subject[] = [];
            let bannerSection: BannerItem[] = [];

            let pos = 0;
            for (const item of items) {
              if (item.type === 'BANNER') {
                const rawBannerItems = Array.isArray(item.banner?.items) ? item.banner.items : [];
                const bannerItems: BannerItem[] = rawBannerItems.map((bItem: any) => {
                  const sub = bItem.subject || bItem;
                  const normSub = normalizeSubject(sub);
                  subjectsList.push(normSub);
                  return {
                    id: String(bItem.id || normSub.subjectId),
                    title: bItem.title || normSub.title,
                    image: normalizeCover(bItem.image?.url || normSub.cover?.url, 600),
                    url: `/detail/${normSub.subjectId}`,
                    subjectId: normSub.subjectId,
                    subjectType: normSub.subjectType,
                    subject: normSub,
                  };
                });
                bannerSection = bannerItems;
                operatingList.push({
                  type: 'BANNER',
                  position: pos++,
                  title: item.title || 'Featured',
                  banner: { items: bannerItems },
                });
              } else if (
                item.type === 'SUBJECTS_MOVIE' ||
                item.type === 'SUBJECTS_SERIES' ||
                item.type === 'SUBJECTS_DRAMA' ||
                item.type.startsWith('SUBJECTS_')
              ) {
                const rawSubs = Array.isArray(item.subjects) ? item.subjects : [];
                const normSubs = rawSubs
                  .map((sub: any) => normalizeSubject(sub))
                  .filter((sub: any) => ALLOWED_SUBJECT_TYPES.has(sub.subjectType));

                if (normSubs.length > 0) {
                  subjectsList.push(...normSubs);
                  operatingList.push({
                    type: 'SUBJECTS_MOVIE',
                    position: pos++,
                    title: item.title || 'Recommended',
                    subjects: normSubs,
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
              platformList: raw.data.platformList || [],
              shareParam: null,
              operatingList,
            };

            serverCache.set(key, data, cacheTTL.API_RESPONSE);
            return data;
          }
        }
      } catch (err: any) {
        console.error('[MovieBox SDK] H5 homepage fetch failed:', err.message);
        throw err;
      }
    }

    console.log('[MovieBox SDK] Fetching homepage from Mobile API');
    const response = await callMobileApi(
      'GET',
      '/wefeed-mobile-bff/tab-operating',
      {
        host: HOST,
        tabId: '1',
        page: '1',
        version: 'b58c512',
      },
      null,
      true,
      clientToken
    );

    if (response.code !== 0) {
      throw new Error(`Mobile Gateway homepage error: ${response.message || 'unknown error'}`);
    }

    const items = Array.isArray(response.data?.items) ? response.data.items : [];
    const operatingList: OperatingSection[] = [];
    const subjectsList: Subject[] = [];
    let bannerSection: BannerItem[] = [];

    let pos = 0;
    for (const item of items) {
      if (item.type === 'BANNER') {
        const rawBanners: any[] = Array.isArray(item.banner?.banners) ? item.banner.banners : [];
        const bannerItems: BannerItem[] = rawBanners
          .filter((b: any) => b.subject && b.subject.subjectId)
          .map((b: any) => {
            const normSub = normalizeSubject(b.subject);
            subjectsList.push(normSub);
            return {
              id: normSub.subjectId,
              title: normSub.title,
              image: normalizeCover(b.image?.url || normSub.cover?.url, 600),
              url: `/detail/${normSub.subjectId}`,
              subjectId: normSub.subjectId,
              subjectType: normSub.subjectType,
              subject: normSub,
            };
          });
        bannerSection = bannerItems;
        if (bannerItems.length > 0) {
          operatingList.push({
            type: 'BANNER',
            position: pos++,
            title: item.title || 'Featured',
            banner: { items: bannerItems },
          });
        }
      } else if (
        item.type === 'SUBJECTS_MOVIE' ||
        item.type === 'SUBJECTS_SERIES' ||
        item.type === 'SUBJECTS_DRAMA' ||
        (typeof item.type === 'string' && item.type.startsWith('SUBJECTS_'))
      ) {
        const rawSubs = Array.isArray(item.subjects) ? item.subjects : [];
        const normSubs = rawSubs
          .map((sub: any) => normalizeSubject(sub))
          .filter((sub: any) => ALLOWED_SUBJECT_TYPES.has(sub.subjectType));

        if (normSubs.length > 0) {
          subjectsList.push(...normSubs);
          operatingList.push({
            type: 'SUBJECTS_MOVIE',
            position: pos++,
            title: item.title || 'Recommended',
            subjects: normSubs,
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
      platformList: [],
      shareParam: null,
      operatingList,
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
      .filter((sub: Subject) => ALLOWED_SUBJECT_TYPES.has(sub.subjectType));

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

    if (!clientToken) {
      try {
        console.log('[MovieBox SDK] Guest mode: Fetching detail from H5 API');
        const response = await fetch(`${H5_UPSTREAM}/detail?subjectId=${subjectId}&lang=id&locale=id_ID`, {
          headers: getH5Headers(),
          next: { revalidate: 1800 },
        });
        if (response.ok) {
          const raw = await response.json();
          if (raw.code === 0 && raw.data?.subject) {
            const subject = normalizeSubject(raw.data.subject);
            let seasons: Season[] = [];
            if (raw.data.resource && Array.isArray(raw.data.resource.seasons)) {
              seasons = raw.data.resource.seasons.map((se: any) => ({
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
            if (seasons.length === 0) {
              if (subject.subjectType === SubjectType.Series) {
                seasons.push({ se: 1, maxEp: 1, allEp: '1', resolutions: [] });
              } else {
                seasons.push({ se: 0, maxEp: 0, allEp: '1', resolutions: [] });
              }
            }

            const data: DetailResponse = {
              subject,
              stars: Array.isArray(raw.data.stars)
                ? raw.data.stars.map((st: any) => ({
                    staffId: String(st.staffId || ''),
                    staffType: typeof st.staffType === 'number' ? st.staffType : 1,
                    name: st.name || '',
                    character: st.character || '',
                    avatarUrl: st.avatarUrl || '',
                    detailPath: `/staff/${st.staffId}`,
                  }))
                : subject.staffList || [],
              resource: {
                seasons,
                source: 'aoneroom',
                uploadBy: 'nobarfilm-gateway',
              },
              metadata: {
                title: subject.title,
                description: subject.description || '',
                image: subject.cover.url,
                url: `${H5_UPSTREAM}/detail?subjectId=${subjectId}`,
                referer: 'https://lok-lok.cc/',
              },
              url: `${H5_UPSTREAM}/detail?subjectId=${subjectId}`,
              referer: 'https://lok-lok.cc/',
              isForbid: raw.data.isForbid || false,
              watchTimeLimit: raw.data.watchTimeLimit || 0,
            };
            serverCache.set(key, data, cacheTTL.API_RESPONSE * 2);
            return data;
          }
        }
      } catch (err: any) {
        console.error('[MovieBox SDK] H5 detail fetch failed:', err.message);
        throw err;
      }
    }

    const response = await callMobileApi(
      'GET',
      '/wefeed-mobile-bff/subject-api/get',
      {
        host: HOST,
        subjectId,
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
    let seasons: Season[] = [];

    if (subject.subjectType === SubjectType.Series) {
      try {
        const seasonInfoRes = await callMobileApi(
          'GET',
          '/wefeed-mobile-bff/subject-api/season-info',
          {
            host: HOST,
            subjectId,
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

    const data: DetailResponse = {
      subject,
      stars: subject.staffList || [],
      resource: {
        seasons,
        source: 'aoneroom',
        uploadBy: 'nobarfilm-gateway',
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
    if (cached) return cached;

    // ALWAYS try H5 API first because it provides direct working MP4 streams for all subjects
    try {
      console.log(`[MovieBox SDK] Fetching sources from H5 API for ${subjectId}`);

      const detail = await this.getDetail(subjectId);
      let detailPath = detail.subject.h5DetailPath || '';

      if (!detailPath) {
        console.log(`[MovieBox SDK] detailPath is empty in getDetail cache. Fetching fresh detail from H5...`);
        try {
          const freshRes = await fetch(`${H5_UPSTREAM}/detail?subjectId=${subjectId}&lang=id&locale=id_ID`, {
            headers: getH5Headers(),
          });
          if (freshRes.ok) {
            const freshData = await freshRes.json();
            detailPath = freshData.data?.subject?.detailPath || '';
            console.log(`[MovieBox SDK] Fresh detailPath: ${detailPath}`);
          }
        } catch (freshErr: any) {
          console.error(`[MovieBox SDK] Fresh detailPath fetch failed:`, freshErr.message);
        }
      }

      const query = new URLSearchParams();
      query.set('subjectId', subjectId);
      query.set('se', resolvedSeason.toString());
      query.set('ep', resolvedEpisode.toString());
      if (detailPath) {
        query.set('detailPath', detailPath);
      }

      const playReferer = detailPath
        ? `https://lok-lok.cc/spa/videoPlayPage/movies/${detailPath}`
        : 'https://lok-lok.cc/';

      const h5Res = await fetch(`${H5_UPSTREAM}/subject/play?${query.toString()}`, {
        headers: getH5Headers(playReferer),
        next: { revalidate: 300 },
      });

      if (h5Res.ok) {
        const rawPlay = await h5Res.json();
        if (rawPlay.code === 0 && rawPlay.data?.streams && rawPlay.data.streams.length > 0) {
          const streams = rawPlay.data.streams;

          const downloads = streams
            .map((item: any) => ({
              id: String(item.id || ''),
              url: String(item.url || ''),
              resolution: parseInt(String(item.resolutions || 0), 10),
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
            try {
              const captionUrl = `${H5_UPSTREAM}/subject/caption?format=MP4&id=${streamId}&subjectId=${subjectId}${
                detailPath ? `&detailPath=${detailPath}` : ''
              }`;
              const capRes = await fetch(captionUrl, {
                headers: getH5Headers(playReferer),
                next: { revalidate: 1800 },
              });
              if (capRes.ok) {
                const rawCap = await capRes.json();
                if (rawCap.code === 0 && Array.isArray(rawCap.data?.captions)) {
                  captions = rawCap.data.captions
                    .map((item: any, index: number) => ({
                      id: String(item.id || `caption-${index}`),
                      lan: String(item.lan || ''),
                      lanName: String(item.lanName || item.lan || ''),
                      url: String(item.url || ''),
                      size: String(item.size || '0'),
                      delay: typeof item.delay === 'number' ? item.delay : 0,
                    }))
                    .filter((item: any) => Boolean(item.url));
                }
              }
            } catch (capErr: any) {
              console.error(`[MovieBox SDK] Failed to fetch captions for streamId ${streamId}:`, capErr.message);
            }
          }

          const hasIndo = captions.some(
            (c) => (c.lanName || '').toLowerCase().includes('indonesia') || (c.lan || '').toLowerCase().includes('id')
          );

          if (captions.length === 0 || !hasIndo) {
            try {
              console.log(
                `[MovieBox SDK] Fetching additional ext-captions from Mobile BFF API (hasIndo: ${hasIndo})...`
              );
              const extCapRes = await callMobileApi(
                'GET',
                '/wefeed-mobile-bff/subject-api/get-ext-captions',
                {
                  subjectId,
                  season: resolvedSeason.toString(),
                  episode: resolvedEpisode.toString(),
                },
                null,
                true,
                clientToken
              );

              if (extCapRes && Array.isArray(extCapRes.data)) {
                const extCaptions: Caption[] = extCapRes.data
                  .map((item: any, index: number) => ({
                    id: String(item.id || `ext-cap-${index}`),
                    lan: String(item.lan || ''),
                    lanName: String(item.lanName || item.lan || ''),
                    url: String(item.url || ''),
                    size: String(item.size || '0'),
                    delay: 0,
                  }))
                  .filter((item: any) => Boolean(item.url));

                const existingUrls = new Set(captions.map((c) => c.url));
                for (const extCap of extCaptions) {
                  if (!existingUrls.has(extCap.url)) {
                    captions.push(extCap);
                    existingUrls.add(extCap.url);
                  }
                }
                console.log(`[MovieBox SDK] Mobile BFF ext-captions retrieved & merged. Total: ${captions.length}`);
              }
            } catch (extErr: any) {
              console.warn(`[MovieBox SDK] Mobile BFF ext captions failed:`, extErr.message);
            }
          }

          const data: SourcesResponse = {
            downloads,
            captions,
            processedSources,
            limited: false,
            limitedCode: '',
            freeNum: 999,
            hasResource: downloads.length > 0,
          };

          console.log('[MovieBox SDK] H5 sources retrieved successfully');
          serverCache.set(key, data, 120);
          return data;
        } else {
          console.log(`[MovieBox SDK] H5 play returned no streams for ${subjectId}`);
        }
      }

      try {
        console.log(`[MovieBox SDK] Attempting Master Account token fallback for ${subjectId}`);
        const masterToken = await getAccessToken();
        if (masterToken && masterToken !== clientToken) {
          return await this.getSources(subjectId, season, episode, masterToken);
        }
      } catch (masterErr: any) {
        console.warn('[MovieBox SDK] Master account token fallback failed:', masterErr.message);
      }
    } catch (h5Err: any) {
      console.warn('[MovieBox SDK] H5 sources fetch failed:', h5Err.message);
    }

    try {
      console.log(`[MovieBox SDK] Fetching sources from Mobile API for ${subjectId}`);
      const playInfoRes = await callMobileApi(
        'GET',
        '/wefeed-mobile-bff/subject-api/play-info',
        {
          host: HOST,
          subjectId,
          se: String(resolvedSeason),
          ep: String(resolvedEpisode),
        },
        null,
        true,
        clientToken
      );

      if (playInfoRes.code !== 0) {
        throw new Error(`Mobile Gateway play-info error: ${playInfoRes.message || 'unknown error'}`);
      }

      const streams = Array.isArray(playInfoRes.data?.streams) ? playInfoRes.data.streams : [];
      const downloads = streams
        .map((item: any) => ({
          id: String(item.id || ''),
          url: String(item.url || ''),
          resolution: parseInt(String(item.resolutions || 0), 10),
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
        try {
          const captionsRes = await callMobileApi(
            'GET',
            '/wefeed-mobile-bff/subject-api/get-stream-captions',
            {
              host: HOST,
              subjectId,
              streamId,
            },
            null,
            true,
            clientToken
          );

          if (captionsRes.code === 0 && Array.isArray(captionsRes.data?.subtitles)) {
            captions = captionsRes.data.subtitles
              .map((item: any, index: number) => ({
                id: String(item.id || `caption-${index}`),
                lan: String(item.lan || ''),
                lanName: String(item.lanName || item.lan || ''),
                url: String(item.url || ''),
                size: String(item.size || '0'),
                delay: typeof item.delay === 'number' ? item.delay : 0,
              }))
              .filter((item: any) => Boolean(item.url));
          }
        } catch (capErr: any) {
          console.error(`[MovieBox SDK] Failed to fetch captions for streamId ${streamId}:`, capErr.message);
        }
      }

      if (captions.length === 0) {
        try {
          console.log(`[MovieBox SDK] Mobile API captions empty. Fetching ext captions fallback...`);
          const extCapRes = await callMobileApi(
            'GET',
            '/wefeed-mobile-bff/subject-api/get-ext-captions',
            {
              subjectId,
              season: resolvedSeason.toString(),
              episode: resolvedEpisode.toString(),
            },
            null,
            true,
            clientToken
          );

          if (extCapRes && Array.isArray(extCapRes.data)) {
            captions = extCapRes.data
              .map((item: any, index: number) => ({
                id: String(item.id || `ext-cap-${index}`),
                lan: String(item.lan || ''),
                lanName: String(item.lanName || item.lan || ''),
                url: String(item.url || ''),
                size: String(item.size || '0'),
                delay: 0,
              }))
              .filter((item: any) => Boolean(item.url));
          }
        } catch (extErr: any) {
          console.warn(`[MovieBox SDK] Mobile BFF ext captions fallback failed:`, extErr.message);
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

      serverCache.set(key, data, 120);
      return data;
    } catch (err: any) {
      console.error(`[MovieBox SDK] getSources error for ${subjectId} se=${resolvedSeason} ep=${resolvedEpisode}:`, err.message);

      if (!clientToken) {
        throw new Error('Sumber video tidak dapat dimuat saat ini. Silakan coba lagi nanti.');
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
      serverCache.set(key, fallbackData, 120);
      return fallbackData;
    }
  },

  async testCall(method: string, path: string, queryParams: any, body: any, clientToken?: string | null): Promise<any> {
    return await callMobileApi(method, path, queryParams, body, false, clientToken);
  },
};
