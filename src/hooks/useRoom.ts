'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import {
  RoomSync,
  stateToParticipant,
  stateToWaypoint,
  type ParticipantState,
  type LocationState,
  type WaypointState,
  type RoomState,
} from '@/lib/sync';
import type { Participant, ParticipantLocation, Waypoint } from '@/types';

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

interface UseRoomOptions {
  slug: string;
  userName: string;
  userEmoji: string;
}

interface UseRoomReturn {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  participants: Participant[];
  waypoints: Waypoint[];
  currentParticipantId: string | null;
  roomName: string;
  updateLocation: (location: ParticipantLocation) => void;
  updateIndoorPosition: (position: { level: number; x: number; y: number }) => void;
  clearLocation: () => void;
  setStatus: (status: Participant['status']) => void;
  addWaypoint: (waypoint: Omit<Waypoint, 'id' | 'createdAt' | 'createdBy'>) => void;
  removeWaypoint: (waypointId: string) => void;
  leave: () => void;
}

export function useRoom({ slug, userName, userEmoji }: UseRoomOptions): UseRoomReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [roomName, setRoomName] = useState(slug);

  const syncRef = useRef<RoomSync | null>(null);
  const participantIdRef = useRef<string>(nanoid());

  // Handle state updates from sync
  const handleStateChange = useCallback((state: RoomState) => {
    setParticipants(Object.values(state.participants).map(stateToParticipant));
    setWaypoints(state.waypoints.map(stateToWaypoint));
    setRoomName(state.name || slug);
  }, [slug]);

  // Handle connection changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  // Initialize room connection
  useEffect(() => {
    if (!userName) {
      // No user yet - not loading, just waiting
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const participantId = participantIdRef.current;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Create sync instance
    const sync = new RoomSync(
      slug,
      participantId,
      handleStateChange,
      handleConnectionChange
    );
    syncRef.current = sync;

    // Create participant state
    const participant: ParticipantState = {
      id: participantId,
      name: userName,
      emoji: userEmoji,
      color,
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      status: 'online',
    };

    // Join room
    sync.join(participant);

    // Connect to sync server (if available)
    // For now, runs in local-only mode
    const syncUrl = process.env.NEXT_PUBLIC_SYNC_URL;
    sync.connect(syncUrl);

    setIsLoading(false);

    return () => {
      sync.leave();
      syncRef.current = null;
    };
  }, [slug, userName, userEmoji, handleStateChange, handleConnectionChange]);

  // Update location
  const updateLocation = useCallback((location: ParticipantLocation) => {
    if (!syncRef.current) return;

    const locationState: LocationState = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      altitude: location.altitude,
      heading: location.heading,
      speed: location.speed,
      timestamp: location.timestamp.toISOString(),
      source: location.source,
      indoor: location.indoor,
    };

    syncRef.current.updateLocation(locationState);
  }, []);

  // Clear location (when user stops sharing)
  const clearLocation = useCallback(() => {
    if (!syncRef.current) return;
    syncRef.current.clearLocation();
  }, []);

  // Update indoor position (from c3nav map tap)
  const updateIndoorPosition = useCallback((position: { level: number; x: number; y: number }) => {
    if (!syncRef.current) return;
    syncRef.current.updateIndoorPosition(position);
  }, []);

  // Set status
  const setStatus = useCallback((status: Participant['status']) => {
    if (!syncRef.current) return;
    syncRef.current.updateStatus(status);
  }, []);

  // Add waypoint
  const addWaypoint = useCallback(
    (waypoint: Omit<Waypoint, 'id' | 'createdAt' | 'createdBy'>) => {
      if (!syncRef.current) return;

      const waypointState: WaypointState = {
        id: nanoid(),
        name: waypoint.name,
        emoji: waypoint.emoji,
        latitude: waypoint.location.latitude,
        longitude: waypoint.location.longitude,
        indoor: waypoint.location.indoor,
        createdBy: participantIdRef.current,
        createdAt: new Date().toISOString(),
        type: waypoint.type,
      };

      syncRef.current.addWaypoint(waypointState);
    },
    []
  );

  // Remove waypoint
  const removeWaypoint = useCallback((waypointId: string) => {
    if (!syncRef.current) return;
    syncRef.current.removeWaypoint(waypointId);
  }, []);

  // Leave room
  const leave = useCallback(() => {
    if (!syncRef.current) return;
    syncRef.current.leave();
    syncRef.current = null;
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    isLoading,
    error,
    participants,
    waypoints,
    currentParticipantId: participantIdRef.current,
    roomName,
    updateLocation,
    updateIndoorPosition,
    clearLocation,
    setStatus,
    addWaypoint,
    removeWaypoint,
    leave,
  };
}
