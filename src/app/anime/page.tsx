import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import { AnimeApi } from '@/lib/anime-api';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { Play, Calendar, Star, Info, ListFilter, Grid } from 'lucide-react';
import Link from 'next/link';

export default async function AnimePage() {
  const ongoing = await AnimeApi.getOngoing(1).catch(() => ({ data: [] }));
  const completed = await AnimeApi.getCompleted(1).catch(() => ({ data: [] }));
  // const genres = await AnimeApi.getGenres().catch(() => ({ data: [] }));

  // Pick a random featured anime from ongoing list
  const featured = ongoing.data && ongoing.data.length > 0 ? ongoing.data[0] : null;

  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen pb-20">
        {/* Hero Section */}
        {featured && (
          <div className="relative h-[80vh] w-full overflow-hidden">
            {/* Background Image with Blur */}
            <div className="absolute inset-0">
              <Image src={featured.thumb} alt={featured.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20">
                <div className="flex flex-col md:flex-row gap-8 items-end">
                  <div className="w-full md:w-2/3 space-y-6">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">Ongoing</span>
                      {featured.score && (
                        <div className="flex items-center gap-1 text-yellow-400 text-sm font-medium">
                          <Star className="w-4 h-4 fill-current" />
                          <span>{featured.score}</span>
                        </div>
                      )}
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black text-white leading-tight line-clamp-3">{featured.title}</h1>

                    <div className="flex items-center gap-4 text-sm text-gray-300">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{featured.broadcast_day || 'Unknown Day'}</span>
                      </div>
                      <span>•</span>
                      <span>{featured.total_episodes ? `${featured.total_episodes} Episodes` : '? Episodes'}</span>
                    </div>

                    <p className="text-gray-300 text-lg line-clamp-3 max-w-2xl">{featured.synopsis || 'No synopsis available.'}</p>

                    <div className="flex flex-wrap gap-4 pt-4">
                      <Link href={`/anime/${featured.endpoint}`} className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-2 transition-colors">
                        <Play className="w-5 h-5 fill-current" />
                        Watch Now
                      </Link>
                      <Link
                        href={`/anime/${featured.endpoint}`}
                        className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg flex items-center gap-2 backdrop-blur-sm transition-colors"
                      >
                        <Info className="w-5 h-5" />
                        Details
                      </Link>
                    </div>
                  </div>

                  {/* Poster Card (Hidden on mobile) */}
                  <div className="hidden md:block w-1/3 relative z-10">
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-2xl shadow-red-600/20 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                      <Image src={featured.thumb} alt={featured.title} fill className="object-cover" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          <Link href="/anime/schedule" className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-red-600 rounded-xl transition-all font-bold whitespace-nowrap">
            <Calendar className="w-5 h-5" /> Schedule
          </Link>
          <Link href="/anime/genres" className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-blue-600 rounded-xl transition-all font-bold whitespace-nowrap">
            <Grid className="w-5 h-5" /> Genres
          </Link>
          <Link href="/anime/list" className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-green-600 rounded-xl transition-all font-bold whitespace-nowrap">
            <ListFilter className="w-5 h-5" /> Directory (A-Z)
          </Link>
        </div>

        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
          {/* Ongoing Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1 h-8 bg-red-600 rounded-full" />
                Rilisan Terbaru
              </h2>
              <Link href="/anime/ongoing" className="text-sm text-gray-400 hover:text-red-500 transition-colors">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
              {ongoing.data?.slice(0, 14).map((item) => (
                <AnimeCard key={item.id} anime={item} />
              ))}
            </div>
          </section>

          {/* Completed Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1 h-8 bg-blue-600 rounded-full" />
                Completed Anime
              </h2>
              <Link href="/anime/completed" className="text-sm text-gray-400 hover:text-red-500 transition-colors">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
              {completed.data?.slice(0, 14).map((item) => (
                <AnimeCard key={item.id} anime={item} />
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
