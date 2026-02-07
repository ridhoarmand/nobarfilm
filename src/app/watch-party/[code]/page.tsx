'use client';import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { usePartySync } from '@/components/player/hooks/usePartySync';
import { ChatPanel } from '@/components/watch-party/ChatPanel';
import { WatchPartyParticipant, ChatMessage } from '@/types/watch-party';
import { Users, Share2, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useMovieBoxSources, useMovieBoxPlaybackUrl } from '@/hooks/useMovieBox';
import toast from 'react-hot-toast';
import { PartyPlayer } from '@/components/player/PartyPlayer';
import { MediaPlayerInstance } from '@vidstack/react';
import { cn } from '@/lib/utils';

export default function WatchPartyRoom() {
  const { code } = useParams();
  const roomCode = code as string;
  const router = useRouter();
  const playerRef = useRef<MediaPlayerInstance>(null);

  const { user, isLoading: authLoading } = useAuth();

  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<WatchPartyParticipant[]>([]);
  const participantsRef = useRef<WatchPartyParticipant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [peersBuffering, setPeersBuffering] = useState<string[]>([]);

  // Keep participantsRef updated
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // Protect Route
  useEffect(() => {
    if (!authLoading && !user) {
      const returnUrl = encodeURIComponent(`/watch-party/${roomCode}`);
      router.push(`/login?redirect=${returnUrl}`);
    }
  }, [authLoading, user, router, roomCode]);

  // Fetch initial room data
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

  const handleRoomStateUpdate = useCallback((data: any) => {
    if (data.participants) setParticipants(data.participants);
    if (data.chatHistory) setMessages(data.chatHistory);
  }, []);

  // --- REMOTE EVENT CALLBACKS (called by usePartySync when others act) ---

  const handleRemotePlay = useCallback((time: number, userId: string) => {
    console.log('[Page] Remote PLAY received, controlling player at:', time);
    if (!playerRef.current) {
      console.log('[Page] No playerRef, cannot control player!');
      return;
    }
    // Sync time if significant drift
    if (Math.abs(playerRef.current.currentTime - time) > 1) {
      playerRef.current.currentTime = time;
    }
    playerRef.current.play().catch((err) => {
      console.log('[Page] Play failed:', err.name);
      if (err.name === 'NotAllowedError') {
        setPlayError(true);
      }
    });
  }, []);

  const handleRemotePause = useCallback((time: number, userId: string) => {
    console.log('[Page] Remote PAUSE received, controlling player at:', time);
    if (!playerRef.current) {
      console.log('[Page] No playerRef, cannot control player!');
      return;
    }
    playerRef.current.currentTime = time;
    playerRef.current.pause();
  }, []);

  const handleRemoteSeek = useCallback((time: number, userId: string) => {
    console.log('[Page] Remote SEEK received, controlling player to:', time);
    if (!playerRef.current) {
      console.log('[Page] No playerRef, cannot control player!');
      return;
    }
    playerRef.current.currentTime = time;
    // Note: Auto-play after seek will be handled by the play event that follows
  }, []);

  const handleInitialSync = useCallback((time: number, isPlaying: boolean) => {
    console.log(`[Page] Initial sync to ${time}s, isPlaying: ${isPlaying}`);

    const doSync = () => {
      if (!playerRef.current) {
        console.log('[Page] Player not ready for initial sync, retrying...');
        setTimeout(doSync, 500);
        return;
      }

      playerRef.current.currentTime = time;

      if (isPlaying) {
        playerRef.current.play().catch((err) => {
          console.log('[Page] Initial play failed:', err.name);
          if (err.name === 'NotAllowedError') {
            setPlayError(true);
          }
        });
      } else {
        playerRef.current.pause();
      }
    };

    doSync();
  }, []);

  // State for playError (needs to be defined before callbacks that use it)
  const [playErrorState, setPlayError] = useState(false);

  // Sync Hook with callbacks
  const { socket, emitMessage, emitPlay, emitPause, emitSeek, emitBuffering, playError, isRoomPlaying, resolvePlayError, isRemoteUpdate } = usePartySync(
    roomCode,
    {
      onRemotePlay: handleRemotePlay,
      onRemotePause: handleRemotePause,
      onRemoteSeek: handleRemoteSeek,
      onInitialSync: handleInitialSync,
      onRoomStateUpdate: handleRoomStateUpdate,
    },
    hasJoined,
  );

  // --- LOCAL EVENT HANDLERS (when THIS user acts) ---

  const handleLocalPlay = useCallback(() => {
    if (isRemoteUpdate.current) return; // Prevent loop
    const time = playerRef.current?.currentTime || 0;
    console.log('[Page] Local PLAY, emitting at:', time);
    emitPlay(time);
  }, [emitPlay]);

  const handleLocalPause = useCallback(() => {
    if (isRemoteUpdate.current) return; // Prevent loop
    const time = playerRef.current?.currentTime || 0;
    console.log('[Page] Local PAUSE, emitting at:', time);
    emitPause(time);
  }, [emitPause]);

  const handleLocalSeek = useCallback(
    (seekedTime?: number) => {
      if (isRemoteUpdate.current) return; // Prevent loop
      const time = seekedTime ?? playerRef.current?.currentTime ?? 0;
      console.log('[Page] Local SEEK, emitting to:', time);
      emitSeek(time);
    },
    [emitSeek],
  );

  // DISABLED: Buffering events were causing sync issues
  const handleLocalWaiting = useCallback(() => {
    // emitBuffering(true);
  }, []);

  const handleLocalPlaying = useCallback(() => {
    // emitBuffering(false);
  }, []);

  // Socket Events for UI
  useEffect(() => {
    if (!socket) return;

    socket.on('user-joined', (user) => {
      setParticipants((prev) => {
        const exists = prev.find((p) => p.user_id === user.user_id);
        if (exists) return prev;
        return [...prev, user];
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          room_id: '',
          user_id: 'system',
          display_name: 'System',
          message: `${user.display_name} joined the room`,
          avatar_url: null,
          timestamp: new Date().toISOString(),
        } as unknown as ChatMessage,
      ]);
      toast.success(`${user.display_name} joined!`, { position: 'top-left', duration: 2000 });
    });

    socket.on('user-left', (userId) => {
      const leaver = participants.find((p) => p.user_id === userId || p.id === userId);
      if (leaver) {
        setMessages((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            room_id: '',
            user_id: 'system',
            display_name: 'System',
            message: `${leaver.display_name} left the room`,
            avatar_url: null,
            timestamp: new Date().toISOString(),
          } as unknown as ChatMessage,
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
      if (userId === socket.id) return;

      setPeersBuffering((prev) => {
        if (isBuffering) {
          return prev.includes(userId) ? prev : [...prev, userId];
        } else {
          return prev.filter((id) => id !== userId);
        }
      });
      // Note: Don't auto-pause here - let the overlay handle it visually
      // Auto-resume is handled in useEffect when peersBuffering clears
    });

    // Play event - add info to chat
    socket.on('play', ({ time, userId, displayName }) => {
      if (userId === socket.id) return;
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      setMessages((prev) => [
        ...prev,
        {
          id: `action-${Date.now()}`,
          room_id: '',
          user_id: 'action',
          display_name: displayName,
          message: `▶️ started playing at ${timeStr}`,
          avatar_url: null,
          timestamp: new Date().toISOString(),
        } as unknown as ChatMessage,
      ]);
    });

    // Pause event - add info to chat
    socket.on('pause', ({ time, userId, displayName }) => {
      if (userId === socket.id) return;
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      setMessages((prev) => [
        ...prev,
        {
          id: `action-${Date.now()}`,
          room_id: '',
          user_id: 'action',
          display_name: displayName,
          message: `⏸️ paused at ${timeStr}`,
          avatar_url: null,
          timestamp: new Date().toISOString(),
        } as unknown as ChatMessage,
      ]);
    });

    // Seek event - add info to chat
    socket.on('seek', ({ time, userId, displayName }) => {
      if (userId === socket.id) return;
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      setMessages((prev) => [
        ...prev,
        {
          id: `action-${Date.now()}`,
          room_id: '',
          user_id: 'action',
          display_name: displayName,
          message: `⏩ jumped to ${timeStr}`,
          avatar_url: null,
          timestamp: new Date().toISOString(),
        } as unknown as ChatMessage,
      ]);
    });

    // User action notifications (skip forward/backward, etc.)
    socket.on('user-action', ({ displayName, action, message }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `action-${Date.now()}`,
          room_id: '',
          user_id: 'action',
          display_name: displayName,
          message: message,
          avatar_url: null,
          timestamp: new Date().toISOString(),
        } as unknown as ChatMessage,
      ]);
    });

    return () => {
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('chat-message');
      socket.off('buffering');
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      socket.off('user-action');
    };
  }, [socket, participants]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) playerRef.current.pause();
    };
  }, []);

  // DISABLED: Buffering-based sync was causing issues (User 1 pauses when User 2 joins)
  // Sync is now only based on explicit play/pause/seek events
  // useEffect(() => {
  //   if (!hasJoined || !playerRef.current) return;
  //   if (peersBuffering.length > 0 && isRoomPlaying && !playerRef.current.paused) {
  //     playerRef.current.pause();
  //   } else if (peersBuffering.length === 0 && isRoomPlaying && playerRef.current.paused && !playError) {
  //     playerRef.current.play().catch(() => {});
  //   }
  // }, [peersBuffering, hasJoined, playError, isRoomPlaying]);

  const copyLink = () => {
    const url = `${window.location.origin}/watch-party/${roomCode}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
  };

  // --- VIDEO SOURCE ---
  const subjectId = room?.subject_id || '';
  const isMovie = room?.subject_type === 1;
  const currentSeason = isMovie ? 0 : 1;
  const currentEpisode = isMovie ? 0 : room?.current_episode || 1;

  const { data: sourcesData, isLoading: isLoadingSources } = useMovieBoxSources(subjectId, currentSeason, currentEpisode);

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

  const { data: streamData, isLoading: isLoadingStream, error: streamErrorData } = useMovieBoxPlaybackUrl(subjectId, currentSeason, currentEpisode, selectedQuality);
  const streamUrl = streamData?.streamUrl;
  const streamError = streamErrorData?.message || (sourcesData?.downloads?.length === 0 ? 'No video sources available' : null);

  // MEMOIZED video source - prevents re-renders
  const videoSource = useMemo(() => {
    if (!streamUrl) return null;
    return {
      src: `/api/proxy/video?url=${encodeURIComponent(streamUrl)}`,
      type: 'video/mp4',
    };
  }, [streamUrl]);

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
          <button onClick={() => router.push('/movie')} className="mt-6 px-6 py-2 bg-red-600 rounded-full hover:bg-red-700 transition">
            Go Home
          </button>
        </div>
      </div>
    );
  }

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
          <button
            onClick={() => setHasJoined(true)}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
          >
            <span>Join Watch Party</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="bg-black pt-16 h-[100dvh] flex flex-col overflow-hidden">
        <div className="flex-1 w-full flex flex-col lg:flex-row gap-4 px-4 lg:px-8 py-4 lg:py-6 overflow-hidden">
          <div className="flex-1 flex flex-col relative z-20 min-h-0 bg-zinc-950 rounded-2xl border border-zinc-800/50 shadow-2xl overflow-hidden">
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-0">
              {streamError ? (
                <div className="text-center p-6 text-red-500">
                  <p className="font-bold">Unavailable</p>
                  <p className="text-sm">{streamError}</p>
                  <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition">
                    Retry
                  </button>
                </div>
              ) : isLoadingStream || !streamUrl ? (
                <div className="text-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-red-600" />
                  <p className="text-sm">Loading Stream...</p>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center p-0 lg:p-0 overflow-hidden relative">
                  <PartyPlayer
                    ref={playerRef}
                    src={videoSource as any}
                    subtitles={subtitles}
                    poster={room?.cover_url}
                    onPlay={handleLocalPlay}
                    onPause={handleLocalPause}
                    onSeeked={handleLocalSeek}
                    onWaiting={handleLocalWaiting}
                    onPlaying={handleLocalPlaying}
                  />

                  {/* Sync/Buf Overlay */}
                  {(playError || (peersBuffering.length > 0 && isRoomPlaying)) && (
                    <div
                      className={cn(
                        'absolute inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm transition-all',
                        playError ? 'cursor-pointer pointer-events-auto hover:bg-black/40' : 'pointer-events-none',
                      )}
                      onClick={() => {
                        if (playError) {
                          resolvePlayError();
                          playerRef.current?.play().catch(() => {});
                        }
                      }}
                    >
                      <div className="bg-zinc-900/90 px-8 py-4 rounded-2xl border border-zinc-700 flex flex-col items-center gap-4 shadow-2xl animate-in fade-in zoom-in duration-300">
                        {playError ? (
                          <>
                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center animate-bounce">
                              <Users className="w-8 h-8 text-white" />
                            </div>
                            <div className="text-center">
                              <p className="text-white font-bold text-lg">Tap to Sync Video</p>
                              <p className="text-xs text-zinc-400">Browser blocked autoplay. Click to join the party!</p>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                            <div>
                              <p className="text-white font-semibold">Waiting for friends...</p>
                              <p className="text-xs text-zinc-400">Syncing playback with other participants</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Controls Bar - visible on all devices */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-zinc-900/50 border-t border-zinc-800/50">
              <div className="flex-1 min-w-0">
                <h1 className="text-sm md:text-xl font-bold text-white truncate">{room?.title}</h1>
                <p className="text-xs text-zinc-400">Room: {roomCode}</p>
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                {sourcesData?.downloads && sourcesData.downloads.length > 0 && (
                  <select className="bg-zinc-800 text-xs text-white border border-zinc-700 rounded px-2 py-1" value={selectedQuality} onChange={(e) => setSelectedQuality(parseInt(e.target.value))}>
                    {sourcesData.downloads.map((s, i) => (
                      <option key={i} value={i}>
                        {s.resolution}p
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs md:text-sm font-semibold transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Invite</span>
                </button>
              </div>
            </div>
          </div>

          {/* Chat - improved mobile height */}
          <div className="h-64 lg:h-auto lg:flex-none lg:w-80 min-h-0 bg-zinc-900 border border-zinc-800 relative z-10 rounded-xl overflow-hidden shadow-xl">
            <ChatPanel roomCode={roomCode} messages={messages} onSendMessage={emitMessage} participantCount={participants.length} className="h-full" />
          </div>
        </div>
      </div>
    </>
  );
}
