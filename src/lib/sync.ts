/**
 * Simple WebSocket-based room sync
 *
 * This is a lightweight sync layer that works without WASM dependencies.
 * Can be replaced with Automerge later when we have a proper sync server.
 *
 * Architecture:
 * - Each room is a shared state object
 * - Changes are broadcast via WebSocket to all participants
 * - State is stored in localStorage for reconnection
 * - Falls back to local-only mode if WebSocket unavailable
 */

import type { Participant, ParticipantLocation, Waypoint } from '@/types';

// Room state that gets synced
export interface RoomState {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  participants: Record<string, ParticipantState>;
  waypoints: WaypointState[];
}

export interface ParticipantState {
  id: string;
  name: string;
  emoji: string;
  color: string;
  joinedAt: string;
  lastSeen: string;
  status: string;
  location?: LocationState;
}

export interface LocationState {
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
}

export interface WaypointState {
  id: string;
  name: string;
  emoji?: string;
  latitude: number;
  longitude: number;
  indoor?: {
    level: number;
    x: number;
    y: number;
  };
  createdBy: string;
  createdAt: string;
  type: string;
}

// Message types for sync
export type SyncMessage =
  | { type: 'join'; participant: ParticipantState }
  | { type: 'leave'; participantId: string }
  | { type: 'location'; participantId: string; location: LocationState }
  | { type: 'status'; participantId: string; status: string }
  | { type: 'waypoint_add'; waypoint: WaypointState }
  | { type: 'waypoint_remove'; waypointId: string }
  | { type: 'full_state'; state: RoomState }
  | { type: 'request_state' };

type SyncCallback = (state: RoomState) => void;
type ConnectionCallback = (connected: boolean) => void;

export class RoomSync {
  private slug: string;
  private state: RoomState;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onStateChange: SyncCallback;
  private onConnectionChange: ConnectionCallback;
  private participantId: string;

  constructor(
    slug: string,
    participantId: string,
    onStateChange: SyncCallback,
    onConnectionChange: ConnectionCallback
  ) {
    this.slug = slug;
    this.participantId = participantId;
    this.onStateChange = onStateChange;
    this.onConnectionChange = onConnectionChange;

    // Initialize or load state
    this.state = this.loadState() || this.createInitialState();
  }

  private createInitialState(): RoomState {
    return {
      id: crypto.randomUUID(),
      slug: this.slug,
      name: this.slug,
      createdAt: new Date().toISOString(),
      participants: {},
      waypoints: [],
    };
  }

