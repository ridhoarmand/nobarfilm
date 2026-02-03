'use client';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
import { Users, Copy, Check, Share2, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

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
      autoplay: false,
    }),
    [],
  );

  // Memoize socket update handler
  const handleRoomStateUpdate = useCallback((data: any) => {
    if (data.participants) {
      setParticipants(data.participants);
    }
    if (data.chatHistory) setMessages(data.chatHistory);
  }, []);

  // Handle Socket Sync
  const { socket, emitPlay, emitPause, emitSeek, emitMessage, playError, resolvePlayError } = usePartySync(
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
    });

    socket.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('chat-message');
    };
  }, [socket]);

  // Copy Room Link
  const copyLink = () => {
    const url = `${window.location.origin}/watch-party/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Video Source (Mock for now, replace with real data handling)
  // In real app, you might fetch video URL based on room.subject_id
  // Video Source (Mock for now, replace with real data handling)
  const videoSource = useMemo(() => {
    return {
      type: 'video' as const,
      sources: [
        {
          src: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-720p.mp4', // Example
          type: 'video/mp4',
          size: 720,
        },
      ],
      poster: room?.cover_url || 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-HD.jpg',
    };
  }, [room?.cover_url]);

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
          <p className="text-gray-400">The watch party code is invalid or has expired.</p>
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
        {/* Background visual (optional) */}
        <div className="absolute inset-0 bg-[url('https://assets.nflxext.com/ffe/siteui/vlv3/f841d4c7-10e1-40af-bcae-07a3f8dc141a/f6d7434e-d6de-4185-a6d4-c77a2d08737b/US-en-20220502-popsignuptwoweeks-perspective_alpha_website_medium.jpg')] opacity-20 bg-cover bg-center blur-sm"></div>

        <div className="z-10 text-center max-w-md w-full bg-zinc-900/80 p-8 rounded-2xl backdrop-blur-md border border-zinc-800 shadow-2xl">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Ready to Join?</h1>
            <p className="text-zinc-400 text-sm">
              You are entering room: <span className="text-white font-mono">{roomCode}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-800/50 p-4 rounded-lg">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Watching</p>
              <h2 className="text-lg font-semibold truncate">{room?.title || 'Unknown Title'}</h2>
            </div>

            <button
              onClick={() => setHasJoined(true)}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
            >
              <span>Join Watch Party</span>
              <ChevronRight className="w-5 h-5" />
            </button>

            <p className="text-xs text-zinc-500 mt-4">Clicking join will sync your playback with other participants.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      {/* Main Container: Fixed Height (dvh for mobile address bar support) */}
      <div className="bg-black pt-20 h-[100dvh] flex flex-col lg:flex-row overflow-hidden">
        {/* Left/Top Content: Player */}
        {/* On mobile: Flex-none (auto height based on aspect ratio) */}
        {/* On desktop: Flex-1 (takes available width) */}
        <div className="flex-none lg:flex-1 flex flex-col items-center justify-center bg-black relative z-20">
          <div className="w-full max-w-[95%] lg:max-w-none aspect-video relative">
            <Plyr ref={playerRef} source={videoSource} options={plyrOptions} />
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
                    <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                    JOIN STREAM
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Room Info (Mobile Only - below video) */}
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
        {/* On mobile: Flex-1 (takes remaining height), min-h-0 (allows scrolling internal) */}
        {/* On desktop: Fixed width 96, Full height */}
        <div className="flex-1 lg:flex-none lg:w-96 min-h-0 bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 relative z-10">
          <ChatPanel roomCode={roomCode} messages={messages} onSendMessage={emitMessage} participantCount={participants.length} className="h-full" />
        </div>
      </div>
    </>
  );
}
