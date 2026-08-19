import { Subject, SubjectType } from '@/types/api';
import { ALLOWED_SUBJECT_TYPES } from './config';

// Kategori genre pornografi/dewasa eksplisit dari database MovieBox
const EXPLICIT_ADULT_GENRES = [
  'adult',
  'hentai',
  'ecchi',
  'erotica',
  'porn',
  'porno',
];

// Regex kata kunci pornografi vulgar pada judul atau sinopsis yang membedakan bokep murni vs film bioskop dewasa
const EXPLICIT_ADULT_KEYWORD_REGEX = /\b(xxx|hentai|porn|porno|jav|pussy|cock|milf|cum|blowjob|bukkake|gangbang|creampie|uncensored|dildo|生ハメ|おまんこ)\b/i;

// Blacklist ID spesifik untuk film erotis jadul / khusus yang di database Moviebox menyamar sebagai "Drama" biasa
const BLOCKED_ADULT_SUBJECT_IDS = new Set([
  '2698913074815323160', // Shojo no Kiss-mark
]);

export function isAdultContent(sub: any): boolean {
  if (!sub) return false;

  const subjectId = String(sub.subjectId || sub.id || '');
  if (BLOCKED_ADULT_SUBJECT_IDS.has(subjectId)) {
    return true;
  }

  // 1. Cek Genre Eksplisit (Bokep di MovieBox memakai genre 'Adult', 'Hentai', dsb.)
  const genre = String(sub.genre || '').toLowerCase();
  if (EXPLICIT_ADULT_GENRES.some((g) => genre.includes(g))) {
    return true;
  }

  // 2. Cek Judul & Deskripsi terhadap frasa pornografi vulgar
  const title = String(sub.title || '');
  const desc = String(sub.description || '');
  if (EXPLICIT_ADULT_KEYWORD_REGEX.test(title) || EXPLICIT_ADULT_KEYWORD_REGEX.test(desc)) {
    return true;
  }

  return false;
}

export function isAllowedSubjectType(subjectType?: number): boolean {
  return typeof subjectType === 'number' && ALLOWED_SUBJECT_TYPES.has(subjectType);
}

export function filterSubjects(subjects: Subject[] | undefined): Subject[] {
  if (!Array.isArray(subjects)) return [];
  return subjects.filter((item) => isAllowedSubjectType(item.subjectType) && !isAdultContent(item));
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
  };
}
