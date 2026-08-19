'use client';

import { create } from 'zustand';
import type { PartyParticipant, PartyChatMessage, PartyReaction, PartyStreamPayload } from '@/types/party';
import { PARTY_AVATAR_COLORS } from '@/types/party';

function getRandomColor(): string {
  return PARTY_AVATAR_COLORS[Math.floor(Math.random() * PARTY_AVATAR_COLORS.length)];
}

function loadGuestIdentity(): { name: string; color: string } {
  if (typeof window === 'undefined') return { name: '', color: getRandomColor() };
  try {
    const saved = localStorage.getItem('nobarfilm_party_guest');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        name: parsed.displayName || '',
        color: parsed.avatarColor || getRandomColor(),
      };
    }
  } catch { /* ignore */ }
  return { name: '', color: getRandomColor() };
}

interface WatchPartyState {
  // Connection
  isConnected: boolean;
  mySocketId: string | null;

  // Room
  roomCode: string | null;
  isHost: boolean;
  participants: PartyParticipant[];
  streamPayload: PartyStreamPayload | null;
  hostOnlyControls: boolean;

  // Chat
  messages: PartyChatMessage[];

  // Reactions
  reactions: PartyReaction[];

  // UI
  isPanelOpen: boolean;
  activeTab: 'chat' | 'participants';
  unreadCount: number;

  // Guest identity (persisted to localStorage)
  guestName: string;
  guestColor: string;

  // Actions
  setConnected: (connected: boolean) => void;
  setMySocketId: (id: string | null) => void;
  setRoomCode: (code: string | null) => void;
  setIsHost: (isHost: boolean) => void;
  setParticipants: (participants: PartyParticipant[]) => void;
  setStreamPayload: (payload: PartyStreamPayload | null) => void;
  setHostOnlyControls: (v: boolean) => void;
  addMessage: (msg: PartyChatMessage) => void;
  addSystemMessage: (text: string) => void;
  addReaction: (reaction: PartyReaction) => void;
  removeReaction: (id: string) => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setActiveTab: (tab: 'chat' | 'participants') => void;
  incrementUnreadCount: () => void;
  clearUnreadCount: () => void;
  setGuestName: (name: string) => void;
  reset: () => void;
}

export const useWatchPartyStore = create<WatchPartyState>((set, get) => {
  const guest = loadGuestIdentity();

  return {
    isConnected: false,
    mySocketId: null,
    roomCode: null,
    isHost: false,
    participants: [],
    messages: [],
    reactions: [],
    isPanelOpen: false,
    activeTab: 'chat',
    unreadCount: 0,
    streamPayload: null,
    hostOnlyControls: false,
    guestName: guest.name,
    guestColor: guest.color,

    setConnected: (connected) => set({ isConnected: connected }),
    setMySocketId: (id) => set({ mySocketId: id }),
    setRoomCode: (code) => set({ roomCode: code }),
    setIsHost: (isHost) => set({ isHost }),
    setParticipants: (participants) => set({ participants }),
    setStreamPayload: (payload) => set({ streamPayload: payload }),
    setHostOnlyControls: (v) => set({ hostOnlyControls: v }),

    addMessage: (msg) =>
      set((state) => ({
        messages: [...state.messages.slice(-100), msg], // keep last 100
      })),

    addSystemMessage: (text) =>
      set((state) => ({
        messages: [
          ...state.messages.slice(-100),
          {
            id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'system' as const,
            text,
            timestamp: Date.now(),
          },
        ],
      })),

    addReaction: (reaction) =>
      set((state) => ({
        reactions: [...state.reactions.slice(-20), reaction], // max 20 on screen
      })),

    removeReaction: (id) =>
      set((state) => ({
        reactions: state.reactions.filter((r) => r.id !== id),
      })),

    togglePanel: () =>
      set((state) => ({
        isPanelOpen: !state.isPanelOpen,
        unreadCount: !state.isPanelOpen ? 0 : state.unreadCount,
      })),

    setPanelOpen: (open) =>
      set((state) => ({
        isPanelOpen: open,
        unreadCount: open ? 0 : state.unreadCount,
      })),

    setActiveTab: (tab) => set({ activeTab: tab }),

    incrementUnreadCount: () =>
      set((state) => ({ unreadCount: state.unreadCount + 1 })),

    clearUnreadCount: () => set({ unreadCount: 0 }),

    setGuestName: (name) => {
      set({ guestName: name });
      const color = get().guestColor;
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'nobarfilm_party_guest',
          JSON.stringify({ displayName: name, avatarColor: color }),
        );
      }
    },

    reset: () =>
      set({
        roomCode: null,
        isHost: false,
        participants: [],
        messages: [],
        reactions: [],
        streamPayload: null,
        hostOnlyControls: false,
        isPanelOpen: false,
        unreadCount: 0,
      }),
  };
});
