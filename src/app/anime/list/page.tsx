'use client';import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { Anime } from '@/types/anime';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AnimeDirectoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '#'; // Default to '#'

  const [data, setData] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);

  const letters = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  useEffect(() => {
    fetchAnime(query);
  }, [query]);

  const fetchAnime = async (letter: string) => {
    setLoading(true);
    try {
      // Use the new anime-list endpoint which supports initial letter filtering
      const res = await fetch(`/api/anime/list?initial=${encodeURIComponent(letter)}&page=1`);
      const json = await res.json();

      const filtered =
        json.data?.filter((item: Anime) => {
          if (letter === '#') return !/^[a-zA-Z]/.test(item.title);
          return item.title.toLowerCase().startsWith(letter.toLowerCase());
        }) || [];

      setData(filtered);
    } catch (error) {
      console.error('Failed to fetch anime directory:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLetterClick = (letter: string) => {
    router.push(`/anime/list?q=${letter}`);
  };

  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1920px] mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8 border-l-4 border-red-600 pl-4">Anime Directory</h1>

          {/* Letter Navigation */}
          <div className="flex flex-wrap gap-2 justify-center mb-8 bg-zinc-900/50 p-4 rounded-xl border border-white/5">
            {letters.map((letter) => (
              <button
                key={letter}
                onClick={() => handleLetterClick(letter)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                  query === letter ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
            </div>
          ) : (
            <>
              {data.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
                  {data.map((anime, index) => (
                    <AnimeCard key={`${anime.id}-${index}`} anime={anime} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">No anime found starting with &quot;{query}&quot;.</div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
