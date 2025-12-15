/**
 * Core types for rMaps.online
 * Collaborative real-time friend-finding navigation
 */

// ============================================================================
// Room Types
// ============================================================================

export interface Room {
  id: string;
  slug: string;                    // subdomain: <slug>.rmaps.online
  name: string;
  createdAt: Date;
  createdBy: string;               // participant ID
  expiresAt: Date;                 // auto-cleanup after inactivity
  settings: RoomSettings;
  participants: Map<string, Participant>;
  waypoints: Waypoint[];
}

export interface RoomSettings {
  maxParticipants: number;         // default: 10
  password?: string;               // optional room password
  defaultPrecision: PrecisionLevel;
  allowGuestJoin: boolean;
  showC3NavIndoor: boolean;        // enable c3nav integration
  eventId?: string;                // e.g., '38c3', 'eh2025'
}

// ============================================================================
// Participant Types
// ============================================================================

export interface Participant {
  id: string;
  name: string;
  emoji: string;                   // avatar emoji
  color: string;                   // unique marker color
  joinedAt: Date;
  lastSeen: Date;
  status: ParticipantStatus;
  location?: ParticipantLocation;
  privacySettings: PrivacySettings;
}

export type ParticipantStatus =
  | 'online'      // actively sharing
  | 'away'        // app backgrounded
  | 'ghost'       // hidden location
  | 'offline';    // disconnected

export interface ParticipantLocation {
  latitude: number;
  longitude: number;
  accuracy: number;                // meters
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;                // degrees from north
  speed?: number;                  // m/s
  timestamp: Date;
  source: LocationSource;
  indoor?: IndoorLocation;         // c3nav indoor data
}

export type LocationSource =
  | 'gps'         // device GPS
  | 'network'     // WiFi/cell triangulation
  | 'manual'      // user-set location
  | 'c3nav';      // c3nav positioning

export interface IndoorLocation {
  level: number;                   // floor/level number
  x: number;                       // c3nav local X coordinate
  y: number;                       // c3nav local Y coordinate
  spaceName?: string;              // e.g., "Saal 1", "Assembly XY"
}

// ============================================================================
// Privacy Types
// ============================================================================

export type PrecisionLevel =
  | 'exact'        // <5m - full precision
  | 'building'     // ~50m - same building
  | 'area'         // ~500m - nearby area
  | 'approximate'; // ~2km - general vicinity

export interface PrivacySettings {
  sharingEnabled: boolean;
  defaultPrecision: PrecisionLevel;
  showIndoorFloor: boolean;
  ghostMode: boolean;              // hide completely
}

// ============================================================================
// Navigation Types
// ============================================================================

export interface Waypoint {
  id: string;
  name: string;
  emoji?: string;
  location: {
    latitude: number;
    longitude: number;
    indoor?: IndoorLocation;
  };
  createdBy: string;               // participant ID
  createdAt: Date;
  type: WaypointType;
  metadata?: Record<string, unknown>;
}

export type WaypointType =
  | 'meetup'       // meeting point
  | 'event'        // scheduled event
  | 'poi'          // point of interest
  | 'custom';      // user-created

export interface Route {
  id: string;
  from: RoutePoint;
  to: RoutePoint;
  segments: RouteSegment[];
  totalDistance: number;           // meters
  estimatedTime: number;           // seconds
  createdAt: Date;
}

export interface RoutePoint {
  type: 'participant' | 'waypoint' | 'coordinates';
  id?: string;                     // participant or waypoint ID
  coordinates?: {
    latitude: number;
    longitude: number;
    indoor?: IndoorLocation;
  };
}

export interface RouteSegment {
  type: 'outdoor' | 'indoor' | 'transition';
  coordinates: Array<[number, number]>;  // [lng, lat] for GeoJSON
  distance: number;
  duration: number;
  instructions?: string;
  level?: number;                  // for indoor segments
}

// ============================================================================
// c3nav Integration Types
// ============================================================================

export interface C3NavLocation {
  id: number;
  slug: string;
  title: string;
  subtitle?: string;
  can_search: boolean;
  can_describe: boolean;
  geometry?: GeoJSON.Geometry;
  level?: number;
}

export interface C3NavRouteRequest {
  origin: C3NavPoint;
  destination: C3NavPoint;
  options?: C3NavRouteOptions;
}

export interface C3NavPoint {
  coordinates?: [number, number, number];  // [x, y, level]
  slug?: string;                           // location slug
}

export interface C3NavRouteOptions {
  mode?: 'fastest' | 'shortest';
  avoid_stairs?: boolean;
  avoid_escalators?: boolean;
  wheelchair?: boolean;
}

export interface C3NavRouteResponse {
  status: 'ok' | 'no_route';
  request?: C3NavRouteRequest;
  origin?: C3NavLocation;
  destination?: C3NavLocation;
  distance?: number;
  duration?: number;
  path?: Array<{
    coordinates: [number, number, number];
    level: number;
  }>;
}

// ============================================================================
// Event Types (for real-time updates)
// ============================================================================

export type RoomEvent =
  | { type: 'participant_joined'; participant: Participant }
  | { type: 'participant_left'; participantId: string }
  | { type: 'participant_updated'; participant: Partial<Participant> & { id: string } }
  | { type: 'location_updated'; participantId: string; location: ParticipantLocation }
  | { type: 'waypoint_added'; waypoint: Waypoint }
  | { type: 'waypoint_removed'; waypointId: string }
  | { type: 'room_settings_changed'; settings: Partial<RoomSettings> };

// ============================================================================
// Map Types
// ============================================================================

export interface MapViewport {
  center: [number, number];        // [lng, lat]
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// CCC venue bounds (Hamburg Congress Center)
export const CCC_VENUE_BOUNDS: MapBounds = {
  north: 53.5580,
  south: 53.5520,
  east: 9.9950,
  west: 9.9850,
};

// ============================================================================
// Utility Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
