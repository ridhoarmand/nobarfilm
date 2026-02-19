import { AnimeApi } from '@/lib/anime-api';
import SchedulePage from '@/components/anime/AnimeSchedule';

export default async function Page() {
  const scheduleData = await AnimeApi.getSchedule().catch(() => ({ data: {} }));

  return <SchedulePage schedule={scheduleData.data} />;
}
