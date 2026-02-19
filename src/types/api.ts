// Sansekai MovieBox API Types// Based on documented API responses// ============================================// Common Types
// ============================================

export interface Image {
  url: string;
  width: number;
  height: number;
  size?: number;
  format?: string;
  thumbnail?: string;
  blurHash?: string;
  gif?: string | null;
  avgHueLight?: string;
  avgHueDark?: string;
  id?: string;
}

export interface Pager {
  hasMore: boolean;
  nextPage: string;
  page: string;
  perPage: number;
  totalCount: number;
}

export enum SubjectType {
  Movie = 1,
  Series = 2,
  Education = 5,
  Music = 6,
  Short = 7,
}

// ============================================
// Movie/Series Subject Types
// ============================================

export interface Subject {
  subjectId: string;
  subjectType: SubjectType;
  title: string;
  description?: string;
  releaseDate: string;
  duration: number;
  genre: string; // comma-separated
  cover: Image;
  countryName: string;
  imdbRatingValue: string;
  imdbRatingCount: number;
  subtitles?: string; // comma-separated languages
  ops?: string;
  hasResource: boolean;
  trailer?: Trailer | null;
  detailPath: string;
  staffList?: Staff[];
  appointmentCnt?: number;
  appointmentDate?: string;
  corner?: string;
  stills?: Image | null;
  postTitle?: string;
  thumbnail?: string;
  recommendation_reason?: string;
}

export interface Staff {
  staffId: string;
  staffType: number;
  name: string;
  character: string;
  avatarUrl: string;
  detailPath: string;
}

export interface Trailer {
  videoAddress: {
    videoId: string;
    definition: string;
    url: string;
    duration: number;
    width: number;
    height: number;
    size: number;
    fps: number;
    bitrate: number;
    type: number;
  };
  cover: Image;
}

// ============================================
// Homepage Types
// ============================================

export interface HomepageResponse {
  topPickList: Subject[];
  homeList: OperatingSection[];
  url: string;
  referer: string;
  allPlatform: Platform[];
  banner: BannerSection | null;
  live: LiveMatch[] | null;
  platformList: Platform[];
  shareParam: Record<string, unknown> | null;
  operatingList: OperatingSection[];
}

export interface Platform {
  name: string;
  uploadBy: string;
}

export type SectionType = 'BANNER' | 'FILTER' | 'SUBJECTS_MOVIE' | 'SPORT_LIVE' | 'CUSTOM';

export interface OperatingSection {
  type: SectionType;
  position: number;
  title: string;
  subjects?: Subject[];
  banner?: BannerSection;
  filters?: FilterItem[];
  liveList?: LiveMatch[];
  url?: string;
  path?: string;
}

export interface BannerSection {
  items: BannerItem[];
}

export interface BannerItem {
  id: string;
  title: string;
  image: Image;
  url: string;
  subjectId: string;
  subjectType: SubjectType;
  subject: Subject;
}

export interface FilterItem {
  title: string;
  url: string;
  image: Image;
}

export interface LiveMatch {
  matchId: string;
  team1: { name: string; score: string };
  team2: { name: string; score: string };
  startTime: string;
  status: string;
}

// ============================================
// Trending Types
// ============================================

export interface TrendingResponse {
  subjectList: Subject[];
  pager: Pager;
}

// ============================================
// Search Types
// ============================================

export interface SearchResponse {
  items: Subject[];
  pager: Pager;
  counts: ContentTypeCount[];
  url: string;
  referer: string;
}

export interface ContentTypeCount {
  subjectType: number;
  name: string;
  num: number;
}

// ============================================
// Detail Types
// ============================================

export interface DetailResponse {
  subject: Subject;
  stars: Staff[];
  resource: ResourceInfo;
  metadata: MetadataInfo;
  url: string;
  referer: string;
  isForbid: boolean;
  watchTimeLimit: number;
}

export interface ResourceInfo {
  seasons: Season[];
  source: string;
  uploadBy: string;
}

export interface Season {
  se: number; // 0 for movies, >= 1 for series
  maxEp: number; // 0 for movies
  allEp: string;
  resolutions: Resolution[];
}

export interface Resolution {
  resolution: number; // 360, 480, 720, 1080
  epNum: number;
}

export interface MetadataInfo {
  title: string;
  description: string;
  keyWords?: string; // comma-separated
  image: string;
  url: string;
  referer: string;
}

// ============================================
// Sources Types
// ============================================

export interface SourcesResponse {
  downloads: DownloadSource[];
  captions: Caption[];
  processedSources: ProcessedSource[];
  limited: boolean;
  limitedCode: string;
  freeNum: number;
  hasResource: boolean;
}

export interface DownloadSource {
  id: string;
  url: string;
  resolution: number;
  size: string; // bytes as string
}

export interface Caption {
  id: string;
  lan: string; // language code (e.g., "en", "in_id")
  lanName: string; // display name
  url: string; // SRT file URL (CloudFront signed)
  size: string;
  delay: number;
}

export interface ProcessedSource {
  id: string;
  quality: number;
  directUrl: string;
  size: string;
  format: string; // "mp4"
}

// ============================================
// Generate Stream Link Types
// ============================================

export interface GenerateStreamResponse {
  success: boolean;
  message: string;
  instruction?: string;
  streamUrl: string; // Proxy URL for playback
  fileInfo: FileInfo;
}

export interface FileInfo {
  size: number;
  sizeFormatted: string;
  contentType: string;
}

// ============================================
// Error Types
// ============================================

export interface ApiError {
  message: string;
  statusCode?: number;
  endpoint?: string;
}
