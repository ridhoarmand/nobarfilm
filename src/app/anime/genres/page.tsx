import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AnimeApi } from '@/lib/anime-api';
import Link from 'next/link';

export default async function AnimeGenresPage() {
  const genres = await AnimeApi.getGenres().catch(() => ({ data: [] }));

  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1920px] mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8 border-l-4 border-red-600 pl-4">Browse by Genre</h1>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {genres.data?.map((genre) => (
              <Link key={genre.id} href={`/anime/genre/${genre.name}`} className="p-6 bg-zinc-900 hover:bg-red-600 rounded-xl border border-white/5 transition-all text-center group">
                <span className="text-lg font-bold text-gray-300 group-hover:text-white transition-colors">{genre.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
