'use client';
import { notFound} from 'next/navigation';
import { useEffect } from 'react';
import { usePlatform } from '@/hooks/usePlatform';
import { DracinSection } from '@/components/dracin/DracinSection';
import { ReelShortSection } from '@/components/sections/ReelShortSection';
import { NetShortHome } from '@/components/sections/NetShortHome';
import { MeloloHome } from '@/components/sections/MeloloHome';
import { FlickReelsHome } from '@/components/sections/FlickReelsHome';
import { FreeReelsHome } from '@/components/sections/FreeReelsHome';
import { useLatestDramas, useTrendingDramas, useDubindoDramas } from '@/hooks/useDramas';
import { InfiniteDracinSection } from '@/components/dracin/InfiniteDracinSection';
import { Platform } from '@/hooks/usePlatform';
import { use } from 'react';

// Platform contents
const PlatformContent = ({ platform }: { platform: Platform }) => {
  // Fetch data for DramaBox (only used if platform is dramabox)
  const { data: latestDramas, isLoading: loadingLatest, error: errorLatest, refetch: refetchLatest } = useLatestDramas();
  const { data: trendingDramas, isLoading: loadingTrending, error: errorTrending, refetch: refetchTrending } = useTrendingDramas();
  const { data: dubindoDramas, isLoading: loadingDubindo, error: errorDubindo, refetch: refetchDubindo } = useDubindoDramas();

  switch (platform) {
    case 'dramabox':
      return (
        <div className="container px-4 py-6 space-y-8 max-w-[2400px]">
          <DracinSection title="Terbaru" dramas={latestDramas} isLoading={loadingLatest} error={!!errorLatest} onRetry={() => refetchLatest()} />
          <DracinSection title="Terpopuler" dramas={trendingDramas} isLoading={loadingTrending} error={!!errorTrending} onRetry={() => refetchTrending()} />
          <DracinSection title="Dubindo" dramas={dubindoDramas} isLoading={loadingDubindo} error={!!errorDubindo} onRetry={() => refetchDubindo()} />
          <InfiniteDracinSection title="Lainnya" />
        </div>
      );
    case 'reelshort':
      return (
        <div className="container px-4 py-6 space-y-8 max-w-[2400px]">
          <ReelShortSection />
        </div>
      );
    case 'netshort':
      return (
        <div className="container px-4 py-6 space-y-8 max-w-[2400px]">
          <NetShortHome />
        </div>
      );
    case 'melolo':
      return (
        <div className="container px-4 py-6 space-y-8 max-w-[2400px]">
          <MeloloHome />
        </div>
      );
    case 'flickreels':
      return (
        <div className="container px-4 py-6 space-y-8 max-w-[2400px]">
          <FlickReelsHome />
        </div>
      );
    case 'freereels':
      return (
        <div className="container px-4 py-6 space-y-8 max-w-[2400px]">
          <FreeReelsHome />
        </div>
      );
    default:
      return null;
  }
};

export default function DracinPlatformPage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = use(params);
  const { setPlatform, platforms } = usePlatform();
  // const router = useRouter();

  const isValidPlatform = platforms.some((p) => p.id === platform);

  useEffect(() => {
    if (isValidPlatform) {
      setPlatform(platform as Platform);
    }
  }, [platform, isValidPlatform, setPlatform]);

  if (!isValidPlatform) {
    return notFound();
  }

  return <PlatformContent platform={platform as Platform} />;
}
