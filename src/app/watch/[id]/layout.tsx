import type { Metadata } from 'next';
import { movieBoxService } from '@/lib/moviebox';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ se?: string; ep?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sParams = (await searchParams) || {};
  const se = sParams.se;
  const ep = sParams.ep;

  if (!id || id.includes('.') || id === 'favicon.ico') {
    return {
      title: '▶️ NobarFilm Player',
      description: 'Stream film dan serial TV terbaru gratis tanpa iklan di NobarFilm.',
    };
  }

  const seasonNum = parseInt(se || '0', 10);
  const episodeNum = parseInt(ep || '0', 10);

  try {
    const detail = await movieBoxService.getDetail(id);
    if (detail && detail.subject) {
      const sub = detail.subject;
      const isSeries = sub.subjectType === 2 || seasonNum > 0 || episodeNum > 0;
      const epLabel = isSeries ? ` (S${seasonNum || 1} Ep${episodeNum || 1})` : '';

      const title = `▶️ Putar ${sub.title}${epLabel} Subtitle Indonesia | NobarFilm`;
      const desc = `Putar langsung ${sub.title}${epLabel} subtitle indonesia gratis dengan kualitas HD tanpa iklan di NobarFilm.`;

      const rawCover = sub.coverHorizontalUrl || sub.cover?.url || '/nobarfilm.jpg';
      let imageUrl = rawCover;
      if (imageUrl.startsWith('//')) imageUrl = `https:${imageUrl}`;
      if (!imageUrl.startsWith('http')) imageUrl = `https://nobarfilm.cc${imageUrl}`;

      return {
        title,
        description: desc,
        openGraph: {
          title,
          description: desc,
          type: 'video.movie',
          locale: 'id_ID',
          siteName: 'NobarFilm',
          images: [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: sub.title,
            },
          ],
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description: desc,
          images: [imageUrl],
        },
      };
    }
  } catch (e) {
    console.error(`[Metadata] Failed to generate watch page metadata for subject ${id}:`, e);
  }

  return {
    title: '▶️ Watch Player | NobarFilm',
    description: 'Stream film dan serial TV terbaru gratis tanpa iklan di NobarFilm.',
  };
}

export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
