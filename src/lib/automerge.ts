/**
 * Automerge sync setup for real-time room collaboration
 *
 * Each room is an Automerge document containing:
 * - Room metadata (name, settings)
 * - Participants map (id -> participant data)
 * - Waypoints array
 *
 * Documents sync via WebSocket to a relay server or P2P
 */

import { Repo, DocHandle } from '@automerge/automerge-repo';
import { BrowserWebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket';
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';
import type { AutomergeUrl } from '@automerge/automerge-repo';

// Room document schema (Automerge-compatible)
export interface RoomDocument {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  createdBy: string;
  settings: {
    maxParticipants: number;
    defaultPrecision: string;
    allowGuestJoin: boolean;
    showC3NavIndoor: boolean;
    eventId?: string;
  };
  participants: {
    [id: string]: {
      id: string;
      name: string;
      emoji: string;
      color: string;
      joinedAt: string;
      lastSeen: string;
      status: string;
      location?: {
        latitude: number;
        longitude: number;
        accuracy: number;
        altitude?: number;
        heading?: number;
        speed?: number;
        timestamp: string;
        source: string;
        indoor?: {
          level: number;
          x: number;
          y: number;
          spaceName?: string;
        };
      };
      privacySettings: {
        sharingEnabled: boolean;
        defaultPrecision: string;
        showIndoorFloor: boolean;
        ghostMode: boolean;
      };
    };
  };
  waypoints: Array<{
    id: string;
    name: string;
    emoji?: string;
    location: {
      latitude: number;
      longitude: number;
      indoor?: {
        level: number;
        x: number;
        y: number;
      };
    };
    createdBy: string;
    createdAt: string;
    type: string;
  }>;
}

// Singleton repo instance
let repoInstance: Repo | null = null;

// Default sync server URL (can be overridden)
const DEFAULT_SYNC_URL =
  process.env.NEXT_PUBLIC_AUTOMERGE_SYNC_URL || 'wss://sync.automerge.org';

/**
 * Get or create the Automerge repo instance
 */
export function getRepo(): Repo {
  if (repoInstance) {
    return repoInstance;
  }

  // Create network adapter (WebSocket)
  const network = new BrowserWebSocketClientAdapter(DEFAULT_SYNC_URL);

  // Create storage adapter (IndexedDB for persistence)
  const storage = new IndexedDBStorageAdapter('rmaps-automerge');

  // Create repo
  repoInstance = new Repo({
    network: [network],
    storage,
  });

  return repoInstance;
}

/**
 * Create a new room document
 */
export function createRoom(
  slug: string,
  creatorId: string,
  creatorName: string,
  creatorEmoji: string,
  creatorColor: string
): DocHandle<RoomDocument> {
  const repo = getRepo();

  const initialDoc: RoomDocument = {
    id: crypto.randomUUID(),
    slug,
    name: slug,
    createdAt: new Date().toISOString(),
    createdBy: creatorId,
    settings: {
      maxParticipants: 10,
      defaultPrecision: 'exact',
      allowGuestJoin: true,
      showC3NavIndoor: true,
    },
    participants: {
      [creatorId]: {
        id: creatorId,
        name: creatorName,
        emoji: creatorEmoji,
        color: creatorColor,
        joinedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        status: 'online',
        privacySettings: {
          sharingEnabled: true,
          defaultPrecision: 'exact',
          showIndoorFloor: true,
          ghostMode: false,
        },
      },
    },
    waypoints: [],
  };

  const handle = repo.create<RoomDocument>();
  handle.change((doc) => {
    Object.assign(doc, initialDoc);
  });

  return handle;
}

/**
 * Join an existing room by URL
 */
export function joinRoom(url: AutomergeUrl): DocHandle<RoomDocument> {
  const repo = getRepo();
  return repo.find<RoomDocument>(url);
}

/**
 * Get a room document handle by slug
 * Uses a deterministic URL based on slug for discoverability
 */
export async function findOrCreateRoom(
  slug: string,
  creatorId: string,
  creatorName: string,
  creatorEmoji: string,
  creatorColor: string
): Promise<DocHandle<RoomDocument>> {
  const repo = getRepo();

  // For now, create a new document each time
  // In production, you'd use a discovery service or deterministic URLs
  // based on the slug to find existing rooms

  // Store room URL mapping in localStorage for reconnection
  const storedUrl = localStorage.getItem(`rmaps_room_${slug}`);

  if (storedUrl) {
    try {
      const handle = repo.find<RoomDocument>(storedUrl as AutomergeUrl);
      // Wait for initial sync
      await handle.whenReady();
      const doc = handle.docSync();
      if (doc) {
        // Room exists, join it
        return handle;
      }
    } catch (e) {
      console.warn('Failed to load stored room, creating new:', e);
    }
  }

  // Create new room
  const handle = createRoom(slug, creatorId, creatorName, creatorEmoji, creatorColor);

  // Store URL for future reconnection
  localStorage.setItem(`rmaps_room_${slug}`, handle.url);

  return handle;
}

/**
 * Update participant location in a room document
 */
export function updateParticipantLocation(
  handle: DocHandle<RoomDocument>,
  participantId: string,
  location: RoomDocument['participants'][string]['location']
): void {
  handle.change((doc) => {
    if (doc.participants[participantId]) {
      doc.participants[participantId].location = location;
      doc.participants[participantId].lastSeen = new Date().toISOString();
    }
  });
}

/**
 * Update participant status
 */
export function updateParticipantStatus(
  handle: DocHandle<RoomDocument>,
  participantId: string,
  status: string
): void {
  handle.change((doc) => {
    if (doc.participants[participantId]) {
      doc.participants[participantId].status = status;
      doc.participants[participantId].lastSeen = new Date().toISOString();
    }
  });
}

/**
 * Add a participant to the room
 */
export function addParticipant(
  handle: DocHandle<RoomDocument>,
  participant: RoomDocument['participants'][string]
): void {
  handle.change((doc) => {
    doc.participants[participant.id] = participant;
  });
}

/**
 * Remove a participant from the room
 */
export function removeParticipant(
  handle: DocHandle<RoomDocument>,
  participantId: string
): void {
  handle.change((doc) => {
    delete doc.participants[participantId];
  });
}

/**
 * Add a waypoint to the room
 */
export function addWaypoint(
  handle: DocHandle<RoomDocument>,
  waypoint: RoomDocument['waypoints'][number]
): void {
  handle.change((doc) => {
    doc.waypoints.push(waypoint);
  });
}

/**
 * Remove a waypoint from the room
 */
export function removeWaypoint(
  handle: DocHandle<RoomDocument>,
  waypointId: string
): void {
  handle.change((doc) => {
    const index = doc.waypoints.findIndex((w) => w.id === waypointId);
    if (index !== -1) {
      doc.waypoints.splice(index, 1);
    }
  });
}
