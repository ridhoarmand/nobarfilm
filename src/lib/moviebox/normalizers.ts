import { Subject, SubjectType } from '@/types/api';
import { ALLOWED_SUBJECT_TYPES } from './config';

export function isAllowedSubjectType(subjectType?: number): boolean {
  return typeof subjectType === 'number' && ALLOWED_SUBJECT_TYPES.has(subjectType);
}

export function filterSubjects(subjects: Subject[] | undefined): Subject[] {
  if (!Array.isArray(subjects)) return [];
  return subjects.filter((item) => isAllowedSubjectType(item.subjectType));
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
    h5DetailPath: sub.detailPath || '',
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
