import { Navbar } from '@/components/layout/Navbar';import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import { AnimeApi } from '@/lib/anime-api';
import { AnimePlayer } from '@/components/anime/AnimePlayer';
import { ResolutionDownloadDropdown } from '@/components/anime/ResolutionDownloadDropdown';
import { ChevronLeft, ChevronRight, Home, List } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function AnimeWatchPage({ params }: { params: Promise<{ slug: string; episode: string }> }) {
  const { slug, episode } = await params;
  const animeData = await AnimeApi.getEpisode(episode).catch(() => null);

  if (!animeData || !animeData.status || !animeData.data) {
    notFound();
  }

  const data = animeData.data;
  const animeInfo = data.anime; // Basic anime info from episode response

  // Downloads grouped by resolution
  const downloads = data.downloads || {};

  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb / Navigation */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 overflow-x-auto pb-2">
            <Link href="/anime" className="hover:text-red-500 transition-colors flex items-center gap-1">
              <Home className="w-4 h-4" /> Home
            </Link>
            <span>/</span>
            <Link href={`/anime/${slug}`} className="hover:text-red-500 transition-colors whitespace-nowrap">
              {animeInfo?.title || 'Anime Details'}
            </Link>
            <span>/</span>
            <span className="text-white font-medium whitespace-nowrap text-red-500">Episode {data.episode_number}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content (Player) */}
            <div className="lg:col-span-2 space-y-6">
              <h1 className="text-xl md:text-2xl font-bold leading-tight">{data.title}</h1>

              <AnimePlayer streams={data.streams || []} title={data.title} />

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-4">
                {data.prev_episode ? (
                  <Link
                    href={`/anime/${slug}/${data.prev_episode}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-white/5 hover:border-red-500/30 transition-all font-medium"
                  >
                    <ChevronLeft className="w-5 h-5" /> Previous
                  </Link>
                ) : (
                  <div className="flex-1" /> // Spacer
                )}

                <Link
                  href={`/anime/${slug}`}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-white/5 hover:border-red-500/30 transition-all text-gray-400 hover:text-white"
                >
                  <List className="w-5 h-5" />
                </Link>

                {data.next_episode ? (
                  <Link
                    href={`/anime/${slug}/${data.next_episode}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold transition-all shadow-lg shadow-red-900/20"
                  >
                    Next <ChevronRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <div className="flex-1" /> // Spacer
                )}
              </div>
            </div>

            {/* Sidebar (Info & Downloads) */}
            <div className="space-y-6">
              {/* Anime Info Card */}
              <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/5">
                <div className="flex gap-4">
                  <div className="relative w-20 h-28 shrink-0">
                    <Image src={animeInfo?.thumb || ''} alt={animeInfo?.title || ''} fill className="object-cover rounded-md shadow-lg" />
                  </div>
                  <div>
                    <h3 className="font-bold line-clamp-2 mb-1">
                      <Link href={`/anime/${slug}`} className="hover:text-red-500 transition-colors">
                        {animeInfo?.title}
                      </Link>
                    </h3>
                    <p className="text-xs text-gray-400">Released: {data.date}</p>
                  </div>
                </div>
              </div>

              {/* Downloads */}
              <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/5">
                <h3 className="font-bold mb-4 text-white">Downloads</h3>
                <ResolutionDownloadDropdown downloads={downloads} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
