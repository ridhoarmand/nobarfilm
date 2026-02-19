import { Navbar } from '@/components/layout/Navbar';import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import { AnimeApi } from '@/lib/anime-api';
import { Play, Calendar, Star, Info, Hash, Clock, MonitorPlay, Download } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function AnimeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const anime = await AnimeApi.getDetail(slug).catch(() => null);

  if (!anime || !anime.status || !anime.data) {
    notFound();
  }

  const data = anime.data;

  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen text-white pb-20 pt-16 sm:pt-20">
        {/* Backdrop */}
        <div className="relative h-[30vh] sm:h-[40vh] md:h-[55vh] w-full overflow-hidden">
          <Image src={data.thumb} alt={data.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </div>

        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-24 md:-mt-56 relative z-10">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Poster */}
            <div className="w-32 sm:w-40 md:w-1/4 shrink-0">
              <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 relative">
                <Image src={data.thumb} alt={data.title} fill className="object-cover" priority />
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 text-xs font-bold uppercase rounded-md ${data.status === 'Ongoing' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>{data.status}</span>
                </div>
              </div>

              {/* Quick Info Grid (Mobile) */}
              <div className="grid grid-cols-2 gap-2 mt-4 md:hidden text-sm">
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5 text-center">
                  <div className="text-gray-400 text-xs uppercase mb-1">Score</div>
                  <div className="font-bold text-yellow-500 flex items-center justify-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> {data.score || '-'}
                  </div>
                </div>
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5 text-center">
                  <div className="text-gray-400 text-xs uppercase mb-1">Type</div>
                  <div className="font-bold text-white">{data.type || 'TV'}</div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="w-full md:w-3/4 space-y-8 pt-4">
              <div>
                <h1 className="text-3xl md:text-5xl font-black leading-tight mb-2">{data.title}</h1>
                {data.japanese_title && <h2 className="text-xl text-gray-400 font-medium">{data.japanese_title}</h2>}

                {/* Genres */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {data.genres?.map((g) => (
                    <Link key={g.id} href={`/anime/genre/${g.name}`} className="px-3 py-1 bg-white/10 hover:bg-red-600 rounded-full text-xs font-medium transition-colors border border-white/5">
                      {g.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 hover:border-red-500/30 transition-colors">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs uppercase font-bold tracking-wider">Score</span>
                  </div>
                  <p className="text-xl font-bold">{data.score || 'N/A'}</p>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 hover:border-red-500/30 transition-colors">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-xs uppercase font-bold tracking-wider">Duration</span>
                  </div>
                  <p className="text-lg font-semibold truncate">{data.duration || 'Unknown'}</p>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 hover:border-red-500/30 transition-colors">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <MonitorPlay className="w-4 h-4 text-green-500" />
                    <span className="text-xs uppercase font-bold tracking-wider">Studio</span>
                  </div>
                  <p className="text-lg font-semibold truncate">{data.studio || 'Unknown'}</p>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 hover:border-red-500/30 transition-colors">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span className="text-xs uppercase font-bold tracking-wider">Aired</span>
                  </div>
                  <p className="text-sm font-semibold">{data.release_date || 'Unknown'}</p>
                </div>
              </div>

              {/* Synopsis */}
              <div className="bg-zinc-900/30 rounded-2xl p-6 border border-white/5 text-gray-300 leading-relaxed whitespace-pre-line">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                  <Info className="w-5 h-5 text-red-500" />
                  Synopsis
                </h3>
                {data.synopsis}
              </div>

              {/* Episodes List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Hash className="w-6 h-6 text-red-500" />
                    Episodes
                  </h3>
                  <span className="text-sm text-gray-400">{data.episodes?.length || 0} Episodes Available</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {data.episodes?.map((ep) => {
                    const epNumber = ep.title.match(/Episode\s+(\d+)/i)?.[1] || ep.episode_number;
                    return (
                      <Link
                        key={ep.id}
                        href={`/anime/${slug}/${ep.endpoint}`}
                        className="group relative bg-zinc-900 hover:bg-zinc-800 rounded-lg p-4 border border-white/5 hover:border-red-500/50 transition-all flex flex-col justify-between h-full"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-xs text-gray-500 uppercase tracking-widest">Episode</div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-4 h-4 text-red-500 fill-current" />
                            </div>
                          </div>
                          <div className="text-2xl font-black text-white group-hover:text-red-500 transition-colors mb-1">{epNumber}</div>
                        </div>
                        <div className="mt-2 text-[10px] text-gray-400 truncate">{ep.date}</div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Batch List */}
              {data.batches && data.batches.length > 0 && (
                <div className="space-y-6 pt-8 border-t border-white/5">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Download className="w-6 h-6 text-blue-500" />
                    Batch Downloads
                  </h3>
                  {/* Assuming Batch page is not yet implemented or just links */}
                  <div className="grid gap-3">
                    {data.batches.map((batch) => (
                      <div key={batch.id} className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <span className="font-medium text-gray-300">{batch.title}</span>
                        <div className="text-sm text-gray-500">Batch download functionality pending</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
