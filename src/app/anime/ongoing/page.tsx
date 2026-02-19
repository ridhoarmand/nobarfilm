import { AnimeApi } from '@/lib/anime-api';import { AnimeListingPage } from '@/components/anime/AnimeListingPage';

export default async function OngoingAnimePage() {
  const initialData = await AnimeApi.getOngoing(1).catch(() => ({ data: [] }));

  async function fetchMoreAction(page: number) {
    'use server';
    return AnimeApi.getOngoing(page);
  }

  return <AnimeListingPage title="Rilisan Terbaru" initialData={initialData.data} fetchMore={fetchMoreAction} />;
}
