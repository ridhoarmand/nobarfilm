import { AnimeApi } from '@/lib/anime-api';
import { AnimeListingPage } from '@/components/anime/AnimeListingPage';

export default async function GenreAnimePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  // Decode the genre name (e.g. "Space%20Opera" -> "Space Opera")
  const decodedName = decodeURIComponent(name);

  const initialData = await AnimeApi.getByGenre(decodedName, 1).catch(() => ({ data: [] }));

  async function fetchMoreAction(page: number) {
    'use server';
    return AnimeApi.getByGenre(decodedName, page);
  }

  return <AnimeListingPage title={`${decodedName} Anime`} initialData={initialData.data} fetchMore={fetchMoreAction} />;
}
