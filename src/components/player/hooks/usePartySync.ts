import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
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
  onRoomStateUpdate?: (data: unknown) => void;
}

export function usePartySync(roomCode: string, callbacks: PartySyncCallbacks, enabled: boolean = true) {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isRoomPlaying, setIsRoomPlaying] = useState(false);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const isRemoteUpdate = useRef(false);
  const { user } = useAuth();
  const callbacksRef = useRef(callbacks);
  const enabledRef = useRef(enabled);
  const userRef = useRef(user);

  // Keep refs updated
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!enabled || !roomCode || !user) return;

    const socketUrl = getSocketUrl();
    console.log('[Hook] Connecting to:', socketUrl);

    const newSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;
    const timer = setTimeout(() => {
      setSocket(newSocket);
    }, 0);

    newSocket.on('connect', () => {
      console.log('[Hook] Connected:', newSocket.id);
      newSocket.emit('join-room', {
        roomCode,
        user: {
          id: user.id,
          name: user.user_metadata.full_name || user.email || 'Guest',
          avatar: user.user_metadata.avatar_url,
        },
      });
      setHasJoined(true);
    });

    newSocket.on('play', (data) => {
      if (data.userId === userRef.current?.id) return;
      isRemoteUpdate.current = true;
      setIsRoomPlaying(true);
      callbacksRef.current.onRemotePlay?.(data.time, data.userId);
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 1000);
    });

    newSocket.on('pause', (data) => {
      if (data.userId === userRef.current?.id) return;
      isRemoteUpdate.current = true;
      setIsRoomPlaying(false);
      callbacksRef.current.onRemotePause?.(data.time, data.userId);
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 1000);
    });

    newSocket.on('seek', (data) => {
      if (data.userId === userRef.current?.id) return;
      isRemoteUpdate.current = true;
      callbacksRef.current.onRemoteSeek?.(data.time, data.userId);
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 1000);
    });

    newSocket.on('room-state', (data) => {
      callbacksRef.current.onInitialSync?.(data.playback.currentPosition, data.playback.isPlaying);
      setIsRoomPlaying(data.playback.isPlaying);
      callbacksRef.current.onRoomStateUpdate?.(data);
    });

    return () => {
      clearTimeout(timer);
      console.log('[Hook] Disconnecting');
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setHasJoined(false);
    };
  }, [roomCode, user, enabled]);

  const emitPlay = useCallback(
    (time: number) => {
      if (socketRef.current && !isRemoteUpdate.current) {
        socketRef.current.emit('play', { roomCode, time });
        setIsRoomPlaying(true);
      }
    },
    [roomCode],
  );

  const emitPause = useCallback(
    (time: number) => {
      if (socketRef.current && !isRemoteUpdate.current) {
        socketRef.current.emit('pause', { roomCode, time });
        setIsRoomPlaying(false);
      }
    },
    [roomCode],
  );

  const emitSeek = useCallback(
    (time: number) => {
      if (socketRef.current && !isRemoteUpdate.current) {
        socketRef.current.emit('seek', { roomCode, time });
      }
    },
    [roomCode],
  );

  const emitBuffering = useCallback(
    (isBuffering: boolean) => {
      if (socketRef.current) {
        socketRef.current.emit('buffering', { roomCode, isBuffering });
      }
    },
    [roomCode],
  );

  const emitMessage = useCallback(
    (message: string) => {
      if (socketRef.current) {
        socketRef.current.emit('chat-message', { roomCode, message });
      }
    },
    [roomCode],
  );

  return {
    socket,
    hasJoined,
    isRoomPlaying,
    emitPlay,
    emitPause,
    emitSeek,
    emitBuffering,
    emitMessage,
    isRemoteUpdate,
  };
}
