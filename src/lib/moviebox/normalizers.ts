import { Subject, SubjectType } from '@/types/api';
import { ALLOWED_SUBJECT_TYPES } from './config';

// Domain provider video dewasa / hentai pada stream sources yang diblokir
const BLOCKED_SOURCE_DOMAINS_REGEX = /(watchhentai|xprimehub|hentai|pornhub|xvideos|spankbang|xhamster|redtube|youporn|eporner|tube8|beeg|extrahot)\b/i;

// Genre yang selalu porn/semi-porn (web series India, Vivamax, hentai). H5 lang=id mengirim
// genre berbahasa Indonesia ("Panas" = Hot), jadi keduanya harus ada di sini.
const ADULT_GENRES = ['adult', 'panas', 'hot', 'hentai', 'ecchi', 'porn', 'porno', 'sensual'];

// "Erotis" juga dipakai film layar lebar (Fifty Shades 353k vote, Crash 72k vote), sedangkan
// konten porn berlabel Erotis/judul vulgar hampir selalu < 100 vote IMDb. Lolos hanya bila populer.
const EROTIC_GENRES = ['erotis', 'erotic'];
const MAINSTREAM_MIN_IMDB_VOTES = 300;

// Kata khas judul porn/semi-porn yang juga muncul di film populer ("Sex Education", "Lust Stories"),
// jadi hanya memblokir judul yang tidak populer (< MAINSTREAM_MIN_IMDB_VOTES).
const SUSPECT_TITLE_REGEX = /\b(sex|sexy|f[u*]ck\w*|erotic\w*|sensu\w*|lust\w*|nude|naked|rape[ds]?|bhabhi|bhauji|aunty|devar|nangi|lund|chut|chudai|kamukta|kama\s*sutra|tharki|uncut|escort|massage|seduc\w*|desi|pinay|vmx|stepmom|stepdad|step\s*(mom|dad|sister|son))\b/i;

// Kata kunci pornografi vulgar pada judul / sinopsis
const ADULT_KEYWORDS_REGEX = /\b(xxx|hentai|porn|porno|jav|pussy|cock|milf|cum|blowjob|bukkake|gangbang|creampie|uncensored|dildo|生ハメ|おまんこ|wife\s*sex|wife\s*sharing|\[18\+\]|\(18\+\))\b/i;

export function isAdultContent(sub: any): boolean {
  if (!sub) return false;

  // 1. Blokir jika sumber stream berasal dari provider dewasa (watchhentai.net, xprimehub.top, dll.)
  if (Array.isArray(sub.resourceDetectors)) {
    for (const r of sub.resourceDetectors) {
      const source = String(r?.source || '');
      const link = String(r?.resourceLink || '');
      const domain = String(r?.domain || '');
      if (
        BLOCKED_SOURCE_DOMAINS_REGEX.test(source) ||
        BLOCKED_SOURCE_DOMAINS_REGEX.test(link) ||
        BLOCKED_SOURCE_DOMAINS_REGEX.test(domain)
      ) {
        return true;
      }
    }
  }

  // 2. Blokir berdasarkan genre konten dewasa (misal web series 18+ KiwiTv/xprimehub)
  const genre = String(sub.genre || '').toLowerCase();
  if (ADULT_GENRES.some((g) => genre.includes(g))) {
    return true;
  }
  const obscure = Number(sub.imdbRatingCount || 0) < MAINSTREAM_MIN_IMDB_VOTES;
  if (obscure && (EROTIC_GENRES.some((g) => genre.includes(g)) || SUSPECT_TITLE_REGEX.test(String(sub.title || '')))) {
    return true;
  }

  // 3. Anime dengan restrictKid: 1 adalah anime hentai (e.g. Dark Blue, Wife With Wife)
  if (genre.includes('anime') && sub.restrictKid === 1) {
    return true;
  }

  // 4. Blokir judul / deskripsi dengan kata kunci pornografi vulgar eksplisit
  const title = String(sub.title || '');
  const desc = String(sub.description || '');
  if (ADULT_KEYWORDS_REGEX.test(title) || ADULT_KEYWORDS_REGEX.test(desc)) {
    return true;
  }

  return false;
}

export function isAllowedSubjectType(subjectType?: number): boolean {
  return typeof subjectType === 'number' && ALLOWED_SUBJECT_TYPES.has(subjectType);
}

