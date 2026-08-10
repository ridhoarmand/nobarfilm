import type { Metadata } from 'next';
import { movieBoxService } from '@/lib/moviebox';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  if (!id || id.includes('.') || id === 'favicon.ico') {
    return {
      title: 'NobarFilm Detail',
      description: 'Stream film dan serial TV terbaru gratis tanpa iklan di NobarFilm.',
    };
  }

  try {
    const detail = await movieBoxService.getDetail(id);
    if (detail && detail.subject) {
      const sub = detail.subject;
      const title = `Nonton ${sub.title} Subtitle Indonesia | NobarFilm`;
      const ratingInfo = sub.imdbRatingValue && sub.imdbRatingValue !== '0.0' ? ` ⭐ ${sub.imdbRatingValue}` : '';
      const rawDesc = sub.description ? sub.description.replace(/\s+/g, ' ').trim() : '';
      const desc = rawDesc
        ? `${rawDesc.slice(0, 150)}${rawDesc.length > 150 ? '...' : ''}${ratingInfo}`
        : `Nonton film ${sub.title}${ratingInfo} subtitle indonesia gratis dengan kualitas HD tanpa iklan di NobarFilm.`;

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
    console.error(`[Metadata] Failed to generate OpenGraph metadata for subject ${id}:`, e);
  }

  return {
    title: 'Nonton Film & Series Subtitle Indonesia | NobarFilm',
    description: 'Stream film dan serial TV terbaru gratis tanpa iklan di NobarFilm.',
  };
}

export default function DetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
