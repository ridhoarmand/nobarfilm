/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const httpServer = (0, http_1.createServer)();
const io = new socket_io_1.Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*', // Secure origin in prod, allow all in dev
    methods: ['GET', 'POST'],
  },
});
const rooms = new Map();
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
          lastActionBy: '', // System
          timestamp: Date.now(),
        },
        chatHistory: [],
      });
    }
    const room = rooms.get(roomCode);
    // Create participant object
    const participant = {
      id: user.id, // temporary ID for socket session if needed, but we use auth ID usually
      // Use socket ID as map key, but store user info
      room_id: '', // Not needed for in-memory, used in DB
      user_id: user.id,
      display_name: user.name,
      avatar_url: user.avatar || null,
      is_host: room.participants.size === 0, // First joiner is host logic (simplified)
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
      room.playback = {
        currentPosition: time,
        isPlaying: true,
        lastActionBy: socket.id,
        timestamp: Date.now(),
      };
      // Broadcast to everyone (including sender for sync confirmation, or exclude sender)
      // Usually exclude sender to avoid loop, but for strict sync, include sender?
      // Standard: broadcast to others
      socket.to(roomCode).emit('play', { time, userId: socket.id });
    }
  });
  socket.on('pause', ({ roomCode, time }) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.playback = {
        currentPosition: time,
        isPlaying: false,
        lastActionBy: socket.id,
        timestamp: Date.now(),
      };
      socket.to(roomCode).emit('pause', { time, userId: socket.id });
    }
  });
  socket.on('seek', ({ roomCode, time }) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.playback.currentPosition = time;
      room.playback.timestamp = Date.now();
      socket.to(roomCode).emit('seek', { time, userId: socket.id });
    }
  });
  socket.on('chat-message', ({ roomCode, message }) => {
    const room = rooms.get(roomCode);
    if (room) {
      const participant = room.participants.get(socket.id);
      if (participant) {
        const chatMsg = {
          id: Date.now().toString(), // Simple ID
          room_id: '', // not needed in memory
          user_id: participant.user_id,
          display_name: participant.display_name,
          avatar_url: participant.avatar_url,
          message,
          timestamp: new Date().toISOString(),
        };
        // Store in history (limit to last 50)
        room.chatHistory.push(chatMsg);
        if (room.chatHistory.length > 50)
          room.chatHistory.shift();
        io.to(roomCode).emit('chat-message', chatMsg);
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
          socket.to(roomCode).emit('user-left', participant.user_id);
          console.log(`User ${participant.display_name} left room ${roomCode}`);
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
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
