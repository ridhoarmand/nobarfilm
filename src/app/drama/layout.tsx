import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PlatformSelector } from '@/components/features/PlatformSelector';

export default function DramaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen pt-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="glass-strong sticky top-20 z-40 border-b border-zinc-800">
            <PlatformSelector />
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
