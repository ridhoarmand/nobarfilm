'use client';import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/layout/Navbar';
// import { Footer } from '@/components/layout/Footer'; // Unused
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
import { Users, Copy, Check, Share2, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useMovieBoxSources, useMovieBoxPlaybackUrl } from '@/hooks/useMovieBox';
import toast from 'react-hot-toast';

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
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(0);

  // Buffering State
  const [peersBuffering, setPeersBuffering] = useState<string[]>([]); // List of user IDs buffering

  const pendingSeekTime = useRef<number | null>(null);

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
      const { data, error } = await supabase.rpc('get_watch_party_by_code', { p_code: roomCode });
      const roomData = data && Array.isArray(data) && data.length > 0 ? data[0] : null;

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
    if (room && user && room.host_id === user.id) {
      setHasJoined(true);
    }
  }, [room, user]);

  // Memoize options to prevent re-creation on every render
  const plyrOptions = useMemo(
    () => ({
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
      autoplay: false, // Important: let socket handle play
      clickToPlay: false, // Prevent accidental desync
    }),
    [],
  );

  const togglePlay = useCallback(() => {
    const player = playerRef.current?.plyr;
    if (player && typeof player.togglePlay === 'function') {
      player.togglePlay();
    }
  }, []);

  const handleQualityChange = (index: number) => {
    const player = playerRef.current?.plyr;
    if (player) {
      pendingSeekTime.current = player.currentTime;
    }
    setSelectedQuality(index);
  };

  // Memoize socket update handler
  const handleRoomStateUpdate = useCallback((data: any) => {
    if (data.participants) {
      setParticipants(data.participants);
    }
    if (data.chatHistory) setMessages(data.chatHistory);
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
        const exists = prev.find((p) => p.user_id === user.user_id);
        if (exists) return prev;
        return [...prev, user];
      });
      // Add system message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          room_code: roomCode,
          user_id: 'system',
          display_name: 'System',
          message: `${user.display_name} joined the room`,
          avatar_url: null,
          timestamp: new Date().toISOString(),
          is_system: true,
        } as any,
      ]);
      toast.success(`${user.display_name} joined!`, { position: 'top-left', duration: 2000 });
    });

    socket.on('user-left', (userId) => {
      const leaver = participants.find((p) => p.user_id === userId || p.id === userId);
      if (leaver) {
        // Add system message to chat
        setMessages((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            room_code: roomCode,
            user_id: 'system',
            display_name: 'System',
            message: `${leaver.display_name} left the room`,
            avatar_url: null,
            timestamp: new Date().toISOString(),
            is_system: true,
          } as any,
        ]);
        toast(`${leaver.display_name} left`, { icon: '👋', position: 'top-left', duration: 2000 });
      }
      setParticipants((prev) => prev.filter((p) => p.user_id !== userId && p.id !== userId));
      setPeersBuffering((prev) => prev.filter((id) => id !== userId));
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
  }, [socket, participants]);

  // Copy Room Link
  const copyLink = () => {
    const url = `${window.location.origin}/watch-party/${roomCode}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success('Link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link'));
  };

  // --- VIDEO SOURCE HANDLING ---

  // Inferred params
  const subjectId = room?.subject_id || '';
  const isMovie = room?.subject_type === 1;
  const currentSeason = isMovie ? 0 : 1;
  const currentEpisode = isMovie ? 0 : room?.current_episode || 1;

  // 1. Fetch Sources
  const { data: sourcesData, isLoading: isLoadingSources, error: sourcesError } = useMovieBoxSources(subjectId, currentSeason, currentEpisode);

  // Get selected source URL based on quality
  // Default to 0 or selected
  const selectedSourceUrl = sourcesData?.downloads?.[selectedQuality]?.url || sourcesData?.downloads?.[0]?.url;

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
  const { data: streamData, isLoading: isLoadingStream, error: streamErrorData } = useMovieBoxPlaybackUrl(subjectId, currentSeason, currentEpisode, selectedQuality);

  const streamUrl = streamData?.streamUrl;
  const streamError = streamErrorData?.message || (sourcesData?.downloads?.length === 0 ? 'No video sources available' : null);

  // Memoize player source to prevent flickering on focus/re-render
  const playerSource = useMemo(
    () => ({
      type: 'video' as const,
      sources: [{ src: streamUrl, type: 'video/mp4' }],
      poster: room?.cover_url,
      tracks: subtitles,
    }),
    [streamUrl, room?.cover_url, subtitles],
  );

  // Handle local buffering events to notify others
  const handleWaiting = () => {
    if (hasJoined) emitBuffering && emitBuffering(true);
  };

  const handlePlaying = () => {
    if (hasJoined) emitBuffering && emitBuffering(false);
  };

  // Attach player events for buffering and seek fix
  useEffect(() => {
    const player = playerRef.current?.plyr;
    if (player && typeof player.on === 'function' && hasJoined) {
      player.on('waiting', handleWaiting);
      player.on('playing', handlePlaying);

      const restoreTime = () => {
        if (pendingSeekTime.current !== null) {
          const timeToSeek = pendingSeekTime.current;
          // Clear it first to prevent double-triggering
          pendingSeekTime.current = null;

          console.log('Restoring time to:', timeToSeek);

          // Use a small timeout to ensure the player is truly ready to accept currentTime updates
          setTimeout(() => {
            if (player) {
              player.currentTime = timeToSeek;
              const playResult = player.play();
              if (playResult instanceof Promise) {
                playResult.catch(() => {});
              }
            }
          }, 200);
        }
      };

      // Listen to multiple events for better reliability
      player.on('ready', restoreTime);
      player.on('loadeddata', restoreTime);
      player.on('canplay', restoreTime);

      // Backup: Trigger if streamUrl changed
      if (pendingSeekTime.current !== null) {
        restoreTime();
      }

      return () => {
        if (typeof player.off === 'function') {
          player.off('waiting', handleWaiting);
          player.off('playing', handlePlaying);
          player.off('ready', restoreTime);
          player.off('loadeddata', restoreTime);
          player.off('canplay', restoreTime);
        }
      };
    }
  }, [hasJoined, playerRef.current, streamUrl]); // Added streamUrl as dependency to re-attach or trigger on source change

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
      {/* Main Container - Full width for better responsiveness */}
      <div className="bg-black pt-16 h-[100dvh] flex flex-col overflow-hidden">
        <div className="flex-1 w-full flex flex-col lg:flex-row gap-4 px-4 lg:px-8 py-4 lg:py-6 overflow-hidden">
          {/* Left/Top Content: Player */}
          <div className="flex-1 flex flex-col relative z-20 min-h-0 bg-zinc-950 rounded-2xl border border-zinc-800/50 shadow-2xl overflow-hidden">
            {/* Main Video Area */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-0">
              {streamError ? (
                <div className="text-center p-6 text-red-500">
                  <p className="font-bold mb-2">Unavailable</p>
                  <p className="text-sm">{streamError}</p>
                  {sourcesError && <p className="text-xs text-gray-500 mt-2">{sourcesError.message}</p>}
                  <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition">
                    Retry
                  </button>
                </div>
              ) : isLoadingStream || (isLoadingSources && !sourcesData) ? (
                <div className="text-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-red-600" />
                  <p className="text-sm">Loading Stream...</p>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4 lg:p-10 overflow-hidden">
                  <div
                    className="relative max-w-full max-h-full aspect-video shadow-2xl overflow-hidden rounded-xl bg-black cursor-pointer group/player flex items-center justify-center"
                    onClick={(e) => {
                      // Only toggle if clicking the main video area, not controls
                      const target = e.target as HTMLElement;
                      if (!target.closest('.plyr__controls')) {
                        togglePlay();
                      }
                    }}
                  >
                    <Plyr ref={playerRef} source={playerSource} options={plyrOptions} />

                    {/* Visual Central Pause/Play Indicator on Click (Optional enhancement) */}
                  </div>
                  {/* AUTOPLAY BLOCKER OVERLAY - Remove manual button, auto sync now handles it */}
                  {playError && (
                    <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
                      <div className="text-center">
                        <p className="text-white mb-4 font-semibold text-lg">Syncing Playback...</p>
                        <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto" />
                      </div>
                    </div>
                  )}

                  {/* BUFFERING OVERLAY */}
                  {peersBuffering.length > 0 && !playError && (
                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-700 flex items-center gap-3 z-40 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                      <span className="text-xs text-white font-medium">Waiting for {participants.find((p) => p.user_id === peersBuffering[0] || p.id === peersBuffering[0])?.display_name || 'others'}...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Room Info (Mobile Only - below video overlay) */}
              <div className="w-full p-3 lg:hidden flex items-center justify-between border-b border-zinc-800 bg-zinc-900 absolute bottom-0 translate-y-full left-0 z-10">
                {/* This block is usually visually hidden because of translate-y-full and overflow hidden on parent, but let's keep it clean */}
              </div>
            </div>

            {/* Premium Info Bar (Desktop) */}
            <div className="hidden md:flex items-center justify-between px-6 py-4 bg-zinc-900/50 border-t border-zinc-800/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-white truncate">{room?.title}</h1>
                  <span className="px-2 py-0.5 rounded bg-red-600/10 text-red-500 text-[10px] font-bold uppercase tracking-wider border border-red-600/20">Live Party</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">ID Room</span>
                    <span className="text-sm font-mono text-zinc-300 font-bold tracking-wider">{roomCode}</span>
                  </div>

                  {/* Resolution Picker - Desktop */}
                  {sourcesData?.downloads && sourcesData.downloads.length > 0 && (
                    <div className="flex items-center gap-1.5 ml-4 border-l border-zinc-800 pl-4">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mr-1">Quality</span>
                      {sourcesData.downloads.map((source, index) => (
                        <button
                          key={index}
                          onClick={() => handleQualityChange(index)}
                          className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-300 border
                          ${
                            selectedQuality === index
                              ? 'bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(229,9,20,0.3)]'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-500'
                          }
                        `}
                        >
                          {source.resolution}p
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 ml-6">
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg border border-zinc-700"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Invite</span>
                </button>
              </div>
            </div>

            {/* Mobile Info Bar (Visible < md) */}
            <div className="w-full p-3 md:hidden flex items-center justify-between border-b border-zinc-800 bg-zinc-900">
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white truncate">{room?.title || 'Watch Party'}</h1>
                <p className="text-[10px] text-zinc-500 truncate">Room: {roomCode}</p>
              </div>
              <div className="flex items-center gap-2">
                {sourcesData &&
                  sourcesData.downloads &&
                  sourcesData.downloads.length > 0 &&
                  (sourcesData.downloads.length > 1 ? (
                    <select className="bg-zinc-800 text-xs text-white border border-zinc-700 rounded px-1 py-1" value={selectedQuality} onChange={(e) => handleQualityChange(parseInt(e.target.value))}>
                      {sourcesData.downloads.map((source, index) => (
                        <option key={index} value={index}>
                          {source.resolution}p
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">{sourcesData.downloads[0].resolution}p</span>
                  ))}

                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 text-xs font-medium text-white px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full border border-zinc-700 transition flex-shrink-0"
                >
                  <Share2 className="w-3 h-3" />
                  Invite
                </button>
              </div>
            </div>
          </div>

          {/* Right/Bottom Sidebar: Chat & Participants */}
          <div className="flex-1 lg:flex-none lg:w-96 min-h-0 bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 relative z-10 lg:rounded-xl lg:border lg:overflow-hidden">
            <ChatPanel roomCode={roomCode} messages={messages} onSendMessage={emitMessage} participantCount={participants.length} className="h-full" />
          </div>
        </div>
      </div>
    </>
  );
}
