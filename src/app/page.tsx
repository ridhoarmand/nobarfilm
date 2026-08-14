import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { movieBoxQueryKeys } from '@/hooks/useMovieBox';
import { movieBoxService } from '@/lib/moviebox';
import { HomeClient } from './HomeClient';

export const dynamic = 'force-dynamic';

export default async function MoviePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity, // Ensure serialized data is considered fresh immediately
        gcTime: 1000 * 60 * 60,
      },
    },
  });

  // Prefetch critical data on the server in PARALLEL to minimize TTFB
  try {
    await queryClient.prefetchQuery({
      queryKey: movieBoxQueryKeys.homepage,
      queryFn: () => movieBoxService.getHomepage(),
    });
  } catch (error) {
    console.error('[SSR Prefetch] Error:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeClient />
    </HydrationBoundary>
  );
}
