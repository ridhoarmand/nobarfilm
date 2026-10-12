export type OtherSubtitleContext = {
  mediaKey: string;
  title: string;
  type: 'movie' | 'tv';
  year?: number;
  season?: number;
  episode?: number;
};

export type OtherSubtitleTitle = {
  id: string;
  title: string;
  type: 'movie' | 'tv';
  year: number | null;
};

export type OtherSubtitleResult = {
  id: string;
  token: string;
  release: string;
  language: 'id';
};

export type OtherSubtitleDownload = {
  label: string;
  text: string;
};