  private loadState(): RoomState | null {
    try {
      const stored = localStorage.getItem(`rmaps_room_${this.slug}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load room state:', e);
    }
    return null;
  }

  private saveState(): void {
    try {
      localStorage.setItem(`rmaps_room_${this.slug}`, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save room state:', e);
    }
  }

  private notifyStateChange(): void {
    this.saveState();
    this.onStateChange({ ...this.state });
  }

  // Connect to sync server (when available)
  connect(syncUrl?: string): void {
    if (!syncUrl) {
      // No sync server - local only mode
      console.log('Running in local-only mode (no sync server)');
      this.onConnectionChange(true);
      return;
    }

    try {
      this.ws = new WebSocket(`${syncUrl}/room/${this.slug}`);

      this.ws.onopen = () => {
        console.log('Connected to sync server');
        this.onConnectionChange(true);
        // Request current state from server
        this.send({ type: 'request_state' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: SyncMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.warn('Invalid sync message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('Disconnected from sync server');
        this.onConnectionChange(false);
        this.scheduleReconnect(syncUrl);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (e) {
      console.error('Failed to connect to sync server:', e);
      this.onConnectionChange(false);
    }
  }

  private scheduleReconnect(syncUrl: string): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect(syncUrl);
    }, 5000);
  }

  private send(message: SyncMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(message: SyncMessage): void {
    switch (message.type) {
      case 'full_state':
        // Merge with local state, keeping our participant
        const myParticipant = this.state.participants[this.participantId];
        this.state = message.state;
        if (myParticipant) {
          this.state.participants[this.participantId] = myParticipant;
        }
        break;

      case 'join':
        this.state.participants[message.participant.id] = message.participant;
        break;

      case 'leave':
        delete this.state.participants[message.participantId];
        break;

      case 'location':
        if (this.state.participants[message.participantId]) {
          this.state.participants[message.participantId].location = message.location;
          this.state.participants[message.participantId].lastSeen = new Date().toISOString();
        }
        break;

      case 'status':
        if (this.state.participants[message.participantId]) {
          this.state.participants[message.participantId].status = message.status;
          this.state.participants[message.participantId].lastSeen = new Date().toISOString();
        }
        break;

      case 'waypoint_add':
        this.state.waypoints.push(message.waypoint);
        break;

      case 'waypoint_remove':
        this.state.waypoints = this.state.waypoints.filter(
          (w) => w.id !== message.waypointId
        );
        break;
    }

    this.notifyStateChange();
  }

  // Public methods for updating state
  join(participant: ParticipantState): void {
    this.state.participants[participant.id] = participant;
    this.send({ type: 'join', participant });
    this.notifyStateChange();
  }

  leave(): void {
    delete this.state.participants[this.participantId];
    this.send({ type: 'leave', participantId: this.participantId });
    this.notifyStateChange();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
  }

  updateLocation(location: LocationState): void {
    console.log('RoomSync.updateLocation called:', location.latitude, location.longitude);
    if (this.state.participants[this.participantId]) {
      this.state.participants[this.participantId].location = location;
      this.state.participants[this.participantId].lastSeen = new Date().toISOString();
      this.send({ type: 'location', participantId: this.participantId, location });
      console.log('Location set for participant:', this.participantId, 'Total participants:', Object.keys(this.state.participants).length);
      this.notifyStateChange();
    } else {
      console.warn('Cannot update location - participant not found:', this.participantId);
    }
  }

  clearLocation(): void {
    console.log('RoomSync.clearLocation called');
    if (this.state.participants[this.participantId]) {
      delete this.state.participants[this.participantId].location;
      this.state.participants[this.participantId].lastSeen = new Date().toISOString();
      // Broadcast a null location to clear it for other participants
      this.send({ type: 'location', participantId: this.participantId, location: null as any });
      console.log('Location cleared for participant:', this.participantId);
      this.notifyStateChange();
    }
  }

  updateStatus(status: string): void {
    if (this.state.participants[this.participantId]) {
      this.state.participants[this.participantId].status = status;
      this.state.participants[this.participantId].lastSeen = new Date().toISOString();
      this.send({ type: 'status', participantId: this.participantId, status });
      this.notifyStateChange();
    }
  }

  updateIndoorPosition(indoor: { level: number; x: number; y: number }): void {
    console.log('RoomSync.updateIndoorPosition called:', indoor.level, indoor.x, indoor.y);
    if (this.state.participants[this.participantId]) {
      // Update or create location with indoor data
      const existingLocation = this.state.participants[this.participantId].location;
      const location: LocationState = existingLocation || {
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        timestamp: new Date().toISOString(),
        source: 'manual',
      };

      location.indoor = {
        level: indoor.level,
        x: indoor.x,
        y: indoor.y,
      };
      location.timestamp = new Date().toISOString();
      location.source = 'manual';

      this.state.participants[this.participantId].location = location;
      this.state.participants[this.participantId].lastSeen = new Date().toISOString();
      this.send({ type: 'location', participantId: this.participantId, location });
      console.log('Indoor position set for participant:', this.participantId);
      this.notifyStateChange();
    } else {
      console.warn('Cannot update indoor position - participant not found:', this.participantId);
    }
  }

  addWaypoint(waypoint: WaypointState): void {
    this.state.waypoints.push(waypoint);
    this.send({ type: 'waypoint_add', waypoint });
    this.notifyStateChange();
  }

  removeWaypoint(waypointId: string): void {
    this.state.waypoints = this.state.waypoints.filter((w) => w.id !== waypointId);
    this.send({ type: 'waypoint_remove', waypointId });
    this.notifyStateChange();
  }

  getState(): RoomState {
    return { ...this.state };
  }
}

// Convert sync state to typed Participant
export function stateToParticipant(state: ParticipantState): Participant {
  return {
    id: state.id,
    name: state.name,
    emoji: state.emoji,
    color: state.color,
    joinedAt: new Date(state.joinedAt),
    lastSeen: new Date(state.lastSeen),
    status: state.status as Participant['status'],
    location: state.location
      ? {
          latitude: state.location.latitude,
          longitude: state.location.longitude,
          accuracy: state.location.accuracy,
          altitude: state.location.altitude,
          heading: state.location.heading,
          speed: state.location.speed,
          timestamp: new Date(state.location.timestamp),
          source: state.location.source as ParticipantLocation['source'],
          indoor: state.location.indoor,
        }
      : undefined,
    privacySettings: {
      sharingEnabled: true,
      defaultPrecision: 'exact',
      showIndoorFloor: true,
      ghostMode: false,
    },
  };
}

// Convert sync state to typed Waypoint
export function stateToWaypoint(state: WaypointState): Waypoint {
  return {
    id: state.id,
    name: state.name,
    emoji: state.emoji,
    location: {
      latitude: state.latitude,
      longitude: state.longitude,
      indoor: state.indoor,
    },
    createdBy: state.createdBy,
    createdAt: new Date(state.createdAt),
    type: state.type as Waypoint['type'],
  };
}
