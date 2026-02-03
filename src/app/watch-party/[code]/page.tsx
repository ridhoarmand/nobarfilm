'use client';import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { APITypes } from 'plyr-react';
import 'plyr-react/plyr.css';

// Fix for "Export default doesn't exist" error
// Using dynamic import with explicit named export resolution
const Plyr = dynamic(
  () =>
    import('plyr-react').then((mod) => {
      // Handle various export shapes (ESM vs CJS)
      if (mod.Plyr) return mod.Plyr;
      // @ts-ignore - Handle default export if it exists
      if (mod.default) return mod.default;
      // Fallback
      return mod;
    }),
  { ssr: false },
) as any;
import { useAuth } from '@/components/providers/AuthProvider';
import { usePartySync } from '@/components/player/hooks/usePartySync';
import { ChatPanel } from '@/components/watch-party/ChatPanel';
import { WatchPartyParticipant, ChatMessage } from '@/types/watch-party';
import { Users, Copy, Check, Share2, ChevronRight, Loader2, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useSources, useGenerateStreamLink } from '@/lib/hooks/useMovieBox';
import { movieBoxAPI } from '@/lib/api/moviebox';

export default function WatchPartyRoom() {
  const { code } = useParams();
  const roomCode = code as string;
  const router = useRouter();
  const playerRef = useRef<APITypes>(null);

  // Auth Check
  const { user, isLoading: authLoading } = useAuth();

  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<WatchPartyParticipant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);

  // Buffering State
  const [peersBuffering, setPeersBuffering] = useState<string[]>([]); // List of user IDs buffering

  // Protect Route: Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const returnUrl = encodeURIComponent(`/watch-party/${roomCode}`);
      router.push(`/login?redirect=${returnUrl}`);
    }
  }, [authLoading, user, router, roomCode]);

  // Fetch initial room data from DB (for title, video source, etc)
  useEffect(() => {
    const fetchRoom = async () => {
      // Use RPC to fetch room by code to bypass RLS (if not yet joined)
      const { data, error } = await supabase.rpc('get_watch_party_by_code', { p_code: roomCode });

      // Data from RPC returning SETOF is an array
      const roomData = data && Array.isArray(data) && data.length > 0 ? data[0] : null;

      if (error || !roomData) {
        console.error('Room not found', error);
        // router.push('/404'); // Handle error
        setLoading(false);
        return;
      }

      setRoom(roomData);
      setLoading(false);
    };

    fetchRoom();
  }, [roomCode]);

  // Memoize options to prevent re-creation on every render
  const plyrOptions = useMemo(
    () => ({
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
      autoplay: false, // Important: let socket handle play
      clickToPlay: false, // Prevent accidental desync
    }),
    [],
  );

  // Memoize socket update handler
  const handleRoomStateUpdate = useCallback((data: any) => {
    if (data.participants) {
      setParticipants(data.participants);
    }
    if (data.chatHistory) setMessages(data.chatHistory);
    // Initial sync of buffering state could be added here if server sends it
  }, []);

  // Handle Socket Sync
  const { socket, emitPlay, emitPause, emitSeek, emitBuffering, emitMessage, playError, resolvePlayError } = usePartySync(
    roomCode,
    playerRef,
    handleRoomStateUpdate,
    hasJoined, // Pass enabled flag
  );

  // Listen for separate socket events to update UI
  useEffect(() => {
    if (!socket) return;

    socket.on('user-joined', (user) => {
      setParticipants((prev) => {
        const exists = prev.find((p) => p.id === user.id);
        if (exists) return prev;
        return [...prev, user];
      });
    });

    socket.on('user-left', (userId) => {
      setParticipants((prev) => prev.filter((p) => p.user_id !== userId));
      setPeersBuffering((prev) => prev.filter((id) => id !== userId)); // Remove from buffering list
    });

    socket.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('buffering', ({ userId, isBuffering }) => {
      if (userId === socket.id) return; // Ignore self

      setPeersBuffering((prev) => {
        if (isBuffering) {
          return prev.includes(userId) ? prev : [...prev, userId];
        } else {
          return prev.filter((id) => id !== userId);
        }
      });

      // Optional: Auto-pause if someone buffers?
      // For now, we just show UI. True "lockstep" requires pausing player.
      if (isBuffering && playerRef.current?.plyr?.playing) {
        playerRef.current.plyr.pause();
      }
    });

    return () => {
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('chat-message');
      socket.off('buffering');
    };
  }, [socket]);

  // Copy Room Link
  const copyLink = () => {
    const url = `${window.location.origin}/watch-party/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- VIDEO SOURCE HANDLING ---
  // streamUrl and states managed by React Query hook now

  // Inferred params
  const subjectId = room?.subject_id || '';
  const isMovie = room?.subject_type === 1;
  const currentSeason = isMovie ? 0 : 1;
  const currentEpisode = isMovie ? 0 : room?.current_episode || 1;

  // 1. Fetch Sources
  const { data: sourcesData, isLoading: isLoadingSources, error: sourcesError } = useSources(subjectId, currentSeason, currentEpisode);

  // Default to first source for watch party (can add quality selector later)
  const selectedSourceUrl = sourcesData?.downloads?.[0]?.url;

  // 2. Prepare Subtitles
  const subtitles = useMemo(
    () =>
      sourcesData?.captions?.map((caption) => ({
        kind: 'captions' as const,
        label: caption.lanName,
        srcLang: caption.lan,
        src: `/api/subtitle?url=${encodeURIComponent(caption.url)}`,
        default: caption.lan.includes('id') || caption.lanName.toLowerCase().includes('indonesia'),
      })) || [],
    [sourcesData],
  );

  // 3. Generate Stream URL (Cached)
  const { data: streamData, isLoading: isLoadingStream, error: streamErrorData } = useGenerateStreamLink(selectedSourceUrl);

  const streamUrl = streamData?.streamUrl;
  const streamError = streamErrorData?.message || (sourcesData?.downloads?.length === 0 ? 'No video sources available' : null);

  // Handle local buffering events to notify others
  const handleWaiting = () => {
    if (hasJoined) emitBuffering && emitBuffering(true);
  };

  const handlePlaying = () => {
    if (hasJoined) emitBuffering && emitBuffering(false);
  };

  // Attach player events for buffering
  useEffect(() => {
    const player = playerRef.current?.plyr;
    if (player && hasJoined) {
      player.on('waiting', handleWaiting);
      player.on('playing', handlePlaying);

      return () => {
        player.off('waiting', handleWaiting);
        player.off('playing', handlePlaying);
      };
    }
  }, [hasJoined, playerRef.current]);

  if (loading || authLoading) {
    return (
      <div className="bg-black h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Room Not Found</h1>
          <p className="text-gray-400">The watch party code is invalid.</p>
          <button onClick={() => router.push('/movie')} className="mt-6 px-6 py-2 bg-red-600 rounded-full hover:bg-red-700 transition">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // JOIN ROOM GATE
  if (!hasJoined) {
    return (
      <div className="bg-black min-h-screen flex flex-col items-center justify-center text-white p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://assets.nflxext.com/ffe/siteui/vlv3/f841d4c7-10e1-40af-bcae-07a3f8dc141a/f6d7434e-d6de-4185-a6d4-c77a2d08737b/US-en-20220502-popsignuptwoweeks-perspective_alpha_website_medium.jpg')] opacity-20 bg-cover bg-center blur-sm"></div>
        <div className="z-10 text-center max-w-md w-full bg-zinc-900/80 p-8 rounded-2xl backdrop-blur-md border border-zinc-800 shadow-2xl">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Ready to Join?</h1>
            <p className="text-zinc-400 text-sm">
              Room: <span className="text-white font-mono">{roomCode}</span>
            </p>
          </div>
          <div className="space-y-4">
            <div className="bg-zinc-800/50 p-4 rounded-lg">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Watching</p>
              <h2 className="text-lg font-semibold truncate">{room?.title}</h2>
            </div>
            <button
              onClick={() => setHasJoined(true)}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
            >
              <span>Join Watch Party</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      {/* Main Container */}
      <div className="bg-black pt-20 h-[100dvh] flex flex-col lg:flex-row overflow-hidden pb-4 lg:pb-0">
        {/* pb-4 added for desktop bottom spacing */}

        {/* Left/Top Content: Player */}
        <div className="flex-none lg:flex-1 flex flex-col items-center justify-center bg-black relative z-20 px-0 lg:px-6">
          {/* Added px-6 for desktop spacing from edges */}

          <div className="w-full max-w-[95%] lg:max-w-none aspect-video relative bg-black flex items-center justify-center rounded-xl overflow-hidden shadow-2xl border border-zinc-800/50">
            {streamError ? (
              <div className="text-center p-6 text-red-500">
                <p className="font-bold mb-2">Unavailable</p>
                <p className="text-sm">{streamError}</p>
                {sourcesError && <p className="text-xs text-gray-500 mt-2">{sourcesError.message}</p>}
              </div>
            ) : isLoadingStream || (isLoadingSources && !sourcesData) ? (
              <div className="text-center text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-red-600" />
                <p className="text-sm">Loading Stream...</p>
              </div>
            ) : (
              <>
                <Plyr
                  ref={playerRef}
                  source={{
                    type: 'video',
                    sources: [{ src: streamUrl, type: 'video/mp4' }],
                    poster: room?.cover_url,
                    tracks: subtitles,
                  }}
                  options={plyrOptions}
                />

                {/* AUTOPLAY BLOCKER OVERLAY */}
                {playError && (
                  <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center">
                      <p className="text-white mb-4 font-semibold text-lg">Click to Sync Playback</p>
                      <button
                        onClick={() => {
                          playerRef.current?.plyr?.play();
                          resolvePlayError();
                        }}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold flex items-center gap-2 transition transform hover:scale-105"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        JOIN STREAM
                      </button>
                    </div>
                  </div>
                )}

                {/* BUFFERING OVERLAY */}
                {peersBuffering.length > 0 && !playError && (
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-700 flex items-center gap-3 z-40 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                    <span className="text-xs text-white font-medium">Waiting for {participants.find((p) => p.id === peersBuffering[0])?.display_name || 'others'}...</span>
                  </div>
                )}
              </>
            )}

            {/* Room Info (Mobile Only - below video) */}
            <div className="w-full p-3 lg:hidden flex items-center justify-between border-b border-zinc-800 bg-zinc-900 absolute bottom-0 translate-y-full left-0">
              {/* Moved outside absolute if needed, but keeping structure */}
            </div>
          </div>

          {/* Room Info Mobile (Outside Player Wrapper) */}
          <div className="w-full p-3 lg:hidden flex items-center justify-between border-b border-zinc-800 bg-zinc-900">
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">{room?.title || 'Watch Party'}</h1>
              <p className="text-[10px] text-zinc-500 truncate">Room: {roomCode}</p>
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 text-xs font-medium text-white px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full border border-zinc-700 transition flex-shrink-0"
            >
              <Share2 className="w-3 h-3" />
              {copied ? 'Copied!' : 'Invite'}
            </button>
          </div>
        </div>

        {/* Right/Bottom Sidebar: Chat & Participants */}
        <div className="flex-1 lg:flex-none lg:w-96 min-h-0 bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 relative z-10 lg:mr-4 lg:rounded-xl lg:border lg:mb-4 lg:overflow-hidden">
          {/* Added mr-4 mb-4 rounded-xl for desktop spacing */}
          <ChatPanel roomCode={roomCode} messages={messages} onSendMessage={emitMessage} participantCount={participants.length} className="h-full" />
        </div>
      </div>
    </>
  );
}
