import { AnimeApi } from '@/lib/anime-api';
import { AnimeListingPage } from '@/components/anime/AnimeListingPage';

export default async function CompletedAnimePage() {
  const initialData = await AnimeApi.getCompleted(1).catch(() => ({ data: [] }));

  async function fetchMoreAction(page: number) {
    'use server';
    return AnimeApi.getCompleted(page);
  }

  return <AnimeListingPage title="Completed Anime" initialData={initialData.data} fetchMore={fetchMoreAction} />;
}
