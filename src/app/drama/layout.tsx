'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PlatformSelector } from '@/components/features/PlatformSelector';
import { usePathname } from 'next/navigation';

export default function DramaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWatchPage = pathname.includes('/drama/watch');

  if (isWatchPage) {
    return <div className="bg-black min-h-screen">{children}</div>;
  }

  const isMainDramaPage = pathname === '/drama';

  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen sm:px-6 lg:px-8">
        <div className="max-w-[2400px] mx-auto">
          {isMainDramaPage && (
            <div className="bg-zinc-950 sticky top-[64px] z-40 border-b border-white/5">
              <PlatformSelector />
            </div>
          )}
          <div className="w-full">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
