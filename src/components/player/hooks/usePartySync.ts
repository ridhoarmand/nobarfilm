import { useEffect, useRef, useState } from 'react';import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/watch-party';
import { APITypes } from 'plyr-react';

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window !== 'undefined') {
    // Dynamically use the same hostname as the web app, but port 4000
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return 'http://localhost:4000';
};

export function usePartySync(roomCode: string, playerRef: React.RefObject<APITypes | null>, onRoomStateUpdate?: (data: any) => void, enabled: boolean = true) {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [playError, setPlayError] = useState(false);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null); // Keep ref for internal strict access
  const { user, profile } = useAuth();
  const isRemoteUpdate = useRef(false);

  // Use ref to hold latest user/profile data for the socket payload
  // This allows us to omit 'user' and 'profile' objects from the useEffect deps
  const userRef = useRef({ user, profile });
  useEffect(() => {
    userRef.current = { user, profile };
  }, [user, profile]);

  useEffect(() => {
    // Wait for user and enabled flag
    if (!roomCode || !user?.id || !enabled) return;

    // Use Refs for data to avoid re-connection on profile updates
    const currentUser = userRef.current.user || user; // Fallback
    const currentProfile = userRef.current.profile;

    const userName = currentProfile?.full_name || currentUser.email?.split('@')[0] || 'Guest';
    const userAvatar = currentProfile?.avatar_url;

    // Initialize socket connection
    const socketUrl = getSocketUrl();
    console.log('🔌 Connecting to Socket Server at:', socketUrl);

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Socket Connected!', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket Connection Error:', err.message);
    });

    // Join room
    console.log('🚀 Emitting join-room for:', roomCode, currentUser.id);
    newSocket.emit('join-room', {
      roomCode,
      user: {
        id: currentUser.id,
        name: userName,
        avatar: userAvatar,
      },
    });

    // Listen for room state (fired when user joins to sync current playback state)
    newSocket.on('room-state', (data) => {
      console.log('📦 Received room-state:', data);
      onRoomStateUpdate?.(data);

      if (!playerRef.current?.plyr) return;

      // Calculate drift (time elapsed since last update on server)
      const now = Date.now();
      const drift = (now - data.playback.timestamp) / 1000;
      const targetTime = data.playback.currentPosition + (data.playback.isPlaying ? drift : 0);

      isRemoteUpdate.current = true;
      playerRef.current.plyr.currentTime = targetTime;

      if (data.playback.isPlaying) {
        // Room is playing - auto play
        const playPromise = playerRef.current.plyr.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn('Autoplay blocked by browser:', error);
            setPlayError(true);
          });
        }
      } else {
        // Room is paused - auto pause
        playerRef.current.plyr.pause();
      }

      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 500);
    });

    newSocket.on('play', ({ time, userId }) => {
      console.log('Socket PLAY', time);
      if (userId === newSocket.id) return;
      if (playerRef.current?.plyr) {
        isRemoteUpdate.current = true;
        if (Math.abs(playerRef.current.plyr.currentTime - time) > 0.5) {
          playerRef.current.plyr.currentTime = time;
        }
        const playPromise = playerRef.current.plyr.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => setPlayError(true));
        }
        setTimeout(() => (isRemoteUpdate.current = false), 500);
      }
    });

    newSocket.on('pause', ({ time, userId }) => {
      console.log('Socket PAUSE', time);
      if (userId === newSocket.id) return;
      if (playerRef.current?.plyr) {
        isRemoteUpdate.current = true;
        playerRef.current.plyr.currentTime = time;
        playerRef.current.plyr.pause();
        setTimeout(() => (isRemoteUpdate.current = false), 500);
      }
    });

    newSocket.on('seek', ({ time, userId }) => {
      console.log('Socket SEEK', time);
      if (userId === newSocket.id) return;
      if (playerRef.current?.plyr) {
        isRemoteUpdate.current = true;
        playerRef.current.plyr.currentTime = time;
        setTimeout(() => (isRemoteUpdate.current = false), 500);
      }
    });

    // ... logic continues ...

    // listeners...

    // ATTACH OUTGOING EVENT LISTENERS TO PLAYER
    // We do this inside the same effect or a separate one, ensuring playerRef is ready
    const attachPlayerListeners = () => {
      const player = playerRef.current?.plyr;
      if (!player || typeof player.on !== 'function') return;

      const onPlay = () => {
        if (!isRemoteUpdate.current && socketRef.current) {
          console.log('▶️ Local Play', player.currentTime);
          setPlayError(false); // Clear error on intentional play
          socketRef.current.emit('play', { roomCode, time: player.currentTime });
        }
      };

      const onPause = () => {
        if (!isRemoteUpdate.current && socketRef.current) {
          console.log('⏸️ Local Pause', player.currentTime);
          socketRef.current.emit('pause', { roomCode, time: player.currentTime });
        }
      };

      const onSeeked = () => {
        if (!isRemoteUpdate.current && socketRef.current) {
          console.log('⏩ Local Seek', player.currentTime);
          setTimeout(() => {
            socketRef.current?.emit('seek', { roomCode, time: player.currentTime });
          }, 50);
        }
      };

      // Ensure we don't duplicate listeners
      if (typeof player.off === 'function') {
        player.off('play', onPlay);
        player.off('pause', onPause);
        player.off('seeked', onSeeked);
      }

      player.on('play', onPlay);
      player.on('pause', onPause);
      player.on('seeked', onSeeked);
    };

    // Check periodically for plyr instance or depend on ref (ref doesn't trigger effect)
    // Best way using plyr-react is often hooking into 'ready' event if possible,
    // or polling briefly until mounted.
    let isCleanedUp = false;
    const interval = setInterval(() => {
      if (isCleanedUp) return; // Prevent race condition
      if (playerRef.current?.plyr) {
        attachPlayerListeners();
        clearInterval(interval);
      }
    }, 500);

    return () => {
      console.log('🔌 Disconnecting Socket (Cleanup)');
      isCleanedUp = true;
      clearInterval(interval);
      newSocket.disconnect(); // Use local var to ensure cleanup of THIS socket
      if (playerRef.current?.plyr) {
        // plyr cleanup if needed, though plyr-react manages instance usually
        // playerRef.current.plyr.off(...)
      }
    };
  }, [roomCode, user?.id, enabled]); // ONLY depend on ID and enabled flag

  return {
    socket, // Return state variable so parent re-renders when it's set
    playError, // Expose error state
    resolvePlayError: () => setPlayError(false), // Helper to clear error manually
    emitPlay: (time: number) => {
      setPlayError(false); // Clear error on intentional play
      if (!isRemoteUpdate.current && socketRef.current) {
        socketRef.current.emit('play', { roomCode, time });
      }
    },
    emitPause: (time: number) => {
      if (!isRemoteUpdate.current && socketRef.current) {
        socketRef.current.emit('pause', { roomCode, time });
      }
    },
    emitSeek: (time: number) => {
      if (!isRemoteUpdate.current && socketRef.current) {
        socketRef.current.emit('seek', { roomCode, time });
      }
    },
    emitBuffering: (isBuffering: boolean) => {
      if (socketRef.current) {
        socketRef.current.emit('buffering', { roomCode, isBuffering });
      }
    },
    emitMessage: (message: string) => {
      if (socketRef.current) {
        socketRef.current.emit('chat-message', { roomCode, message });
      }
    },
  };
}
