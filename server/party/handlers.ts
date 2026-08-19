// Socket.IO event handlers for Watch Party with Stream Sharing, Chat Activity Logs & Smart Buffer Lock

import { Server, Socket } from 'socket.io';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomBySocket,
  updatePlaybackState,
  setParticipantBuffering,
  kickParticipant,
  serializeParticipants,
  changeRoomMedia,
  areAllParticipantsReady,
  setRoomStreamPayload,
  getRoomStreamPayload,
  StreamPayload,
} from './roomManager';

// In-memory sliding-window rate limiter per socket
const rateLimitMap = new Map<string, number[]>();

function checkSocketRateLimit(
  socketId: string,
  action: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const key = `${socketId}:${action}`;
  const now = Date.now();
  const timestamps = (rateLimitMap.get(key) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    return false; // Rate limit exceeded
  }

  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}

// Periodic cleanup of expired rate limit entries (every 5 mins)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const valid = timestamps.filter((t) => now - t < 10000);
      if (valid.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, valid);
      }
    }
  }, 5 * 60 * 1000);
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  if (hrs > 0) return `${String(hrs).padStart(2, '0')}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export function registerPartyHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Party] Connected: ${socket.id}`);

    // === Room Lifecycle ===

    socket.on('party:create', (data, callback) => {
      try {
        const { displayName, avatarColor, subjectId, season = 0, episode = 0 } = data;
        const room = createRoom(
          socket.id,
          String(displayName).trim().slice(0, 20),
          avatarColor || '#EF4444',
          String(subjectId),
          Number(season) || 0,
          Number(episode) || 0,
        );
        socket.join(room.code);
        callback({
          success: true,
          roomCode: room.code,
          participants: serializeParticipants(room),
          playbackState: room.playbackState,
          streamPayload: room.streamPayload,
        });
        console.log(`[Party] Room ${room.code} created by "${displayName}"`);
      } catch (err) {
        callback({ success: false, error: 'Gagal membuat room' });
      }
    });

    socket.on('party:join', (data, callback) => {
      try {
        const { roomCode, displayName, avatarColor } = data;
        const result = joinRoom(
          roomCode,
          socket.id,
          String(displayName).trim().slice(0, 20),
          avatarColor || '#3B82F6',
        );

        if (!result.success) {
          callback({ success: false, error: result.error });
          return;
        }

        socket.join(result.room.code);
        const participants = serializeParticipants(result.room);

        // Notify existing members
        socket.to(result.room.code).emit('party:user-joined', {
          displayName,
          participants,
        });

        callback({
          success: true,
          participants,
          playbackState: result.room.playbackState,
          streamPayload: result.room.streamPayload,
          subjectId: result.room.subjectId,
          season: result.room.season,
          episode: result.room.episode,
        });

        console.log(`[Party] "${displayName}" joined room ${result.room.code}`);
      } catch (err) {
        callback({ success: false, error: 'Gagal bergabung' });
      }
    });

    socket.on('party:leave', () => handleLeave(socket, io));
    socket.on('disconnect', () => {
      handleLeave(socket, io);
      // Clean rate limit map for this socket
      for (const k of rateLimitMap.keys()) {
        if (k.startsWith(`${socket.id}:`)) rateLimitMap.delete(k);
      }
      console.log(`[Party] Disconnected: ${socket.id}`);
    });

    // === Stream Payload Sharing (Host to Room) ===

    socket.on('party:set-stream-payload', (payload: StreamPayload) => {
      const room = getRoomBySocket(socket.id);
      if (!room || room.hostSocketId !== socket.id) return;

      if (
        room.streamPayload?.streamUrl === payload.streamUrl &&
        room.streamPayload?.qualities?.length === payload.qualities?.length
      ) {
        return;
      }

      setRoomStreamPayload(room.code, payload);
      console.log(`[Party] Stream payload uploaded by host in room ${room.code}`);
      socket.to(room.code).emit('party:stream-payload-ready', payload);
    });

    // === Playback Sync with Clean Activity Logging ===

    socket.on('party:play', (data) => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      updatePlaybackState(room.code, true, data.currentTime);
      socket.to(room.code).emit('party:play', { currentTime: data.currentTime });

      const participant = room.participants.get(socket.id);
      io.to(room.code).emit('party:chat', {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'system',
        text: `▶️ ${participant?.displayName || 'Seseorang'} melanjutkan video`,
        timestamp: Date.now(),
      });
    });

    socket.on('party:pause', (data) => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      updatePlaybackState(room.code, false, data.currentTime);
      socket.to(room.code).emit('party:pause', { currentTime: data.currentTime });

      const participant = room.participants.get(socket.id);
      io.to(room.code).emit('party:chat', {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'system',
        text: `⏸️ ${participant?.displayName || 'Seseorang'} menjeda video di ${formatTime(data.currentTime)}`,
        timestamp: Date.now(),
      });
    });

    socket.on('party:seek', (data) => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      updatePlaybackState(room.code, room.playbackState.isPlaying, data.currentTime);
      socket.to(room.code).emit('party:seek', { currentTime: data.currentTime });

      const participant = room.participants.get(socket.id);
      io.to(room.code).emit('party:chat', {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'system',
        text: `⏩ ${participant?.displayName || 'Seseorang'} melompat ke ${formatTime(data.currentTime)}`,
        timestamp: Date.now(),
      });
    });

    // Heartbeat from host (every 5s) for drift correction
    socket.on('party:heartbeat', (data) => {
      const room = getRoomBySocket(socket.id);
      if (!room || room.hostSocketId !== socket.id) return;
      updatePlaybackState(room.code, data.isPlaying, data.currentTime);
      socket.to(room.code).emit('party:sync', {
        currentTime: data.currentTime,
        isPlaying: data.isPlaying,
      });
    });

    // === Smart Buffer Lock & Auto-Resume (Only when > 1 participants) ===

    socket.on('party:buffering', () => {
      const room = getRoomBySocket(socket.id);
      if (!room || room.participants.size <= 1) return;

      setParticipantBuffering(socket.id, true);
      const participant = room.participants.get(socket.id);
      // Pause playback state when buffering occurs
      updatePlaybackState(room.code, false, room.playbackState.currentTime);

      // Notify OTHER participants to pause and wait
      socket.to(room.code).emit('party:all-pause-buffering', {
        socketId: socket.id,
        displayName: participant?.displayName || 'Seseorang',
        participants: serializeParticipants(room),
      });
    });

    socket.on('party:buffered', () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;

      setParticipantBuffering(socket.id, false);

      // If alone, do not broadcast multi-user resume
      if (room.participants.size <= 1) return;

      const allReady = areAllParticipantsReady(room.code);

      if (allReady) {
        // Auto-resume playback for everyone when all participants are ready
        updatePlaybackState(room.code, true, room.playbackState.currentTime);
        io.to(room.code).emit('party:all-resume', {
          currentTime: room.playbackState.currentTime,
          participants: serializeParticipants(room),
        });
      } else {
        socket.to(room.code).emit('party:user-buffered', {
          socketId: socket.id,
          participants: serializeParticipants(room),
        });
      }
    });

    // === Host-Led Media & Episode Change ===

    socket.on('party:change-media', (data) => {
      const room = getRoomBySocket(socket.id);
      if (!room || room.hostSocketId !== socket.id) return;

      const { subjectId, season = 0, episode = 0, title = '' } = data;
      const ok = changeRoomMedia(room.code, String(subjectId), Number(season), Number(episode));

      if (ok) {
        console.log(`[Party] Host changed media in room ${room.code} to ${subjectId} (S${season}E${episode})`);
        io.to(room.code).emit('party:media-changed', {
          subjectId: String(subjectId),
          season: Number(season),
          episode: Number(episode),
          title: String(title),
        });
      }
    });

    // === Anti-Spam Chat (Max 5 msgs per 3s) ===

    socket.on('party:chat', (data) => {
      if (!checkSocketRateLimit(socket.id, 'chat', 5, 3000)) {
        socket.emit('party:rate-limited', { message: 'Terlalu banyak mengirim chat. Tunggu sebentar.' });
        return;
      }

      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant) return;

      const rawText = String(data.text || '').trim();
      if (!rawText) return;

      const message = {
        id: `${socket.id}-${Date.now()}`,
        type: 'user' as const,
        senderName: participant.displayName,
        senderColor: participant.avatarColor,
        text: rawText.slice(0, 500),
        timestamp: Date.now(),
      };

      io.to(room.code).emit('party:chat', message);
    });

    // === Anti-Spam Reactions (Max 8 emojis per 2s) ===

    socket.on('party:reaction', (data) => {
      if (!checkSocketRateLimit(socket.id, 'reaction', 8, 2000)) {
        return; // Silent throttle
      }

      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant) return;

      const reaction = {
        id: `${socket.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        emoji: String(data.emoji || '').slice(0, 4),
        senderName: participant.displayName,
        x: Math.random() * 80 + 10,
      };

      io.to(room.code).emit('party:reaction', reaction);
    });

    // === Host Actions ===

    socket.on('party:kick', (data) => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;

      const targetParticipant = room.participants.get(data.targetSocketId);
      const success = kickParticipant(room.code, data.targetSocketId, socket.id);
      if (success) {
        const targetSocket = io.sockets.sockets.get(data.targetSocketId);
        if (targetSocket) {
          targetSocket.emit('party:kicked');
          targetSocket.leave(room.code);
        }
        io.to(room.code).emit('party:user-left', {
          displayName: targetParticipant?.displayName || 'Unknown',
          participants: serializeParticipants(room),
          kicked: true,
        });
      }
    });
  });
}

function handleLeave(socket: Socket, io: Server): void {
  const { room, leftParticipant, newHost, isEmpty } = leaveRoom(socket.id);
  if (!room || !leftParticipant) return;

  socket.leave(room.code);

  if (!isEmpty) {
    socket.to(room.code).emit('party:user-left', {
      displayName: leftParticipant.displayName,
      participants: serializeParticipants(room),
    });

    if (newHost) {
      io.to(room.code).emit('party:host-changed', {
        newHostSocketId: newHost.socketId,
        newHostName: newHost.displayName,
      });
    }
  }
}
