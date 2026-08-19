'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMovieBoxDetail } from '@/hooks/useMovieBox';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CastList } from '@/components/detail/CastList';
import { SeasonSelector } from '@/components/detail/SeasonSelector';
import { DownloadModal } from '@/components/detail/DownloadModal';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Star, Calendar, Clock, Download, Globe, Share2, Heart, Users } from 'lucide-react';
import { WatchPartyJoinModal } from '@/components/party/WatchPartyJoinModal';
import { useWatchPartyStore } from '@/stores/watchPartyStore';
import toast from 'react-hot-toast';

export default function DetailPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;
  const { toggleWatchlist, isInWatchlist } = useWatchlist();

  const activeRoomCode = useWatchPartyStore((s) => s.roomCode);
  const isRoomHost = useWatchPartyStore((s) => s.isHost);

  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [downloadParams, setDownloadParams] = useState({ season: 0, episode: 0 });
  const [translatedSynopsis, setTranslatedSynopsis] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const openDownloadModal = (season = 0, episode = 0) => {
    setDownloadParams({ season, episode });
    setIsDownloadModalOpen(true);
  };

  const handleCreateParty = async (nickname: string): Promise<string | null> => {
    const isSeriesContent = data?.subject?.subjectType === 2;
    if (typeof window !== 'undefined') {
      const current = localStorage.getItem('nobarfilm_party_guest');
      let color = '#EF4444';
      try {
        if (current) color = JSON.parse(current).avatarColor || color;
      } catch {}
      localStorage.setItem(
        'nobarfilm_party_guest',
        JSON.stringify({ displayName: nickname.trim(), avatarColor: color }),
      );
    }
    const urlParams = new URLSearchParams();
    urlParams.set('party', 'create');
    if (isSeriesContent) {
      urlParams.set('season', '1');
      urlParams.set('episode', '1');
    }
    router.push(`/watch/${subjectId}?${urlParams.toString()}`);
    return 'create';
  };

  const handleNobarClick = async () => {
    // If user is host of an active room, switch room's media directly to this movie!
    if (activeRoomCode && isRoomHost) {
      const isSeriesContent = data?.subject?.subjectType === 2;
      const urlParams = new URLSearchParams();
      urlParams.set('party', activeRoomCode);
      if (isSeriesContent) {
        urlParams.set('season', '1');
        urlParams.set('episode', '1');
      }
      toast.success(`Mengalihkan Room ${activeRoomCode} ke film ini... 🎬`);
      router.push(`/watch/${subjectId}?${urlParams.toString()}`);
      return;
    }

    let savedName = '';
    try {
      const saved = localStorage.getItem('nobarfilm_party_guest');
      if (saved) {
        savedName = JSON.parse(saved).displayName || '';
      }
    } catch {}

    if (savedName.trim()) {
      await handleCreateParty(savedName.trim());
    } else {
      setIsPartyModalOpen(true);
    }
  };

  const isInvalidSubjectId = !subjectId || subjectId.includes('.') || subjectId === 'favicon.ico';
  const { data, isLoading, error } = useMovieBoxDetail(isInvalidSubjectId ? '' : subjectId);

  if (isInvalidSubjectId) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black pt-16 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-red-600 mb-4">404</h1>
            <p className="text-gray-300 mb-6">Konten tidak ditemukan</p>
            <button onClick={() => router.push('/')} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
              Kembali ke Beranda
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black pt-16">
          <div className="relative h-[60vh] md:h-[70vh] bg-zinc-900 animate-pulse" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="w-1/3 h-10 bg-zinc-800 rounded animate-pulse mb-6" />
            <div className="w-full h-32 bg-zinc-800 rounded animate-pulse" />
          </div>
        </main>
        <Footer />
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
  const isBookmarked = isInWatchlist(subjectId);

  // Movies: /watch/[id] (clean URL)
  // Series: /watch/[id]?season=1&episode=1 (default to first season/episode)
  const watchUrl = isMovie ? `/watch/${subjectId}` : `/watch/${subjectId}?season=1&episode=1`;

  const handleShare = async () => {
    if (typeof window === 'undefined') return;

    const shareData = {
      title: subject.title,
      text: `Nonton film "${subject.title}" subtitle indonesia gratis tanpa iklan di NobarFilm! 🍿🎬`,
      url: window.location.href,
    };

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // User closed native share sheet on mobile
      console.warn('[Share] Web Share API failed:', err);
    }

    // Fallback only if device does not support native sharing
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Tautan film disalin ke clipboard! 📋');
      }
    } catch (e) {
      console.error('[Share] Clipboard fallback failed:', e);
    }
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black">
        {/* Hero Section */}
        <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            {subject?.cover?.url ? (
              <Image unoptimized src={subject.cover.url} alt={subject?.title || 'Cover'} fill className="object-cover" priority sizes="100vw" />
            ) : (
              <div className="w-full h-full bg-zinc-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end pb-12">
            <div className="max-w-3xl">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">{subject?.title || 'Unknown Title'}</h1>

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

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-red-600/90 text-white font-extrabold rounded text-xs uppercase tracking-wider">{isSeries ? 'HD' : 'WEB-DL 1080p'}</span>
                  <span className="px-3 py-1 bg-zinc-800/80 rounded text-gray-200 text-xs font-semibold">{isSeries ? 'Series' : 'Movie'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {(() => {
                  // Check if this is an upcoming release (releaseDate is in the future)
                  const releaseDate = subject.releaseDate ? new Date(subject.releaseDate) : null;
                  const isUpcoming = releaseDate && releaseDate > new Date();

                  if (isUpcoming) {
                    return (
                      <div className="w-full sm:w-auto px-6 py-3 bg-zinc-800 border border-zinc-700 text-gray-300 font-semibold rounded-lg text-center">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-400">Coming Soon</span>
                          <span className="text-sm sm:text-base text-white font-bold">
                            {releaseDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // Show play button for released content
                  return (
                    <div className="flex flex-col gap-2.5 sm:gap-3 w-full sm:w-auto max-w-md">
                      {/* Baris 1: Play Now | Party */}
                      <div className="flex items-center gap-2 sm:gap-3 w-full">
                        <Link
                          href={watchUrl}
                          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all duration-200 active:scale-95 shadow-lg text-sm sm:text-base"
                        >
                          <Play className="w-5 h-5 fill-current" />
                          <span>Play Now</span>
                        </Link>

                        <button
                          onClick={handleNobarClick}
                          className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 border text-white font-bold rounded-lg transition-all duration-200 active:scale-95 shadow-md text-sm sm:text-base cursor-pointer ${
                            activeRoomCode && isRoomHost
                              ? 'bg-red-950/60 hover:bg-red-900/80 border-red-500/60'
                              : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
                          }`}
                          title={activeRoomCode && isRoomHost ? `Putar film ini bersama Room ${activeRoomCode}` : 'Buat room nonton bareng teman'}
                        >
                          <Users className="w-5 h-5 text-red-500" />
                          <span>{activeRoomCode && isRoomHost ? `Room (${activeRoomCode})` : 'Party'}</span>
                        </button>
                      </div>

                      {/* Baris 2: Download | Like Share */}
                      <div className="flex items-center gap-2 sm:gap-3 w-full">
                        <button
                          onClick={() => openDownloadModal(isSeries ? 1 : 0, isSeries ? 1 : 0)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/80 text-white font-semibold rounded-lg transition-all duration-200 active:scale-95 shadow-md text-sm cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-zinc-300" />
                          <span>Download</span>
                        </button>

                        <button
                          onClick={() => toggleWatchlist(subject)}
                          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 border font-semibold rounded-lg transition-all duration-200 active:scale-95 shadow-md text-sm cursor-pointer ${
                            isBookmarked
                              ? 'bg-red-600/10 border-red-500/50 text-red-500'
                              : 'bg-zinc-800/90 hover:bg-zinc-700 border-zinc-700/80 text-white'
                          }`}
                          title={isBookmarked ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
                        >
                          <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                          <span>Like</span>
                        </button>

                        <button
                          onClick={handleShare}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/80 text-white font-semibold rounded-lg transition-all duration-200 active:scale-95 shadow-md text-sm cursor-pointer"
                          title="Bagikan Film"
                        >
                          <Share2 className="w-4 h-4 text-zinc-300" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
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
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">Synopsis</h2>
                    <button
                      onClick={async () => {
                        if (translatedSynopsis) {
                          setTranslatedSynopsis(null);
                          return;
                        }
                        try {
                          setIsTranslating(true);
                          const res = await fetch('/api/translate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: subject.description }),
                          });
                          const data = await res.json();
                          if (data.translatedText) {
                            setTranslatedSynopsis(data.translatedText);
                          }
                        } catch (e) {
                          console.error('Translation error:', e);
                          toast.error('Gagal menerjemahkan sinopsis');
                        } finally {
                          setIsTranslating(false);
                        }
                      }}
                      disabled={isTranslating}
                      className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-red-500/40 bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {isTranslating ? 'Menerjemahkan...' : translatedSynopsis ? 'Lihat Teks Asli' : 'Terjemahkan ke Indonesia'}
                    </button>
                  </div>
                  <p className="text-gray-300 leading-relaxed">{translatedSynopsis || subject.description}</p>
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
          {isSeries && resource?.seasons && (
            <SeasonSelector seasons={resource.seasons} subjectId={subjectId} onDownload={(season, episode) => openDownloadModal(season, episode)} baseUrl="/watch" />
          )}

          {/* Cast */}
          {stars && stars.length > 0 && <CastList cast={stars} />}
        </div>
      </main>

      <Footer />

      {/* Download Modal */}
      {isDownloadModalOpen && (
        <DownloadModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          subjectId={subjectId}
          title={subject?.title || 'Unknown Movie'}
          subjectType={subject?.subjectType}
          releaseDate={subject?.releaseDate}
          seasonNumber={downloadParams.season}
          episodeNumber={downloadParams.episode}
        />
      )}

      {/* Watch Party Create Modal */}
      <WatchPartyJoinModal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        mode="create"
        onJoin={async () => false}
        onCreate={handleCreateParty}
        movieTitle={subject?.title}
      />
    </>
  );
}
