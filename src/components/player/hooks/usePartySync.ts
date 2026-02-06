import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/watch-party';
import { MediaPlayerInstance } from '@vidstack/react';
import toast from 'react-hot-toast';

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return 'http://localhost:4000';
};

export function usePartySync(roomCode: string, playerRef: React.RefObject<MediaPlayerInstance | null>, onRoomStateUpdate?: (data: any) => void, enabled: boolean = true) {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [playError, setPlayError] = useState(false);
  const [isRoomPlaying, setIsRoomPlaying] = useState(false);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const roomPlayingRef = useRef(false);
  const { user, profile } = useAuth();
  const isRemoteUpdate = useRef(false);

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
      onRoomStateUpdate?.(data);
      setIsRoomPlaying(data.playback.isPlaying);
      roomPlayingRef.current = data.playback.isPlaying;

      if (!playerRef.current) return;

      const now = Date.now();
      const drift = (now - data.playback.timestamp) / 1000;
      const targetTime = Math.max(0, data.playback.currentPosition + (data.playback.isPlaying ? drift : 0));

      isRemoteUpdate.current = true;
      if (playerRef.current) {
        playerRef.current.currentTime = targetTime;

        if (data.playback.isPlaying) {
          playerRef.current.play().catch((err) => {
            if (err.name === 'NotAllowedError') {
              setPlayError(true);
            }
          });
        } else {
          playerRef.current.pause();
        }
      }

      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 2000);
    });

    newSocket.on('play', ({ time, userId }) => {
      setIsRoomPlaying(true);
      roomPlayingRef.current = true;
      if (userId === newSocket.id) return;
      if (playerRef.current) {
        isRemoteUpdate.current = true;
        if (Math.abs(playerRef.current.currentTime - time) > 1) {
          playerRef.current.currentTime = time;
        }
        playerRef.current.play().catch((err) => {
          if (err.name === 'NotAllowedError') {
            setPlayError(true);
          }
        });
        setTimeout(() => (isRemoteUpdate.current = false), 2000);
      }
    });

    newSocket.on('pause', ({ time, userId }) => {
      setIsRoomPlaying(false);
      roomPlayingRef.current = false;
      if (userId === newSocket.id) return;
      if (playerRef.current) {
        isRemoteUpdate.current = true;
        playerRef.current.currentTime = time;
        playerRef.current.pause();
        setTimeout(() => (isRemoteUpdate.current = false), 2000);
      }
    });

    newSocket.on('seek', ({ time, userId }) => {
      if (userId === newSocket.id) return;
      if (playerRef.current) {
        isRemoteUpdate.current = true;
        playerRef.current.currentTime = time;

        // Auto-play if room is playing
        if (roomPlayingRef.current) {
          playerRef.current.play().catch((err) => {
            if (err.name === 'NotAllowedError') {
              setPlayError(true);
            }
          });
        }

        setTimeout(() => (isRemoteUpdate.current = false), 2000);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomCode, user?.id, enabled]);

  // --- OUTGOING EVENT HANDLERS ---

  const handleLocalPlay = useCallback(() => {
    if (!isRemoteUpdate.current && socketRef.current && playerRef.current) {
      setPlayError(false);
      setIsRoomPlaying(true);
      socketRef.current.emit('play', { roomCode, time: playerRef.current.currentTime });
    }
  }, [roomCode]);

  const handleLocalPause = useCallback(() => {
    if (!isRemoteUpdate.current && socketRef.current && playerRef.current) {
      setIsRoomPlaying(false);
      socketRef.current.emit('pause', { roomCode, time: playerRef.current.currentTime });
      // Clear buffering state on pause to prevent stuck overlays for others
      socketRef.current.emit('buffering', { roomCode, isBuffering: false });
    }
  }, [roomCode]);

  const handleLocalSeek = useCallback(
    (time: number) => {
      if (!isRemoteUpdate.current && socketRef.current) {
        socketRef.current.emit('seek', { roomCode, time });

        // Add chat notification for skip to satisfy "user skip muncul di chat"
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        socketRef.current.emit('chat-message', {
          roomCode,
          message: `jumped to ${timeStr}`,
        });
      }
    },
    [roomCode],
  );

  const handleLocalWaiting = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('buffering', { roomCode, isBuffering: true });
    }
  }, [roomCode]);

  const handleLocalPlaying = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('buffering', { roomCode, isBuffering: false });
    }
  }, [roomCode]);

  const emitMessage = useCallback(
    (message: string) => {
      socketRef.current?.emit('chat-message', { roomCode, message });
    },
    [roomCode],
  );

  return {
    socket,
    playError,
    isRoomPlaying,
    resolvePlayError: () => setPlayError(false),
    emitMessage,
    handleLocalPlay,
    handleLocalPause,
    handleLocalSeek,
    handleLocalWaiting,
    handleLocalPlaying,
  };
}
