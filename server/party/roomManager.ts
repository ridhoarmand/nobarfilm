// Server-side room manager — all state is in-memory (ephemeral)

const MAX_PARTICIPANTS = 4;
const CLEANUP_DELAY = 5 * 60 * 1000; // 5 minutes

interface Participant {
  socketId: string;
  displayName: string;
  avatarColor: string;
  isHost: boolean;
  isBuffering: boolean;
}

export interface SubtitleItem {
  kind?: string;
  label: string;
  srcLang?: string;
  src: string;
  default?: boolean;
}

export interface QualityItem {
  label: string;
  url: string;
  quality?: number;
}

export interface StreamPayload {
  streamUrl: string;
  qualities: QualityItem[];
  subtitles: SubtitleItem[];
  duration?: number;
}

interface Room {
  code: string;
  hostSocketId: string;
  subjectId: string;
  season: number;
  episode: number;
  participants: Map<string, Participant>;
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    lastUpdated: number;
  };
  streamPayload: StreamPayload | null;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

// No I/O/0/1 to avoid visual confusion
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  let code: string;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

export function createRoom(
  hostSocketId: string,
  hostName: string,
  hostColor: string,
  subjectId: string,
  season: number,
  episode: number,
): Room {
  const code = generateRoomCode();
  const host: Participant = {
    socketId: hostSocketId,
    displayName: hostName,
    avatarColor: hostColor,
    isHost: true,
    isBuffering: false,
  };

  const room: Room = {
    code,
    hostSocketId,
    subjectId,
    season,
    episode,
    participants: new Map([[hostSocketId, host]]),
    playbackState: { isPlaying: false, currentTime: 0, lastUpdated: Date.now() },
    streamPayload: null,
    cleanupTimer: null,
  };

  rooms.set(code, room);
  socketToRoom.set(hostSocketId, code);
  return room;
}

export function joinRoom(
  code: string,
  socketId: string,
  displayName: string,
  avatarColor: string,
): { success: true; room: Room } | { success: false; error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { success: false, error: 'Room tidak ditemukan' };
  if (room.participants.size >= MAX_PARTICIPANTS)
    return { success: false, error: 'Room penuh (maks 4 orang)' };

  // Cancel cleanup timer if set
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }

  // Clean up temporary placeholder if created via API
  if (room.hostSocketId.startsWith('init-')) {
    room.participants.delete(room.hostSocketId);
    socketToRoom.delete(room.hostSocketId);
    room.hostSocketId = socketId;
  }

  const isHost = room.participants.size === 0 || room.hostSocketId === socketId;
  if (isHost) {
    room.hostSocketId = socketId;
  }

  const participant: Participant = {
    socketId,
    displayName,
    avatarColor,
    isHost,
    isBuffering: false,
  };

  room.participants.set(socketId, participant);
  socketToRoom.set(socketId, code.toUpperCase());
  return { success: true, room };
}

export function leaveRoom(socketId: string): {
  room: Room | null;
  leftParticipant: Participant | null;
  newHost: Participant | null;
  isEmpty: boolean;
} {
  const code = socketToRoom.get(socketId);
  if (!code) return { room: null, leftParticipant: null, newHost: null, isEmpty: false };

  const room = rooms.get(code.toUpperCase());
  if (!room) return { room: null, leftParticipant: null, newHost: null, isEmpty: false };

  const leftParticipant = room.participants.get(socketId) || null;
  room.participants.delete(socketId);
  socketToRoom.delete(socketId);

  if (room.participants.size === 0) {
    // Schedule cleanup after delay
    const normalizedCode = code.toUpperCase();
    room.cleanupTimer = setTimeout(() => {
      rooms.delete(normalizedCode);
      console.log(`[Party] Room ${normalizedCode} cleaned up (empty for ${CLEANUP_DELAY / 1000}s)`);
    }, CLEANUP_DELAY);
    return { room, leftParticipant, newHost: null, isEmpty: true };
  }

  // Auto-transfer host if leaving socket was host
  let newHost: Participant | null = null;
  if (room.hostSocketId === socketId) {
    const iterator = room.participants.values();
    const firstParticipant = iterator.next().value;
    if (firstParticipant) {
      firstParticipant.isHost = true;
      room.hostSocketId = firstParticipant.socketId;
      newHost = firstParticipant;
    }
  }

  return { room, leftParticipant, newHost, isEmpty: false };
}

export function getRoom(code: string): Room | null {
  return rooms.get(code.toUpperCase()) || null;
}

export function getRoomBySocket(socketId: string): Room | null {
  const code = socketToRoom.get(socketId);
  if (!code) return null;
  return rooms.get(code.toUpperCase()) || null;
}

export function updatePlaybackState(
  code: string,
  isPlaying: boolean,
  currentTime: number,
): void {
  const room = rooms.get(code.toUpperCase());
  if (room) {
    room.playbackState = { isPlaying, currentTime, lastUpdated: Date.now() };
  }
}

export function setParticipantBuffering(socketId: string, isBuffering: boolean): void {
  const code = socketToRoom.get(socketId);
  if (!code) return;
  const room = rooms.get(code.toUpperCase());
  if (!room) return;
  const p = room.participants.get(socketId);
  if (p) p.isBuffering = isBuffering;
}

export function kickParticipant(
  code: string,
  targetSocketId: string,
  requestingSocketId: string,
): boolean {
  const room = rooms.get(code.toUpperCase());
  if (!room) return false;
  if (room.hostSocketId !== requestingSocketId) return false;
  if (targetSocketId === requestingSocketId) return false;

  room.participants.delete(targetSocketId);
  socketToRoom.delete(targetSocketId);
  return true;
}

export function setRoomStreamPayload(code: string, payload: StreamPayload): boolean {
  const room = rooms.get(code.toUpperCase());
  if (!room) return false;
  room.streamPayload = payload;
  return true;
}

export function getRoomStreamPayload(code: string): StreamPayload | null {
  const room = rooms.get(code.toUpperCase());
  return room?.streamPayload || null;
}

export function changeRoomMedia(
  code: string,
  subjectId: string,
  season: number,
  episode: number,
): boolean {
  const room = rooms.get(code.toUpperCase());
  if (!room) return false;
  room.subjectId = subjectId;
  room.season = season;
  room.episode = episode;
  room.streamPayload = null; // reset stream payload for new media
  room.playbackState = { isPlaying: false, currentTime: 0, lastUpdated: Date.now() };
  for (const p of room.participants.values()) {
    p.isBuffering = false;
  }
  return true;
}

export function areAllParticipantsReady(code: string): boolean {
  const room = rooms.get(code.toUpperCase());
  if (!room) return true;
  for (const p of room.participants.values()) {
    if (p.isBuffering) return false;
  }
  return true;
}

export function serializeParticipants(
  room: Room,
): Array<{
  socketId: string;
  displayName: string;
  avatarColor: string;
  isHost: boolean;
  isBuffering: boolean;
}> {
  return Array.from(room.participants.values());
}
