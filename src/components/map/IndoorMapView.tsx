'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Participant } from '@/types';

interface Level {
  id: number;
  slug: string;
  title: string;
  level_index: string;
}

// Easter egg: The mythical Level -1
const LEVEL_MINUS_ONE: Level = {
  id: -1,
  slug: 'level--1',
  title: '🕳️ The Underground of the Underground',
  level_index: '-1',
};

interface IndoorMapViewProps {
  eventId: string;
  participants: Participant[];
  currentUserId?: string;
  onPositionSet?: (position: { level: number; x: number; y: number }) => void;
  onParticipantClick?: (participant: Participant) => void;
  onSwitchToOutdoor?: () => void;
}

export default function IndoorMapView({
  eventId,
  participants,
  currentUserId,
  onPositionSet,
  onParticipantClick,
  onSwitchToOutdoor,
}: IndoorMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  const [mapLoaded, setMapLoaded] = useState(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [bounds, setBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Easter egg state
  const [level0Clicks, setLevel0Clicks] = useState(0);
  const [showLevelMinus1, setShowLevelMinus1] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch levels and bounds from c3nav API
  useEffect(() => {
    async function fetchMapData() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch bounds
        const boundsRes = await fetch(`/api/c3nav/${eventId}?endpoint=map/bounds`);
        if (!boundsRes.ok) throw new Error('Failed to fetch bounds');
        const boundsData = await boundsRes.json();
        setBounds(boundsData.bounds);

        // Fetch locations to get levels
        const locationsRes = await fetch(`/api/c3nav/${eventId}?endpoint=map/locations`);
        if (!locationsRes.ok) throw new Error('Failed to fetch locations');
        const locationsData = await locationsRes.json();

        // Filter levels and sort by level_index
        const levelLocations = locationsData
          .filter((loc: any) => loc.locationtype === 'level')
          .sort((a: any, b: any) => parseInt(a.level_index) - parseInt(b.level_index));

        setLevels(levelLocations);

        // Set default level (Level 0 or first available)
        const defaultLevel = levelLocations.find((l: Level) => l.level_index === '0') || levelLocations[0];
        setCurrentLevel(defaultLevel);
      } catch (err) {
        console.error('Failed to fetch c3nav data:', err);
        setError('Failed to load indoor map data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMapData();
  }, [eventId]);

  // Initialize/update map when level changes
  useEffect(() => {
    if (!mapContainer.current || !bounds || !currentLevel) return;

    // Calculate center from bounds
    const centerX = (bounds[0][0] + bounds[1][0]) / 2;
    const centerY = (bounds[0][1] + bounds[1][1]) / 2;

    // Destroy existing map if level changed
    if (map.current) {
      map.current.remove();
      map.current = null;
      markersRef.current.clear();
    }

    // Create map with c3nav tile source
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          c3nav: {
            type: 'raster',
            tiles: [
              `/api/c3nav/tiles/${eventId}/${currentLevel.id}/{z}/{x}/{y}`,
            ],
            tileSize: 257,
            minzoom: 0,
            maxzoom: 5,
            bounds: [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]],
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#1a1a2e',
            },
          },
          {
            id: 'c3nav-tiles',
            type: 'raster',
            source: 'c3nav',
          },
        ],
      },
      center: [centerX, centerY],
      zoom: 2,
      minZoom: 0,
      maxZoom: 5,
      // c3nav uses a simple coordinate system, not geographic
      renderWorldCopies: false,
    });

    // Add controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Handle click to set position
    map.current.on('click', (e) => {
      if (onPositionSet && currentLevel) {
        onPositionSet({
          level: currentLevel.id,
          x: e.lngLat.lng,
          y: e.lngLat.lat,
        });
      }
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [eventId, bounds, currentLevel, onPositionSet]);

  // Update participant markers
  useEffect(() => {
    if (!map.current || !mapLoaded || !currentLevel) return;

    const currentMarkers = markersRef.current;

    // Filter participants on current level with indoor location
    const indoorParticipants = participants.filter(
      (p) => p.location?.indoor && p.location.indoor.level === currentLevel.id
    );

    const participantIds = new Set(indoorParticipants.map((p) => p.id));

    // Remove markers for participants not on this level
    currentMarkers.forEach((marker, id) => {
      if (!participantIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });

    // Add/update markers for participants on this level
    indoorParticipants.forEach((participant) => {
      if (!participant.location?.indoor) return;

      const { x, y } = participant.location.indoor;
      let marker = currentMarkers.get(participant.id);

      if (marker) {
        marker.setLngLat([x, y]);
      } else {
        // Create marker element
        const el = document.createElement('div');
        el.className = 'indoor-marker';
        el.style.cssText = `
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: ${participant.color};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          cursor: pointer;
        `;
        el.innerHTML = participant.emoji;

        if (participant.id === currentUserId) {
          el.style.border = '3px solid #10b981';
          el.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.3), 0 2px 8px rgba(0,0,0,0.3)';
        }

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onParticipantClick?.(participant);
        });

        marker = new maplibregl.Marker({ element: el })
          .setLngLat([x, y])
          .addTo(map.current!);

        currentMarkers.set(participant.id, marker);
      }
    });
  }, [participants, mapLoaded, currentLevel, currentUserId, onParticipantClick]);

  // Handle level change with easter egg
  const handleLevelChange = useCallback((level: Level) => {
    // Easter egg: Triple-click Level 0 to reveal Level -1
    if (level.level_index === '0') {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      const newClicks = level0Clicks + 1;
      setLevel0Clicks(newClicks);

      if (newClicks >= 3 && !showLevelMinus1) {
        setShowLevelMinus1(true);
        setLevel0Clicks(0);
        // Brief "glitch" effect could go here
        console.log('🕳️ You found Level -1! The rabbit hole goes deeper...');
        return; // Don't change level, just reveal the easter egg
      }

      // Reset click counter after 500ms
      clickTimeoutRef.current = setTimeout(() => {
        setLevel0Clicks(0);
      }, 500);
    } else {
      setLevel0Clicks(0);
    }

    // Handle Level -1 easter egg
    if (level.id === -1) {
      setCurrentLevel(level);
      setMapLoaded(false);
      return;
    }

    setCurrentLevel(level);
    setMapLoaded(false);
  }, [level0Clicks, showLevelMinus1]);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-rmaps-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-rmaps-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <div className="text-white/60 text-sm">Loading indoor map...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-rmaps-dark flex items-center justify-center">
        <div className="text-center p-4">
          <div className="text-red-400 mb-2">{error}</div>
          <button onClick={onSwitchToOutdoor} className="btn-ghost text-sm">
            Switch to Outdoor Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Level selector */}
      {levels.length > 1 && (
        <div className="absolute top-4 left-4 bg-rmaps-dark/95 rounded-lg shadow-lg overflow-hidden z-10">
          <div className="text-xs text-white/60 px-3 py-1 border-b border-white/10">
            Floor
          </div>
          <div className="flex flex-col">
            {/* Easter egg: Level -1 appears at the bottom when unlocked */}
            {showLevelMinus1 && (
              <button
                onClick={() => handleLevelChange(LEVEL_MINUS_ONE)}
                className={`px-4 py-2 text-sm text-left transition-colors ${
                  currentLevel?.id === -1
                    ? 'bg-purple-600 text-white animate-pulse'
                    : 'text-purple-400 hover:bg-purple-900/30'
                }`}
              >
                {LEVEL_MINUS_ONE.title}
              </button>
            )}
            {levels.map((level) => (
              <button
                key={level.id}
                onClick={() => handleLevelChange(level)}
                className={`px-4 py-2 text-sm text-left transition-colors ${
                  currentLevel?.id === level.id
                    ? 'bg-rmaps-primary text-white'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {level.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current level indicator */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm px-3 py-1.5 rounded-full z-10 ${
        currentLevel?.id === -1 ? 'bg-purple-600/90 animate-pulse' : 'bg-rmaps-dark/90'
      }`}>
        {currentLevel?.title || 'Indoor Map'}
      </div>

      {/* Level -1 Easter Egg Overlay */}
      {currentLevel?.id === -1 && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-20 backdrop-blur-sm">
          <div className="text-center p-8 max-w-md">
            <div className="text-6xl mb-4 animate-bounce">🕳️</div>
            <h2 className="text-2xl font-bold text-purple-400 mb-4 font-mono">
              THE UNDERGROUND OF THE UNDERGROUND
            </h2>
            <p className="text-green-400 font-mono text-sm mb-6 leading-relaxed">
              &gt; ACCESS GRANTED<br/>
              &gt; Welcome, fellow hacker.<br/>
              &gt; You found the secret level.<br/>
              &gt; Some say it&apos;s where the real<br/>
              &gt; Congress happens... 🐇
            </p>
            <div className="text-xs text-white/40 font-mono">
              // TODO: Add actual underground map<br/>
              // when we find the blueprints
            </div>
            <button
              onClick={() => handleLevelChange(levels[0])}
              className="mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white text-sm transition-colors"
            >
              Return to Surface
            </button>
          </div>
        </div>
      )}

      {/* Switch to outdoor button */}
      {onSwitchToOutdoor && (
        <button
          onClick={onSwitchToOutdoor}
          className="absolute bottom-4 left-4 bg-rmaps-dark/90 text-white px-3 py-2 rounded-lg text-sm hover:bg-rmaps-dark transition-colors flex items-center gap-2 z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Outdoor Map
        </button>
      )}

      {/* Tap to set position hint */}
      {onPositionSet && (
        <div className="absolute bottom-4 right-4 bg-rmaps-secondary/90 text-white text-xs px-3 py-1.5 rounded-full z-10">
          Tap map to set your position
        </div>
      )}

      {/* Loading overlay for level change */}
      {!mapLoaded && !isLoading && (
        <div className="absolute inset-0 bg-rmaps-dark/80 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-rmaps-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
