'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DocHandle } from '@automerge/automerge-repo';
import { nanoid } from 'nanoid';
import {
  findOrCreateRoom,
  addParticipant,
  removeParticipant,
  updateParticipantLocation,
  updateParticipantStatus,
  addWaypoint as addWaypointToDoc,
  removeWaypoint as removeWaypointFromDoc,
  type RoomDocument,
} from '@/lib/automerge';
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

  const handleRef = useRef<DocHandle<RoomDocument> | null>(null);
  const participantIdRef = useRef<string | null>(null);

  // Convert document participants to typed Participant array
  const docToParticipants = useCallback((doc: RoomDocument): Participant[] => {
    return Object.values(doc.participants).map((p) => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      joinedAt: new Date(p.joinedAt),
      lastSeen: new Date(p.lastSeen),
      status: p.status as Participant['status'],
      location: p.location
        ? {
            ...p.location,
            timestamp: new Date(p.location.timestamp),
            source: p.location.source as ParticipantLocation['source'],
          }
        : undefined,
      privacySettings: {
        ...p.privacySettings,
        defaultPrecision: p.privacySettings.defaultPrecision as Participant['privacySettings']['defaultPrecision'],
      },
    }));
  }, []);

  // Convert document waypoints to typed Waypoint array
  const docToWaypoints = useCallback((doc: RoomDocument): Waypoint[] => {
    return doc.waypoints.map((w) => ({
      id: w.id,
      name: w.name,
      emoji: w.emoji,
      location: {
        latitude: w.location.latitude,
        longitude: w.location.longitude,
        indoor: w.location.indoor,
      },
      createdBy: w.createdBy,
      createdAt: new Date(w.createdAt),
      type: w.type as Waypoint['type'],
    }));
  }, []);

  // Initialize room connection
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const participantId = nanoid();
        participantIdRef.current = participantId;

        const color = COLORS[Math.floor(Math.random() * COLORS.length)];

        const handle = await findOrCreateRoom(
          slug,
          participantId,
          userName,
          userEmoji,
          color
        );

        if (!mounted) return;

        handleRef.current = handle;

        // Add this participant if not already in the room
        const doc = handle.docSync();
        if (doc && !doc.participants[participantId]) {
          addParticipant(handle, {
            id: participantId,
            name: userName,
            emoji: userEmoji,
            color,
            joinedAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            status: 'online',
            privacySettings: {
              sharingEnabled: true,
              defaultPrecision: 'exact',
              showIndoorFloor: true,
              ghostMode: false,
            },
          });
        }

        // Subscribe to changes
        handle.on('change', ({ doc }) => {
          if (!mounted || !doc) return;
          setParticipants(docToParticipants(doc));
          setWaypoints(docToWaypoints(doc));
          setRoomName(doc.name || slug);
        });

        // Initial state
        const initialDoc = handle.docSync();
        if (initialDoc) {
          setParticipants(docToParticipants(initialDoc));
          setWaypoints(docToWaypoints(initialDoc));
          setRoomName(initialDoc.name || slug);
        }

        setIsConnected(true);
        setIsLoading(false);
      } catch (e) {
        if (!mounted) return;
        console.error('Failed to connect to room:', e);
        setError('Failed to connect to room');
        setIsLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      // Leave room on unmount
      if (handleRef.current && participantIdRef.current) {
        updateParticipantStatus(handleRef.current, participantIdRef.current, 'offline');
      }
    };
  }, [slug, userName, userEmoji, docToParticipants, docToWaypoints]);

  // Update location
  const updateLocation = useCallback((location: ParticipantLocation) => {
    if (!handleRef.current || !participantIdRef.current) return;

    updateParticipantLocation(handleRef.current, participantIdRef.current, {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      altitude: location.altitude,
      heading: location.heading,
      speed: location.speed,
      timestamp: location.timestamp.toISOString(),
      source: location.source,
      indoor: location.indoor,
    });
  }, []);

  // Set status
  const setStatus = useCallback((status: Participant['status']) => {
    if (!handleRef.current || !participantIdRef.current) return;
    updateParticipantStatus(handleRef.current, participantIdRef.current, status);
  }, []);

  // Add waypoint
  const addWaypoint = useCallback(
    (waypoint: Omit<Waypoint, 'id' | 'createdAt' | 'createdBy'>) => {
      if (!handleRef.current || !participantIdRef.current) return;

      addWaypointToDoc(handleRef.current, {
        id: nanoid(),
        name: waypoint.name,
        emoji: waypoint.emoji,
        location: {
          latitude: waypoint.location.latitude,
          longitude: waypoint.location.longitude,
          indoor: waypoint.location.indoor,
        },
        createdBy: participantIdRef.current,
        createdAt: new Date().toISOString(),
        type: waypoint.type,
      });
    },
    []
  );

  // Remove waypoint
  const removeWaypoint = useCallback((waypointId: string) => {
    if (!handleRef.current) return;
    removeWaypointFromDoc(handleRef.current, waypointId);
  }, []);

  // Leave room
  const leave = useCallback(() => {
    if (!handleRef.current || !participantIdRef.current) return;
    removeParticipant(handleRef.current, participantIdRef.current);
    handleRef.current = null;
    participantIdRef.current = null;
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
    setStatus,
    addWaypoint,
    removeWaypoint,
    leave,
  };
}
