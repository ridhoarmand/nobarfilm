'use client';
import { useParams, useRouter } from 'next/navigation';
import { useDetail } from '@/lib/hooks/useMovieBox';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CastList } from '@/components/detail/CastList';
import { SeasonSelector } from '@/components/detail/SeasonSelector';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Info, Star, Calendar, Clock } from 'lucide-react';

export default function DetailPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;

  const { data, isLoading, error } = useDetail(subjectId);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black pt-16 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black pt-16 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-red-600 mb-4">Not Found</h1>
            <p className="text-gray-300 mb-6">{error?.message || 'Content not available'}</p>
            <button onClick={() => router.push('/')} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
              Back to Homepage
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const { subject, stars, resource } = data;
  const isSeries = subject.subjectType === 2;
  const isMovie = subject.subjectType === 1;

  // For movies: season=0, episode=0
  // For series: season=1, episode=1 (default to first episode)
  const watchUrl = isMovie ? `/watch/${subjectId}?season=0&episode=0` : `/watch/${subjectId}?season=1&episode=1`;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black">
        {/* Hero Section */}
        <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image src={subject.cover.url} alt={subject.title} fill className="object-cover" priority sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end pb-12">
            <div className="max-w-3xl">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">{subject.title}</h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base mb-6">
                {subject.imdbRatingValue && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    <span className="font-semibold text-white">{subject.imdbRatingValue}</span>
                    <span className="text-gray-400">({subject.imdbRatingCount?.toLocaleString()} votes)</span>
                  </div>
                )}

                {subject.releaseDate && (
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(subject.releaseDate).getFullYear()}</span>
                  </div>
                )}

                {subject.duration > 0 && (
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span>{Math.floor(subject.duration / 60)}m</span>
                  </div>
                )}

                <span className="px-3 py-1 bg-zinc-800/80 rounded text-gray-200">{isSeries ? 'Series' : 'Movie'}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Link href={watchUrl} className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105">
                  <Play className="w-6 h-6 fill-current" />
                  <span>Play Now</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
          {/* Description & Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              {subject.description && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Synopsis</h2>
                  <p className="text-gray-300 leading-relaxed">{subject.description}</p>
                </div>
              )}

              {/* Genres */}
              {subject.genre && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {subject.genre.split(',').map((genre, index) => (
                      <span key={index} className="px-4 py-2 bg-zinc-900 rounded-full text-sm text-gray-300">
                        {genre.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Info */}
            <div className="space-y-4 text-sm">
              {subject.countryName && (
                <div>
                  <span className="text-gray-400">Country:</span>
                  <span className="text-white ml-2">{subject.countryName}</span>
                </div>
              )}

              {subject.releaseDate && (
                <div>
                  <span className="text-gray-400">Release Date:</span>
                  <span className="text-white ml-2">{new Date(subject.releaseDate).toLocaleDateString()}</span>
                </div>
              )}

              {resource?.source && (
                <div>
                  <span className="text-gray-400">Source:</span>
                  <span className="text-white ml-2">{resource.source}</span>
                </div>
              )}

              {subject.subtitles && (
                <div>
                  <span className="text-gray-400">Subtitles:</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {subject.subtitles
                      .split(',')
                      .slice(0, 5)
                      .map((sub, i) => (
                        <span key={i} className="px-2 py-1 bg-zinc-900 rounded text-xs text-gray-300">
                          {sub.trim()}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Season/Episode Selector (for Series) */}
          {isSeries && resource?.seasons && <SeasonSelector seasons={resource.seasons} subjectId={subjectId} />}

          {/* Cast */}
          {stars && stars.length > 0 && <CastList cast={stars} />}
        </div>
      </main>

      <Footer />
    </>
  );
}
