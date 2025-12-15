'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Participant, MapViewport } from '@/types';
import FriendMarker from './FriendMarker';

interface MapViewProps {
  participants: Participant[];
  currentUserId?: string;
  initialViewport?: MapViewport;
  onParticipantClick?: (participant: Participant) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  /** Auto-center on current user's location when first available */
  autoCenterOnUser?: boolean;
}

// Default to Hamburg CCH area for CCC events
const DEFAULT_VIEWPORT: MapViewport = {
  center: [9.9898, 53.5550], // Hamburg CCH
  zoom: 15,
};

export default function MapView({
  participants,
  currentUserId,
  initialViewport = DEFAULT_VIEWPORT,
  onParticipantClick,
  onMapClick,
  autoCenterOnUser = true,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const hasCenteredOnUserRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: initialViewport.center,
      zoom: initialViewport.zoom,
      bearing: initialViewport.bearing ?? 0,
      pitch: initialViewport.pitch ?? 0,
    });

    // Add controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      } as maplibregl.GeolocateControlOptions),
      'top-right'
    );
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    // Handle click events
    map.current.on('click', (e) => {
      onMapClick?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [initialViewport, onMapClick]);

  // Update markers when participants change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    console.log('MapView: Updating markers for', participants.length, 'participants');
    participants.forEach((p) => {
      console.log('  -', p.name, p.id, 'location:', p.location ? `${p.location.latitude}, ${p.location.longitude}` : 'none');
    });

    const currentMarkers = markersRef.current;
    const participantIds = new Set(participants.map((p) => p.id));

    // Remove markers for participants who left
    currentMarkers.forEach((marker, id) => {
      if (!participantIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });

    // Add/update markers for current participants
    participants.forEach((participant) => {
      if (!participant.location) return;

      const { latitude, longitude } = participant.location;
      let marker = currentMarkers.get(participant.id);

      if (marker) {
        // Update existing marker position
        marker.setLngLat([longitude, latitude]);
      } else {
        // Create new marker
        const el = document.createElement('div');
        el.className = 'friend-marker';
        el.style.backgroundColor = participant.color;
        el.innerHTML = participant.emoji;

        if (participant.id === currentUserId) {
          el.classList.add('sharing');
        }

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onParticipantClick?.(participant);
        });

        marker = new maplibregl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .addTo(map.current!);

        currentMarkers.set(participant.id, marker);
      }

      // Add accuracy circle if available
      // TODO: Implement accuracy circles as a layer
    });

    // Auto-center on current user's first location
    if (autoCenterOnUser && !hasCenteredOnUserRef.current && currentUserId) {
      const currentUser = participants.find(p => p.id === currentUserId);
      if (currentUser?.location && map.current) {
        console.log('Auto-centering on user location:', currentUser.location.latitude, currentUser.location.longitude);
        map.current.flyTo({
          center: [currentUser.location.longitude, currentUser.location.latitude],
          zoom: 16,
        });
        hasCenteredOnUserRef.current = true;
      }
    }
  }, [participants, mapLoaded, currentUserId, onParticipantClick, autoCenterOnUser]);

  // Fit bounds to show all participants
  const fitToParticipants = () => {
    if (!map.current || participants.length === 0) return;

    const locatedParticipants = participants.filter((p) => p.location);
    if (locatedParticipants.length === 0) return;

    if (locatedParticipants.length === 1) {
      const loc = locatedParticipants[0].location!;
      map.current.flyTo({
        center: [loc.longitude, loc.latitude],
        zoom: 16,
      });
    } else {
      const bounds = new maplibregl.LngLatBounds();
      locatedParticipants.forEach((p) => {
        bounds.extend([p.location!.longitude, p.location!.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Fit all button */}
      {participants.some((p) => p.location) && (
        <button
          onClick={fitToParticipants}
          className="absolute bottom-4 right-4 bg-rmaps-dark/90 text-white px-3 py-2 rounded-lg text-sm hover:bg-rmaps-dark transition-colors"
          title="Show all friends"
        >
          Show All
        </button>
      )}

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-rmaps-dark flex items-center justify-center">
          <div className="text-white/60">Loading map...</div>
        </div>
      )}
    </div>
  );
}
