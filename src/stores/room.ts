import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  Room,
  Participant,
  ParticipantLocation,
  ParticipantStatus,
  Waypoint,
  RoomSettings,
  PrecisionLevel,
} from '@/types';

// Color palette for participants
const COLORS = [
  '#10b981', // emerald
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
  '#06b6d4', // cyan
];

interface RoomState {
  room: Room | null;
  participants: Participant[];
  currentParticipantId: string | null;
  isConnected: boolean;
  error: string | null;

  // Actions
  joinRoom: (slug: string, name: string, emoji: string) => void;
  leaveRoom: () => void;
  updateParticipant: (updates: Partial<Participant>) => void;
  updateLocation: (location: ParticipantLocation) => void;
  setStatus: (status: ParticipantStatus) => void;
  addWaypoint: (waypoint: Omit<Waypoint, 'id' | 'createdAt' | 'createdBy'>) => void;
  removeWaypoint: (waypointId: string) => void;

  // Internal
  _syncFromDocument: (doc: unknown) => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  participants: [],
  currentParticipantId: null,
  isConnected: false,
  error: null,

  joinRoom: (slug: string, name: string, emoji: string) => {
    const participantId = nanoid();
    const colorIndex = Math.floor(Math.random() * COLORS.length);

    const participant: Participant = {
      id: participantId,
      name,
      emoji,
      color: COLORS[colorIndex],
      joinedAt: new Date(),
      lastSeen: new Date(),
      status: 'online',
      privacySettings: {
        sharingEnabled: true,
        defaultPrecision: 'exact' as PrecisionLevel,
        showIndoorFloor: true,
        ghostMode: false,
      },
    };

    // Create or join room
    const room: Room = {
      id: nanoid(),
      slug,
      name: slug,
      createdAt: new Date(),
      createdBy: participantId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      settings: {
        maxParticipants: 10,
        defaultPrecision: 'exact' as PrecisionLevel,
        allowGuestJoin: true,
        showC3NavIndoor: true,
      },
      participants: new Map([[participantId, participant]]),
      waypoints: [],
    };

    set({
      room,
      participants: [participant],
      currentParticipantId: participantId,
      isConnected: true,
      error: null,
    });

    // TODO: Connect to Automerge sync server
    console.log(`Joined room: ${slug} as ${name} (${emoji})`);
  },

  leaveRoom: () => {
    const { room, currentParticipantId } = get();
    if (room && currentParticipantId) {
      room.participants.delete(currentParticipantId);
    }

    set({
      room: null,
      participants: [],
      currentParticipantId: null,
      isConnected: false,
    });
  },

  updateParticipant: (updates: Partial<Participant>) => {
    const { room, currentParticipantId, participants } = get();
    if (!room || !currentParticipantId) return;

    const current = room.participants.get(currentParticipantId);
    if (!current) return;

    const updated = { ...current, ...updates, lastSeen: new Date() };
    room.participants.set(currentParticipantId, updated);

    set({
      participants: participants.map((p) =>
        p.id === currentParticipantId ? updated : p
      ),
    });
  },

  updateLocation: (location: ParticipantLocation) => {
    get().updateParticipant({ location });
  },

  setStatus: (status: ParticipantStatus) => {
    get().updateParticipant({ status });
  },

  addWaypoint: (waypoint) => {
    const { room, currentParticipantId } = get();
    if (!room || !currentParticipantId) return;

    const newWaypoint: Waypoint = {
      ...waypoint,
      id: nanoid(),
      createdAt: new Date(),
      createdBy: currentParticipantId,
    };

    room.waypoints.push(newWaypoint);
    set({ room: { ...room } });
  },

  removeWaypoint: (waypointId: string) => {
    const { room } = get();
    if (!room) return;

    room.waypoints = room.waypoints.filter((w) => w.id !== waypointId);
    set({ room: { ...room } });
  },

  _syncFromDocument: (doc: unknown) => {
    // TODO: Implement Automerge document sync
    console.log('Sync from document:', doc);
  },
}));
