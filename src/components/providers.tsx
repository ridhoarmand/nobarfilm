'use client';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error: unknown) => {
            const err = error as { response?: { status?: number }; status?: number };
            if (err?.response?.status === 429 || err?.status === 429) {
              toast.error('Terlalu Cepat! Mohon tunggu sebentar sebelum request lagi.', {
                duration: 5000,
              });
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false, // Disable auto refresh on focus
            refetchOnMount: false, // Disable auto refresh on mount
            refetchOnReconnect: false, // Disable auto refresh on network reconnect
            retry: false, // Never retry automatically on error to prevent request spam
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
