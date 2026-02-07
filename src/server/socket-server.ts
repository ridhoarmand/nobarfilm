import { Server } from 'socket.io';
import { createServer } from 'http';
import { ServerToClientEvents, ClientToServerEvents, WatchPartyParticipant, PartyPlaybackState, ChatMessage, ChatState } from '../types/watch-party';

const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*', // Secure origin in prod, allow all in dev
    methods: ['GET', 'POST'],
  },
});

// Room state (in-memory)
interface RoomState {
  participants: Map<string, WatchPartyParticipant>;
  playback: PartyPlaybackState;
  chatHistory: ChatMessage[];
  hostSocketId: string | null; // Track host for position sync
}

const rooms = new Map<string, RoomState>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomCode, user }) => {
    socket.join(roomCode);

    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, {
        participants: new Map(),
        playback: {
          currentPosition: 0,
          isPlaying: false,
          isBuffering: false,
          lastActionBy: '', // System
          timestamp: Date.now(),
        },
        chatHistory: [],
        hostSocketId: socket.id, // First joiner is host
      });
    }

    const room = rooms.get(roomCode)!;

    // If host disconnected, assign new host
    if (!room.hostSocketId || !room.participants.has(room.hostSocketId)) {
      room.hostSocketId = socket.id;
    }

    // Create participant object
    const participant: WatchPartyParticipant = {
      id: user.id, // temporary ID for socket session if needed, but we use auth ID usually
      // Use socket ID as map key, but store user info
      room_id: '', // Not needed for in-memory, used in DB
      user_id: user.id,
      display_name: user.name,
      avatar_url: user.avatar || null,
      is_host: socket.id === room.hostSocketId, // Check if this user is host
      is_connected: true,
      last_seen_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    };

    // Store by socket ID
    room.participants.set(socket.id, participant);

    // Notify others
    socket.to(roomCode).emit('user-joined', participant);

    // Send current state to new user
    socket.emit('room-state', {
      participants: Array.from(room.participants.values()),
      playback: room.playback,
      chatHistory: room.chatHistory,
    });

    console.log(`User ${user.name} joined room ${roomCode}`);
  });

  socket.on('play', ({ roomCode, time }) => {
    const room = rooms.get(roomCode);
    if (room) {
      const participant = room.participants.get(socket.id);
      room.playback = {
        currentPosition: time,
        isPlaying: true,
        isBuffering: false,
        lastActionBy: socket.id,
        timestamp: Date.now(),
      };
      socket.to(roomCode).emit('play', {
        time,
        userId: socket.id,
        displayName: participant?.display_name || 'Someone',
      });
    }
  });

  socket.on('pause', ({ roomCode, time }) => {
    const room = rooms.get(roomCode);
    if (room) {
      const participant = room.participants.get(socket.id);
      room.playback = {
        currentPosition: time,
        isPlaying: false,
        isBuffering: false,
        lastActionBy: socket.id,
        timestamp: Date.now(),
      };
      socket.to(roomCode).emit('pause', {
        time,
        userId: socket.id,
        displayName: participant?.display_name || 'Someone',
      });
    }
  });

  socket.on('seek', ({ roomCode, time }) => {
    const room = rooms.get(roomCode);
    if (room) {
      const participant = room.participants.get(socket.id);
      room.playback.currentPosition = time;
      room.playback.timestamp = Date.now();
      socket.to(roomCode).emit('seek', {
        time,
        userId: socket.id,
        displayName: participant?.display_name || 'Someone',
      });
    }
  });

  socket.on('buffering', ({ roomCode, isBuffering }) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.playback.isBuffering = isBuffering;
      // Broadcast to everyone (including sender? No, sender knows they are buffering)
      // Actually, for UI "Waiting for...", we need to know WHO is buffering.
      socket.to(roomCode).emit('buffering', { userId: socket.id, isBuffering });
    }
  });

  // Periodic position sync from host to keep server state fresh
  // This ensures new joiners get accurate playback position
  socket.on('sync-position', ({ roomCode, time, isPlaying }) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.playback.currentPosition = time;
      room.playback.isPlaying = isPlaying;
      room.playback.timestamp = Date.now();
      // Don't broadcast - this is just to keep server state fresh
    }
  });

  socket.on('chat-message', ({ roomCode, message }) => {
    const room = rooms.get(roomCode);
    if (room) {
      const participant = room.participants.get(socket.id);
      if (participant) {
        const chatMsg: ChatMessage = {
          id: Date.now().toString(), // Simple ID
          room_id: '', // not needed in memory
          user_id: participant.user_id,
          display_name: participant.display_name,
          avatar_url: participant.avatar_url,
          message,
          timestamp: new Date().toISOString(),
        };

        // Store in history (limit to last 100 for better persistence)
        room.chatHistory.push(chatMsg);
        if (room.chatHistory.length > 100) room.chatHistory.shift();

        io.to(roomCode).emit('chat-message', chatMsg);
      }
    }
  });

  // User action event for system notifications (seek, play, pause, etc.)
  // These don't get stored in chat history to avoid spam
  socket.on('user-action', ({ roomCode, action, message }) => {
    const room = rooms.get(roomCode);
    if (room) {
      const participant = room.participants.get(socket.id);
      if (participant) {
        // Broadcast to others (not stored in chat history)
        socket.to(roomCode).emit('user-action', {
          userId: participant.user_id,
          displayName: participant.display_name,
          action,
          message,
        });
      }
    }
  });

  socket.on('disconnect', () => {
    // Find which room the socket was in
    rooms.forEach((room, roomCode) => {
      if (room.participants.has(socket.id)) {
        const participant = room.participants.get(socket.id);
        room.participants.delete(socket.id);

        if (participant) {
          // Notify others that user left
          socket.to(roomCode).emit('user-left', participant.user_id);

          // Clear buffering state for disconnected user
          // This prevents "waiting for user" overlay from getting stuck
          socket.to(roomCode).emit('buffering', { userId: socket.id, isBuffering: false });

          console.log(`User ${participant.display_name} left room ${roomCode}`);
        }

        // If host disconnected, assign new host
        if (room.hostSocketId === socket.id && room.participants.size > 0) {
          const newHostId = room.participants.keys().next().value ?? null;
          room.hostSocketId = newHostId;
          console.log(`Host transferred to ${newHostId} in room ${roomCode}`);
        }

        // Clean up empty rooms
        if (room.participants.size === 0) {
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted (empty)`);
        }
      }
    });
  });
});

const PORT = parseInt(process.env.SOCKET_PORT || '4000');
const HOST = '0.0.0.0'; // Bind to all interfaces for local network access

httpServer.listen(PORT, HOST, () => {
  console.log(`Socket.IO server running on ${HOST}:${PORT}`);
});
