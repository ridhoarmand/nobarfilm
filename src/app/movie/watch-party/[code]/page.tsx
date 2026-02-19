'use client';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { usePartySync } from '@/components/player/hooks/usePartySync';
import { ChatPanel } from '@/components/watch-party/ChatPanel';
import { WatchPartyParticipant, ChatMessage, WatchPartyRoom } from '@/types/watch-party';
import { Users, Share2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useMovieBoxSources, useMovieBoxPlaybackUrl } from '@/hooks/useMovieBox';
import toast from 'react-hot-toast';
import { PartyPlayer } from '@/components/player/PartyPlayer';
import { MediaPlayerInstance } from '@vidstack/react';
import { Caption } from '@/types/api';

// Specific interface for the room data returned by the RPC
interface WatchPartyRoomData extends WatchPartyRoom {
  status: string;
}

export default function WatchPartyRoomPage() {
  const { code } = useParams();
  const roomCode = code as string;
  const router = useRouter();
  const playerRef = useRef<MediaPlayerInstance>(null);

  const { user, isLoading: authLoading } = useAuth();

  const [room, setRoom] = useState<WatchPartyRoomData | null>(null);
  const [participants, setParticipants] = useState<WatchPartyParticipant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [selectedQuality] = useState(0);

  // Protect Route
  useEffect(() => {
    if (!authLoading && !user) {
      const returnUrl = encodeURIComponent(`/movie/watch-party/${roomCode}`);
      router.push(`/login?redirect=${returnUrl}`);
    }
  }, [authLoading, user, router, roomCode]);

  // Fetch initial room data
  useEffect(() => {
    const fetchRoom = async () => {
      const { data, error } = await supabase.rpc('get_watch_party_by_code', { p_code: roomCode });
      const roomData = data && Array.isArray(data) && data.length > 0 ? (data[0] as WatchPartyRoomData) : null;

      if (error || !roomData) {
        console.error('Room not found', error);
        setLoading(false);
        return;
      }

      setRoom(roomData);
      setLoading(false);
    };

    fetchRoom();
  }, [roomCode]);

  // Auto-join if user is host
  useEffect(() => {
    if (room && user && room.host_id === user.id && !hasJoined) {
      const timer = setTimeout(() => {
        setHasJoined(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [room, user, hasJoined]);

  const handleRoomStateUpdate = useCallback((data: unknown) => {
    const d = data as { participants?: WatchPartyParticipant[]; chatHistory?: ChatMessage[] };
    if (d.participants) setParticipants(d.participants);
    if (d.chatHistory) setMessages(d.chatHistory);
  }, []);

  const handleRemotePlay = useCallback((time: number) => {
    if (!playerRef.current) return;
    if (Math.abs(playerRef.current.currentTime - time) > 1) {
      playerRef.current.currentTime = time;
    }
    playerRef.current.play().catch((err) => {
      if (err.name === 'NotAllowedError') console.error('Autoplay was prevented:', err);
    });
  }, []);

  const handleRemotePause = useCallback((time: number) => {
    if (!playerRef.current) return;
    playerRef.current.currentTime = time;
    playerRef.current.pause();
  }, []);

  const handleRemoteSeek = useCallback((time: number) => {
    if (!playerRef.current) return;
    playerRef.current.currentTime = time;
  }, []);

  const handleInitialSync = useCallback((time: number, isPlaying: boolean) => {
    if (!playerRef.current) return;
    playerRef.current.currentTime = time;
    if (isPlaying) {
      playerRef.current.play().catch((err) => console.error('Autoplay was prevented:', err));
    } else {
      playerRef.current.pause();
    }
  }, []);

  // Sync Hook
  const { emitMessage, emitPlay, emitPause, emitSeek, emitBuffering, isRemoteUpdate } = usePartySync(
    roomCode,
    {
      onRemotePlay: handleRemotePlay,
      onRemotePause: handleRemotePause,
      onRemoteSeek: handleRemoteSeek,
      onInitialSync: handleInitialSync,
      onRoomStateUpdate: handleRoomStateUpdate,
    },
    hasJoined && !!user && !!room,
  );

  // --- LOCAL EVENT HANDLERS ---
  const handleLocalPlay = () => {
    if (isRemoteUpdate.current || !playerRef.current) return;
    emitPlay(playerRef.current.currentTime);
  };

  const handleLocalPause = () => {
    if (isRemoteUpdate.current || !playerRef.current) return;
    emitPause(playerRef.current.currentTime);
  };

  const handleLocalSeek = (seekedTime?: number) => {
    if (isRemoteUpdate.current || !playerRef.current) return;
    emitSeek(seekedTime ?? playerRef.current.currentTime);
  };

  const handleLocalWaiting = useCallback(() => emitBuffering(true), [emitBuffering]);
  const handleLocalPlaying = useCallback(() => emitBuffering(false), [emitBuffering]);

  // --- VIDEO SOURCE ---
  const subjectId = room?.subject_id || '';
  const isMovie = room?.subject_type === 1;
  const currentSeason = isMovie ? 0 : 1;
  const currentEpisode = isMovie ? 0 : room?.current_episode || 1;

  const { data: sourcesData } = useMovieBoxSources(subjectId, currentSeason, currentEpisode);

  const tracks = useMemo(
    () =>
      sourcesData?.captions?.map((caption: Caption) => ({
        kind: 'captions' as const,
        label: caption.lanName || 'Unknown',
        srcLang: caption.lan || 'en',
        src: `/api/subtitle?url=${encodeURIComponent(caption.url)}`,
        default: (caption.lan || '').includes('id') || (caption.lanName || '').toLowerCase().includes('indonesia'),
      })) || [],
    [sourcesData],
  );

  const { data: streamData, isLoading: isLoadingStream, error: streamErrorData } = useMovieBoxPlaybackUrl(subjectId, currentSeason, currentEpisode, selectedQuality);
  const streamUrl = streamData?.streamUrl;
  const streamError = streamErrorData?.message || (sourcesData?.downloads?.length === 0 ? 'No video sources available' : null);

  const videoSource = useMemo(() => {
    if (!streamUrl) return null;
    return {
      src: streamUrl,
      type: streamUrl.includes('m3u8') ? 'application/x-mpegurl' : 'video/mp4',
    } as unknown as import('@vidstack/react').MediaSrc;
  }, [streamUrl]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Room Not Found</h1>
          <button onClick={() => router.push('/')} className="px-6 py-2 bg-red-600 rounded-lg">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black pt-20 pb-10">
        <div className="max-w-[1920px] mx-auto px-4 lg:px-8">
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-grow space-y-4">
              <div className="relative aspect-video bg-zinc-900 rounded-xl overflow-hidden group">
                {videoSource ? (
                  <PartyPlayer
                    ref={playerRef}
                    src={videoSource}
                    poster={room.cover_url || ''}
                    onPlay={handleLocalPlay}
                    onPause={handleLocalPause}
                    onSeeked={handleLocalSeek}
                    onWaiting={handleLocalWaiting}
                    onPlaying={handleLocalPlaying}
                    tracks={tracks}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isLoadingStream ? <Loader2 className="w-12 h-12 text-red-600 animate-spin" /> : <div className="text-red-500">{streamError || 'Failed to load video'}</div>}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                <div>
                  <h1 className="text-xl font-bold text-white">{room.title}</h1>
                  <p className="text-sm text-gray-400">
                    Room Code: <span className="text-red-500 font-mono font-bold select-all">{roomCode}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                    <Users className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-bold text-white">{participants.length}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link copied!');
                    }}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Share2 className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full xl:w-[400px] shrink-0 h-[600px] xl:h-[calc(100vh-140px)]">
              <ChatPanel messages={messages} onSendMessage={emitMessage} participantCount={participants.length} roomCode={roomCode} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
