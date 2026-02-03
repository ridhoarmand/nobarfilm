export interface WatchPartyRoom {
  id: string;
  room_code: string;
  host_id: string;

  // Video info
  subject_id: string;
  subject_type: number;
  title: string;
  cover_url: string | null;
  current_episode: number;

  // Playback state
  current_position: number;
  is_playing: boolean;
  last_action_by: string | null;
  last_action_at: string;

  // Settings
  max_participants: number;
  allow_guest: boolean;
  is_active: boolean;

  // Timestamps
  created_at: string;
  expires_at: string;
}

export interface WatchPartyParticipant {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_host: boolean;
  is_connected: boolean;
  last_seen_at: string;
  joined_at: string;
}

export interface CreatePartyPayload {
  subject_id: string;
  subject_type: number;
  title: string;
  cover_url?: string;
  current_episode?: number;
}

export interface JoinPartyPayload {
  room_code: string;
}

export interface PartyPlaybackState {
  currentPosition: number;
  isPlaying: boolean;
  lastActionBy: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  message: string;
  timestamp: string;
}

export interface ChatState {
  isExpanded: boolean;
  unreadCount: number;
  lastReadTimestamp: number;
}

// Socket.IO Events
export interface ServerToClientEvents {
  'room-state': (data: { participants: WatchPartyParticipant[]; playback: PartyPlaybackState; chatHistory?: ChatMessage[] }) => void;
  'user-joined': (participant: WatchPartyParticipant) => void;
  'user-left': (userId: string) => void;
  play: (data: { time: number; userId: string }) => void;
  pause: (data: { time: number; userId: string }) => void;
  seek: (data: { time: number; userId: string }) => void;
  'chat-message': (message: ChatMessage) => void;
  'host-transferred': (data: { newHostId: string }) => void;
}

export interface ClientToServerEvents {
  'join-room': (data: { roomCode: string; user: { id: string; name: string; avatar?: string } }) => void;
  'leave-room': (data: { roomCode: string }) => void;
  play: (data: { roomCode: string; time: number }) => void;
  pause: (data: { roomCode: string; time: number }) => void;
  seek: (data: { roomCode: string; time: number }) => void;
  'chat-message': (data: { roomCode: string; message: string }) => void;
  'transfer-host': (data: { roomCode: string; newHostId: string }) => void;
}
