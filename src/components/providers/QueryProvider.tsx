'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { NetworkStatus } from '@/components/shared/NetworkStatus';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Global defaults for all queries
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 1000 * 60 * 5, // 5 minutes (prevents hydration refetch jitter)
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NetworkStatus />
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