export function filterSubjects(subjects: Subject[] | undefined): Subject[] {
  if (!Array.isArray(subjects)) return [];
  return subjects.filter(
    (item) => isAllowedSubjectType(item.subjectType) && !isAdultContent(item) && item.hasResource !== false
  );
}

export function normalizeCover(url?: string, targetWidth: number = 300) {
  const raw = String(url || '').trim();
  let normalizedUrl = 'https://h5.aoneroom.com/favicon.ico'; // fallback

  if (raw) {
    if (raw.startsWith('//')) {
      normalizedUrl = `https:${raw}`;
    } else if (raw.startsWith('/')) {
      normalizedUrl = `https://pbcdn.aoneroom.com${raw}`;
    } else if (!/^https?:\/\//i.test(raw)) {
      normalizedUrl = `https://${raw}`;
    } else {
      normalizedUrl = raw;
    }
  }

  // Optimize image load by appending Aliyun OSS resize and format conversion parameters if CDN host matches
  if (normalizedUrl.includes('.aoneroom.com') && !normalizedUrl.includes('x-oss-process')) {
    normalizedUrl += `?x-oss-process=image/resize,w_${targetWidth}/format,webp`;
  }

  return {
    url: normalizedUrl,
    width: targetWidth,
    height: Math.round(targetWidth * 1.5),
  };
}

export function normalizeSubject(sub: any): Subject {
  const subjectId = String(sub.subjectId || '');
  return {
    subjectId,
    subjectType:
      typeof sub.subjectType === 'number'
        ? sub.subjectType
        : /\bS\d+\b|Season\s*\d+/i.test(sub.title || '')
        ? SubjectType.Series
        : SubjectType.Movie,
    title: sub.title || '',
    description: sub.description || '',
    releaseDate: sub.releaseDate || '1970-01-01',
    duration:
      typeof sub.seconds === 'number'
        ? Math.round(sub.seconds / 60)
        : typeof sub.duration === 'number'
        ? sub.duration
        : 0,
    genre: sub.genre || '',
    cover: normalizeCover(sub.cover?.url),
    countryName: sub.countryName || '',
    imdbRatingValue: sub.imdbRatingValue || sub.imdbRate || '0.0',
    imdbRatingCount: sub.imdbRatingCount || 0,
    hasResource: typeof sub.hasResource === 'boolean' ? sub.hasResource : true,
    detailPath: `/detail/${subjectId}`,
    h5DetailPath: sub.detailPath || sub.h5DetailPath || sub.path || '',
    staffList: Array.isArray(sub.staffList)
      ? sub.staffList.map((st: any) => ({
          staffId: String(st.staffId || ''),
          staffType: typeof st.staffType === 'number' ? st.staffType : 1,
          name: st.name || '',
          character: st.character || '',
          avatarUrl: st.avatarUrl || '',
          detailPath: `/staff/${st.staffId}`,
        }))
      : [],
    dubs: Array.isArray(sub.dubs)
      ? sub.dubs.map((d: any) => ({
          subjectId: String(d.subjectId || ''),
          lanName: String(d.lanName || ''),
          lanCode: String(d.lanCode || ''),
          original: Boolean(d.original),
          type: typeof d.type === 'number' ? d.type : 0,
          detailPath: String(d.detailPath || ''),
        }))
      : [],
    coverHorizontalUrl: sub.coverHorizontalUrl || sub.coverHorizontal || sub.horizontalCover || sub.highCover || '',
    restrictKid: typeof sub.restrictKid === 'number' ? sub.restrictKid : 0,
    resourceDetectors: Array.isArray(sub.resourceDetectors)
      ? sub.resourceDetectors.map((r: any) => {
          let domain = '';
          try {
            if (r.resourceLink && /^https?:\/\//i.test(r.resourceLink)) {
              const u = new URL(r.resourceLink);
              domain = u.hostname;
            } else if (r.source) {
              domain = r.source.split(' ')[0].replace(/[^a-zA-Z0-9.-]/g, '');
            }
          } catch {}
          return {
            source: String(r.source || domain || ''),
            resourceLink: String(r.resourceLink || ''),
            domain: domain || String(r.source || ''),
            uploadBy: String(r.uploadBy || ''),
            totalEpisode: typeof r.totalEpisode === 'number' ? r.totalEpisode : undefined,
            totalSize: String(r.totalSize || ''),
          };
        })
      : [],
  };
}
