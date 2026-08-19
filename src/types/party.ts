// Shared types for Watch Party feature

export interface PartyParticipant {
  socketId: string;
  displayName: string;
  avatarColor: string;
  isHost: boolean;
  isBuffering: boolean;
}

export interface PartyChatMessage {
  id: string;
  type: 'user' | 'system';
  senderName?: string;
  senderColor?: string;
  text: string;
  timestamp: number;
}

export interface PartyReaction {
  id: string;
  emoji: string;
  senderName: string;
  x: number; // random x position (10-90%)
}

export interface PartyPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: number;
}

export interface PartyRoomInfo {
  code: string;
  subjectId: string;
  season: number;
  episode: number;
  participants: PartyParticipant[];
  playbackState: PartyPlaybackState;
  hostOnlyControls: boolean;
}

export interface PartySubtitleItem {
  kind?: string;
  label: string;
  srcLang?: string;
  src: string;
  default?: boolean;
}

export interface PartyQualityItem {
  label: string;
  url: string;
  quality?: number;
}

export interface PartyStreamPayload {
  streamUrl: string;
  qualities: PartyQualityItem[];
  subtitles: PartySubtitleItem[];
  duration?: number;
}

export interface PartyGuestIdentity {
  displayName: string;
  avatarColor: string;
}

export const PARTY_EMOJIS = ['😂', '😮', '😢', '😡', '❤️', '🔥', '👏', '💀'] as const;

export const PARTY_AVATAR_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#D946EF',
] as const;
