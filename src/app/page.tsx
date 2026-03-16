import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { movieBoxQueryKeys } from '@/hooks/useMovieBox';
import { movieBoxService } from '@/lib/moviebox';
import { HomeClient } from './HomeClient';

// Enable ISR/Caching for the whole page
export const revalidate = 600; // 10 minutes

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
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: movieBoxQueryKeys.homepage,
        queryFn: () => movieBoxService.getHomepage(),
      }),
      queryClient.prefetchInfiniteQuery({
        queryKey: ['moviebox', 'trending', 'infinite'],
        queryFn: ({ pageParam }) => movieBoxService.getTrending(pageParam as number),
        initialPageParam: 0,
      }),
    ]);
  } catch (error) {
    console.error('[SSR Prefetch] Error:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeClient />
    </HydrationBoundary>
  );
}
