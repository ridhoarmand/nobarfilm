import { useEffect, useRef, useState, useCallback } from 'react';import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/watch-party';

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('nobarfilm.ridhoarmand')) {
      return 'https://socket.ridhoarmand.eu.org';
    }
    return `${window.location.protocol}//${hostname}:4000`;
  }

  return 'http://localhost:4000';
};

// Callback interface - page.tsx will implement these
export interface PartySyncCallbacks {
  onRemotePlay?: (time: number, userId: string) => void;
  onRemotePause?: (time: number, userId: string) => void;
  onRemoteSeek?: (time: number, userId: string) => void;
  onInitialSync?: (time: number, isPlaying: boolean) => void;
  onRoomStateUpdate?: (data: any) => void;
}

export function usePartySync(roomCode: string, callbacks: PartySyncCallbacks, enabled: boolean = true) {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [playError, setPlayError] = useState(false);
  const [isRoomPlaying, setIsRoomPlaying] = useState(false);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const roomPlayingRef = useRef(false);
  const { user, profile } = useAuth();
  const isRemoteUpdate = useRef(false);
  const isInitialJoin = useRef(true);

  // Keep callbacks ref updated to avoid stale closures
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Keep latest user data for reconnection
  const userRef = useRef({ user, profile });
  useEffect(() => {
    userRef.current = { user, profile };
  }, [user, profile]);

  useEffect(() => {
    if (!roomCode || !user?.id || !enabled) return;

    const currentUser = userRef.current.user || user;
    const currentProfile = userRef.current.profile;
    const userName = currentProfile?.full_name || currentUser.email?.split('@')[0] || 'Guest';
    const userAvatar = currentProfile?.avatar_url;
    const socketUrl = getSocketUrl();

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Socket Connected!', newSocket.id);
    });

    newSocket.emit('join-room', {
      roomCode,
      user: {
        id: currentUser.id,
        name: userName,
        avatar: userAvatar,
      },
    });

    // --- INCOMING EVENTS ---

    newSocket.on('room-state', (data) => {
      console.log('[PartySync] Received room-state:', data.playback);
      callbacksRef.current.onRoomStateUpdate?.(data);
      setIsRoomPlaying(data.playback.isPlaying);
      roomPlayingRef.current = data.playback.isPlaying;

      // Only sync on initial join
      if (!isInitialJoin.current) {
        console.log('[PartySync] Ignoring room-state (not initial join)');
        return;
      }

      const now = Date.now();
      const drift = (now - data.playback.timestamp) / 1000;
      const targetTime = Math.max(0, data.playback.currentPosition + (data.playback.isPlaying ? drift : 0));

      console.log(`[PartySync] Initial sync - calling onInitialSync(${targetTime}, ${data.playback.isPlaying})`);

      // Let page.tsx handle the actual player control
      callbacksRef.current.onInitialSync?.(targetTime, data.playback.isPlaying);

      isInitialJoin.current = false;
    });

    newSocket.on('play', ({ time, userId }) => {
      console.log('[PartySync] Received PLAY from:', userId, 'at:', time);
      setIsRoomPlaying(true);
      roomPlayingRef.current = true;

      if (userId === newSocket.id) {
        console.log('[PartySync] Ignoring own play event');
        return;
      }

      // Flag remote update and call callback
      isRemoteUpdate.current = true;
      callbacksRef.current.onRemotePlay?.(time, userId);
      setTimeout(() => (isRemoteUpdate.current = false), 1000);
    });

    newSocket.on('pause', ({ time, userId }) => {
      console.log('[PartySync] Received PAUSE from:', userId, 'at:', time);
      setIsRoomPlaying(false);
      roomPlayingRef.current = false;

      if (userId === newSocket.id) {
        console.log('[PartySync] Ignoring own pause event');
        return;
      }

      isRemoteUpdate.current = true;
      callbacksRef.current.onRemotePause?.(time, userId);
      setTimeout(() => (isRemoteUpdate.current = false), 1000);
    });

    newSocket.on('seek', ({ time, userId }) => {
      console.log('[PartySync] Received SEEK from:', userId, 'to:', time);
      if (userId === newSocket.id) return;

      isRemoteUpdate.current = true;
      callbacksRef.current.onRemoteSeek?.(time, userId);
      setTimeout(() => (isRemoteUpdate.current = false), 1000);
    });

    // Periodic sync to keep server state fresh
    const syncInterval = setInterval(() => {
      // This will be called by page.tsx via emitSyncPosition
    }, 5000);

    return () => {
      clearInterval(syncInterval);
      newSocket.disconnect();
    };
  }, [roomCode, user?.id, enabled]);

  // --- OUTGOING EVENT EMITTERS ---
  // These are called by page.tsx when LOCAL user actions happen

  const emitPlay = useCallback(
    (time: number) => {
      if (isRemoteUpdate.current) {
        console.log('[PartySync] Blocking play emit - remote update in progress');
        return;
      }
      if (socketRef.current) {
        console.log('[PartySync] Emitting PLAY at:', time);
        setIsRoomPlaying(true);
        roomPlayingRef.current = true;
        socketRef.current.emit('play', { roomCode, time });
      }
    },
    [roomCode],
  );

  const emitPause = useCallback(
    (time: number) => {
      if (isRemoteUpdate.current) {
        console.log('[PartySync] Blocking pause emit - remote update in progress');
        return;
      }
      if (socketRef.current) {
        console.log('[PartySync] Emitting PAUSE at:', time);
        setIsRoomPlaying(false);
        roomPlayingRef.current = false;
        socketRef.current.emit('pause', { roomCode, time });
        socketRef.current.emit('buffering', { roomCode, isBuffering: false });
      }
    },
    [roomCode],
  );

  const emitSeek = useCallback(
    (time: number) => {
      if (isRemoteUpdate.current) {
        console.log('[PartySync] Blocking seek emit - remote update in progress');
        return;
      }
      if (socketRef.current) {
        console.log('[PartySync] Emitting SEEK to:', time);
        socketRef.current.emit('seek', { roomCode, time });
        socketRef.current.emit('buffering', { roomCode, isBuffering: true });
      }
    },
    [roomCode],
  );

  const emitBuffering = useCallback(
    (isBuffering: boolean) => {
      if (socketRef.current) {
        console.log('[PartySync] Emitting buffering:', isBuffering);
        socketRef.current.emit('buffering', { roomCode, isBuffering });
      }
    },
    [roomCode],
  );

  const emitMessage = useCallback(
    (message: string) => {
      socketRef.current?.emit('chat-message', { roomCode, message });
    },
    [roomCode],
  );

  const emitSyncPosition = useCallback(
    (time: number, isPlaying: boolean) => {
      socketRef.current?.emit('sync-position', { roomCode, time, isPlaying });
    },
    [roomCode],
  );

  return {
    socket,
    playError,
    isRoomPlaying,
    isRemoteUpdate,
    resolvePlayError: () => setPlayError(false),
    setPlayError,
    // Outgoing event emitters
    emitPlay,
    emitPause,
    emitSeek,
    emitBuffering,
    emitMessage,
    emitSyncPosition,
  };
}
