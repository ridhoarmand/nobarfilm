import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ServiceWorkerRegistration } from '@/components/providers/ServiceWorkerRegistration';

import { ClientToaster } from '@/components/layout/ClientToaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'NobarFilm 🎬 Nonton Film & Series Subtitle Indonesia Gratis HD',
  description: 'Platform streaming film dan serial TV subtitle indonesia gratis tanpa iklan dengan kualitas HD!',
  keywords: 'nobarfilm, streaming film, series subtitle indonesia, nonton anime, nonton film gratis, bioskop online',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://nobarfilm.cc'),
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'NobarFilm',
    title: 'NobarFilm 🎬 Nonton Film & Series Subtitle Indonesia Gratis HD',
    description: 'Platform streaming film dan serial TV subtitle indonesia gratis tanpa iklan dengan kualitas HD!',
    images: [
      {
        url: '/nobarfilm.jpg',
        width: 1200,
        height: 630,
        alt: 'NobarFilm Cinema Streaming',
      },
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'NobarFilm App Icon',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NobarFilm 🎬 Nonton Film & Series Subtitle Indonesia Gratis HD',
    description: 'Platform streaming film dan serial TV subtitle indonesia gratis tanpa iklan dengan kualitas HD!',
    images: ['/nobarfilm.jpg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NobarFilm',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#141414',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <head>
        <link rel="preconnect" href="https://wsrv.nl" />
        <link rel="preconnect" href="https://images.weserv.nl" />
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prerender: [
                {
                  source: 'list',
                  urls: [],
                },
              ],
              prefetch: [
                {
                  urls: [],
                },
              ],
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased text-white selection:bg-red-500/30">
        <ServiceWorkerRegistration />
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>

        <ClientToaster />
      </body>
    </html>
  );
}
