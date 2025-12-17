'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Participant, MapViewport, Waypoint } from '@/types';
import { isInC3NavArea } from '@/lib/c3nav';

// Dynamic imports to avoid SSR issues
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <MapLoading />,
});

const IndoorMapView = dynamic(() => import('./IndoorMapView'), {
  ssr: false,
  loading: () => <MapLoading />,
});

function MapLoading() {
  return (
    <div className="w-full h-full bg-rmaps-dark flex items-center justify-center">
      <div className="text-white/60">Loading map...</div>
    </div>
  );
}

type MapMode = 'outdoor' | 'indoor' | 'auto';

interface DualMapViewProps {
  participants: Participant[];
  waypoints?: Waypoint[];
  currentUserId?: string;
  currentLocation?: { latitude: number; longitude: number } | null;
  eventId?: string;
  initialMode?: MapMode;
  onParticipantClick?: (participant: Participant) => void;
  onWaypointClick?: (waypoint: Waypoint) => void;
  onIndoorPositionSet?: (position: { level: number; x: number; y: number }) => void;
}

// CCC venue bounds (Hamburg Congress Center)
const CCC_BOUNDS = {
  north: 53.558,
  south: 53.552,
  east: 9.995,
  west: 9.985,
};

export default function DualMapView({
  participants,
  waypoints = [],
  currentUserId,
  currentLocation,
  eventId = '38c3',
  initialMode = 'auto',
  onParticipantClick,
  onWaypointClick,
  onIndoorPositionSet,
}: DualMapViewProps) {
  const [mode, setMode] = useState<MapMode>(initialMode);
  const [activeView, setActiveView] = useState<'outdoor' | 'indoor'>('outdoor');

  // Auto-detect indoor/outdoor based on location
  useEffect(() => {
    if (mode !== 'auto' || !currentLocation) return;

    const isIndoor = isInC3NavArea(currentLocation.latitude, currentLocation.longitude);
    setActiveView(isIndoor ? 'indoor' : 'outdoor');
  }, [mode, currentLocation]);

  // Manual toggle
  const toggleView = useCallback(() => {
    setMode('outdoor'); // Switch to manual mode
    setActiveView((prev) => (prev === 'outdoor' ? 'indoor' : 'outdoor'));
  }, []);

  // Force outdoor
  const goOutdoor = useCallback(() => {
    setMode('outdoor');
    setActiveView('outdoor');
  }, []);

  // Force indoor
  const goIndoor = useCallback(() => {
    setMode('indoor');
    setActiveView('indoor');
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Map view */}
      {activeView === 'outdoor' ? (
        <MapView
          participants={participants}
          waypoints={waypoints}
          currentUserId={currentUserId}
          onParticipantClick={onParticipantClick}
          onWaypointClick={onWaypointClick}
        />
      ) : (
        <IndoorMapView
          eventId={eventId}
          participants={participants}
          currentUserId={currentUserId}
          onParticipantClick={onParticipantClick}
          onSwitchToOutdoor={goOutdoor}
          onPositionSet={onIndoorPositionSet}
        />
      )}

      {/* Indoor Map button - switch to indoor view */}
      {activeView === 'outdoor' && (
        <button
          onClick={goIndoor}
          className="absolute bottom-4 left-4 bg-rmaps-dark/90 text-white px-3 py-2 rounded-lg text-sm hover:bg-rmaps-dark transition-colors flex items-center gap-2 z-30"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          Indoor Map
        </button>
      )}

      {/* Auto-mode indicator */}
      {mode === 'auto' && (
        <div className="absolute top-4 left-4 bg-rmaps-primary/20 text-rmaps-primary text-xs px-2 py-1 rounded-full">
          Auto-detecting location
        </div>
      )}

      {/* Venue proximity indicator */}
      {currentLocation && isInC3NavArea(currentLocation.latitude, currentLocation.longitude) && activeView === 'outdoor' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-rmaps-secondary/90 text-white text-sm px-3 py-1.5 rounded-full flex items-center gap-2 z-30">
          <span>You&apos;re at the venue!</span>
          <button onClick={goIndoor} className="underline">
            Switch to indoor
          </button>
        </div>
      )}
    </div>
  );
}
