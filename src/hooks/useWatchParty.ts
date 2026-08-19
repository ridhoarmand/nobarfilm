'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWatchPartyStore } from '@/stores/watchPartyStore';
import type { PartyParticipant, PartyChatMessage, PartyReaction, PartyStreamPayload } from '@/types/party';
import toast from 'react-hot-toast';

interface UseWatchPartyOptions {
  subjectId: string;
  season: number;
  episode: number;
  partyCode?: string | null;
  onRemoteMediaChange?: (data: { subjectId: string; season: number; episode: number; title: string }) => void;
}

function safePlayVideo(video: HTMLVideoElement) {
  video.play().catch((err) => {
    if (err?.name === 'NotAllowedError') {
      toast('Klik layar video untuk memulai pemutaran 🔊', {
        id: 'autoplay-blocked',
        duration: 4000,
        icon: '▶️',
      });
    }
  });
}

export function useWatchParty(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UseWatchPartyOptions,
) {
  // Granular selectors: only re-render when needed specific values change
  const roomCode = useWatchPartyStore((s) => s.roomCode);
  const isHost = useWatchPartyStore((s) => s.isHost);
  const participants = useWatchPartyStore((s) => s.participants);
  const messages = useWatchPartyStore((s) => s.messages);
  const isConnected = useWatchPartyStore((s) => s.isConnected);
  const mySocketId = useWatchPartyStore((s) => s.mySocketId);
  const streamPayload = useWatchPartyStore((s) => s.streamPayload);
  const hostOnlyControls = useWatchPartyStore((s) => s.hostOnlyControls);

  const socketRef = useRef<Socket | null>(null);
  const isSyncRef = useRef(false);
  const bufferingDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isBufferingReportedRef = useRef(false);
  const resumeGracePeriodUntilRef = useRef<number>(0);
  const localActionCooldownRef = useRef<number>(0);
  const suppressHeartbeatUntilRef = useRef<number>(0);

  // Initialize socket connection only when in party or partyCode in URL
  const shouldConnect = !!options.partyCode || !!roomCode;

  useEffect(() => {
    if (!shouldConnect) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io({
      path: '/api/party/socket',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      useWatchPartyStore.getState().setConnected(true);
      useWatchPartyStore.getState().setMySocketId(socket.id || null);
    });

    socket.on('disconnect', () => {
      useWatchPartyStore.getState().setConnected(false);
      useWatchPartyStore.getState().setMySocketId(null);
    });

    // === Playback Sync Events ===

    socket.on('party:play', (data: { currentTime: number }) => {
      const video = videoRef.current;
      if (!video) return;
      isSyncRef.current = true;
      suppressHeartbeatUntilRef.current = Date.now() + 3000;
      if (Math.abs(video.currentTime - data.currentTime) > 1.5) {
        video.currentTime = data.currentTime;
      }
      safePlayVideo(video);
    });

    socket.on('party:pause', (data: { currentTime: number }) => {
      const video = videoRef.current;
      if (!video) return;
      isSyncRef.current = true;
      suppressHeartbeatUntilRef.current = Date.now() + 3000;
      video.currentTime = data.currentTime;
      video.pause();
    });

    socket.on('party:seek', (data: { currentTime: number }) => {
      const video = videoRef.current;
      if (!video) return;
      isSyncRef.current = true;
      suppressHeartbeatUntilRef.current = Date.now() + 3000;
      video.currentTime = data.currentTime;
    });

    // Periodic heartbeat sync from host — correct drift > 2s
    socket.on('party:sync', (data: { currentTime: number; isPlaying: boolean }) => {
      // If this client recently performed a play/pause/seek (< 2.5s), don't let stale echoes override local state
      if (Date.now() < localActionCooldownRef.current) return;

      const video = videoRef.current;
      if (!video) return;

      const drift = Math.abs(video.currentTime - data.currentTime);
      if (drift > 2.0) {
        isSyncRef.current = true;
        video.currentTime = data.currentTime;
      }

      const localPlaying = !video.paused;
      if (data.isPlaying !== localPlaying) {
        isSyncRef.current = true;
        if (data.isPlaying) safePlayVideo(video);
        else video.pause();
      }
    });

    // === Smart Buffer Lock & Auto-Resume ===

    socket.on('party:all-pause-buffering', (data: { socketId?: string; displayName: string; participants: PartyParticipant[] }) => {
      useWatchPartyStore.getState().setParticipants(data.participants);
      if (data.socketId && data.socketId === socket.id) {
        return; // Don't pause or toast myself
      }
      const video = videoRef.current;
      if (video && !video.paused) {
        isSyncRef.current = true;
        video.pause();
      }
      toast(`⏳ Menunggu ${data.displayName} buffering...`, {
        id: 'party-buffering-lock',
        duration: 8000,
        icon: '⏳',
      });
    });

    socket.on('party:all-resume', (data: { currentTime: number; participants: PartyParticipant[] }) => {
      useWatchPartyStore.getState().setParticipants(data.participants);
      toast.dismiss('party-buffering-lock');
      resumeGracePeriodUntilRef.current = Date.now() + 2000; // 2s grace period to prevent immediate re-stall lock
      const video = videoRef.current;
      if (video) {
        isSyncRef.current = true;
        if (Math.abs(video.currentTime - data.currentTime) > 1.2) {
          video.currentTime = data.currentTime;
        }
        safePlayVideo(video);
      }
      toast.success('Semua siap! Video dilanjutkan 🎉', {
        id: 'party-resume-toast',
        duration: 2500,
      });
    });

    socket.on('party:buffering-timeout', (data: { message?: string }) => {
      toast(data.message || 'Koneksi lambat terdeteksi. Video dilanjutkan.', {
        id: 'buffering-timeout-toast',
        icon: '⚠️',
        duration: 4000,
      });
    });

    socket.on('party:user-buffered', (data: { participants: PartyParticipant[] }) => {
      useWatchPartyStore.getState().setParticipants(data.participants);
    });

    // === Stream Payload Sharing (Host to Room) ===

    socket.on('party:stream-payload-ready', (payload: PartyStreamPayload) => {
      const current = useWatchPartyStore.getState().streamPayload;
      if (current?.streamUrl !== payload.streamUrl) {
        useWatchPartyStore.getState().setStreamPayload(payload);
      }
    });

    // === Host-Led Media / Episode Follow ===

    socket.on('party:media-changed', (data: { subjectId: string; season: number; episode: number; title: string }) => {
      toast(`Host memutar: ${data.title || 'konten baru'} 🎬`, {
        icon: '🍿',
        duration: 4000,
      });
      useWatchPartyStore.getState().setStreamPayload(null);
      if (options.onRemoteMediaChange) {
        options.onRemoteMediaChange(data);
      }
    });

    // === Host-Only Controls ===

    socket.on('party:host-controls-changed', (data: { hostOnlyControls: boolean }) => {
      useWatchPartyStore.getState().setHostOnlyControls(data.hostOnlyControls);
    });

    socket.on('party:control-denied', (data: { message: string }) => {
      toast.error(data.message || 'Hanya host yang bisa mengontrol video', {
        id: 'control-denied-toast',
        duration: 2500,
      });
      // Revert local video state to match server state (undo the local action)
      const video = videoRef.current;
      if (video) {
        isSyncRef.current = true;
      }
    });

    // === Rate Limiting Warning ===

    socket.on('party:rate-limited', (data: { message: string }) => {
      toast.error(data.message || 'Terlalu cepat mengirim pesan', {
        id: 'rate-limit-toast',
        duration: 2000,
      });
    });

    // === Room Events ===

    socket.on('party:user-joined', (data: { displayName: string; participants: PartyParticipant[] }) => {
      useWatchPartyStore.getState().setParticipants(data.participants);
      useWatchPartyStore.getState().addSystemMessage(`${data.displayName} bergabung 🎉`);
      toast(`${data.displayName} bergabung!`, { icon: '👋' });
    });

    socket.on('party:user-left', (data: { displayName: string; participants: PartyParticipant[]; kicked?: boolean }) => {
      useWatchPartyStore.getState().setParticipants(data.participants);
      useWatchPartyStore.getState().addSystemMessage(
        data.kicked
          ? `${data.displayName} dikeluarkan dari room`
          : `${data.displayName} keluar`,
      );
    });

    socket.on('party:host-changed', (data: { newHostSocketId: string; newHostName: string }) => {
      const isMe = data.newHostSocketId === socket.id;
      useWatchPartyStore.getState().setIsHost(isMe);
      useWatchPartyStore.getState().addSystemMessage(`${data.newHostName} sekarang menjadi host`);
      if (isMe) {
        toast('Kamu sekarang host! 👑', { icon: '👑' });
      }
    });

    socket.on('party:kicked', () => {
      useWatchPartyStore.getState().reset();
      toast.error('Kamu dikeluarkan dari room');
    });

    // === Chat & Reactions ===

    socket.on('party:chat', (data: PartyChatMessage) => {
      useWatchPartyStore.getState().addMessage(data);
      const currentState = useWatchPartyStore.getState();
      if (!currentState.isPanelOpen) {
        currentState.incrementUnreadCount();
        if (data.senderName) {
          toast(`${data.senderName}: ${data.text}`, {
            icon: '💬',
            duration: 3000,
            id: `chat-${data.id}`,
          });
        }
      }
    });

    socket.on('party:reaction', (data: PartyReaction) => {
      useWatchPartyStore.getState().addReaction(data);
      // Auto-remove after animation (2s)
      setTimeout(() => {
        useWatchPartyStore.getState().removeReaction(data.id);
      }, 2000);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldConnect]);

  // Heartbeat: host sends current position every 5s (suppressed when syncing to recent participant action)
  useEffect(() => {
    if (!isHost || !roomCode) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const socket = socketRef.current;
      const currentState = useWatchPartyStore.getState();
      if (video && socket && currentState.roomCode && currentState.isHost) {
        if (Date.now() < suppressHeartbeatUntilRef.current) {
          return; // Do not send heartbeat while adapting to another participant's recent seek/pause/play
        }
        socket.emit('party:heartbeat', {
          currentTime: video.currentTime,
          isPlaying: !video.paused,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isHost, roomCode, videoRef]);

  // === Actions ===

  const createRoom = useCallback(
    async (displayName: string): Promise<string | null> => {
      const socket = socketRef.current;
      if (!socket) return null;

      return new Promise((resolve) => {
        socket.emit(
          'party:create',
          {
            displayName,
            avatarColor: useWatchPartyStore.getState().guestColor,
            subjectId: options.subjectId,
            season: options.season,
            episode: options.episode,
          },
          (response: {
            success: boolean;
            roomCode?: string;
            participants?: PartyParticipant[];
            hostOnlyControls?: boolean;
            error?: string;
          }) => {
            if (response.success && response.roomCode) {
              useWatchPartyStore.getState().setRoomCode(response.roomCode);
              useWatchPartyStore.getState().setIsHost(true);
              if (response.participants) useWatchPartyStore.getState().setParticipants(response.participants);
              useWatchPartyStore.getState().setHostOnlyControls(response.hostOnlyControls ?? false);
              useWatchPartyStore.getState().setPanelOpen(true);
              useWatchPartyStore.getState().setGuestName(displayName);
              resolve(response.roomCode);
            } else {
              toast.error(response.error || 'Gagal membuat room');
              resolve(null);
            }
          },
        );
      });
    },
    [options.subjectId, options.season, options.episode],
  );

  const joinRoom = useCallback(
    async (code: string, displayName: string): Promise<boolean> => {
      const socket = socketRef.current;
      if (!socket) return false;

      return new Promise((resolve) => {
        socket.emit(
          'party:join',
          {
            roomCode: code.toUpperCase(),
            displayName,
            avatarColor: useWatchPartyStore.getState().guestColor,
          },
          (response: {
            success: boolean;
            playbackState?: { isPlaying: boolean; currentTime: number };
            participants?: PartyParticipant[];
            streamPayload?: PartyStreamPayload;
            hostOnlyControls?: boolean;
            recentMessages?: PartyChatMessage[];
            error?: string;
          }) => {
            if (response.success) {
              useWatchPartyStore.getState().setRoomCode(code.toUpperCase());
              useWatchPartyStore.getState().setIsHost(response.playbackState ? false : true);
              if (response.participants) useWatchPartyStore.getState().setParticipants(response.participants);
              useWatchPartyStore.getState().setGuestName(displayName);
              useWatchPartyStore.getState().setHostOnlyControls(response.hostOnlyControls ?? false);

              // Load recent chat history for late joiners
              if (response.recentMessages && response.recentMessages.length > 0) {
                for (const msg of response.recentMessages) {
                  useWatchPartyStore.getState().addMessage(msg);
                }
              }

              if (response.streamPayload) {
                useWatchPartyStore.getState().setStreamPayload(response.streamPayload);
              }

              // Sync to current playback position
              const video = videoRef.current;
              if (video && response.playbackState) {
                isSyncRef.current = true;
                video.currentTime = response.playbackState.currentTime;
                if (response.playbackState.isPlaying) {
                  safePlayVideo(video);
                }
              }

              toast.success('Bergabung ke nobar! 🎉');
              resolve(true);
            } else {
              toast.error(response.error || 'Gagal bergabung');
              resolve(false);
            }
          },
        );
      });
    },
    [videoRef],
  );

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('party:leave');
    useWatchPartyStore.getState().reset();
    toast('Keluar dari nobar', { icon: '👋' });
  }, []);

  const sendChat = useCallback((text: string) => {
    if (!text.trim()) return;
    socketRef.current?.emit('party:chat', { text: text.trim() });
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    socketRef.current?.emit('party:reaction', { emoji });
  }, []);

  const kickUser = useCallback((targetSocketId: string) => {
    socketRef.current?.emit('party:kick', { targetSocketId });
  }, []);

  // Host uploads stream payload to room so guests don't need to hit upstream API
  const uploadStreamPayload = useCallback((payload: PartyStreamPayload) => {
    const currentRoom = useWatchPartyStore.getState().roomCode;
    if (!socketRef.current || !currentRoom) return;

    const current = useWatchPartyStore.getState().streamPayload;
    if (
      current?.streamUrl === payload.streamUrl &&
      current?.qualities?.length === payload.qualities?.length &&
      current?.subtitles?.length === payload.subtitles?.length
    ) {
      return;
    }

    useWatchPartyStore.getState().setStreamPayload(payload);
    socketRef.current.emit('party:set-stream-payload', payload);
  }, []);

  // Host changes media / episode for everyone
  const changeMedia = useCallback(
    (subjectId: string, season = 0, episode = 0, title = '') => {
      if (!socketRef.current || !useWatchPartyStore.getState().roomCode) return;
      socketRef.current.emit('party:change-media', {
        subjectId,
        season,
        episode,
        title,
      });
    },
    [],
  );

  // Host toggles host-only playback controls
  const toggleHostControls = useCallback(() => {
    if (!socketRef.current || !useWatchPartyStore.getState().roomCode) return;
    socketRef.current.emit('party:toggle-host-controls');
  }, []);

  // Party-aware callbacks for MoviePlayer (directly dispatched on user interaction)
  const onPartyPlay = useCallback(() => {
    const video = videoRef.current;
    if (video && socketRef.current && useWatchPartyStore.getState().roomCode) {
      localActionCooldownRef.current = Date.now() + 2500;
      suppressHeartbeatUntilRef.current = Date.now() + 3000;
      socketRef.current.emit('party:play', { currentTime: video.currentTime });
    }
  }, [videoRef]);

  const onPartyPause = useCallback(() => {
    const video = videoRef.current;
    if (video && socketRef.current && useWatchPartyStore.getState().roomCode) {
      localActionCooldownRef.current = Date.now() + 2500;
      suppressHeartbeatUntilRef.current = Date.now() + 3000;
      socketRef.current.emit('party:pause', { currentTime: video.currentTime });
    }
  }, [videoRef]);

  const onPartySeek = useCallback((time: number) => {
    if (socketRef.current && useWatchPartyStore.getState().roomCode) {
      localActionCooldownRef.current = Date.now() + 2500;
      suppressHeartbeatUntilRef.current = Date.now() + 3000;
      socketRef.current.emit('party:seek', { currentTime: time });
    }
  }, []);

  // Notify buffering state (Smart buffer lock with debounce & micro-stall suppression)
  const notifyBuffering = useCallback((isBuffering: boolean) => {
    if (!socketRef.current || !useWatchPartyStore.getState().roomCode) return;

    if (bufferingDebounceTimerRef.current) {
      clearTimeout(bufferingDebounceTimerRef.current);
      bufferingDebounceTimerRef.current = null;
    }

    if (isBuffering) {
      // Ignore if within resume grace period (prevent immediate re-stall loop)
      if (Date.now() < resumeGracePeriodUntilRef.current) {
        return;
      }
      // Ignore if video is locally paused
      const video = videoRef.current;
      if (video && video.paused) {
        return;
      }

      // Debounce 350ms to swallow micro-stalls
      bufferingDebounceTimerRef.current = setTimeout(() => {
        if (!socketRef.current || !useWatchPartyStore.getState().roomCode) return;
        const v = videoRef.current;
        if (v && !v.paused) {
          isBufferingReportedRef.current = true;
          socketRef.current.emit('party:buffering');
        }
      }, 350);
    } else {
      if (isBufferingReportedRef.current) {
        isBufferingReportedRef.current = false;
        socketRef.current.emit('party:buffered');
      }
    }
  }, [videoRef]);

  return {
    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    sendChat,
    sendReaction,
    kickUser,
    notifyBuffering,
    changeMedia,
    uploadStreamPayload,
    toggleHostControls,

    // Party-aware player callbacks
    onPartyPlay,
    onPartyPause,
    onPartySeek,

    // State
    isInParty: !!roomCode,
    roomCode,
    participants,
    messages,
    isHost,
    isConnected,
    mySocketId,
    streamPayload,
    hostOnlyControls,
  };
}
