'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ParticipantLocation, WaypointType } from '@/types';

interface MeetingPointModalProps {
  currentLocation?: ParticipantLocation | null;
  onClose: () => void;
  onSetMeetingPoint: (waypoint: {
    name: string;
    emoji: string;
    location: { latitude: number; longitude: number };
    type: WaypointType;
  }) => void;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const EMOJI_OPTIONS = ['📍', '🎯', '🏁', '⭐', '🍺', '☕', '🍕', '🎪', '🚻', '🚪'];

export default function MeetingPointModal({
  currentLocation,
  onClose,
  onSetMeetingPoint,
}: MeetingPointModalProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📍');
  const [locationMode, setLocationMode] = useState<'current' | 'search' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');

  // Use current location if available
  useEffect(() => {
    if (currentLocation) {
      setSelectedLocation({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        name: 'My current location',
      });
    }
  }, [currentLocation]);

  // Search for addresses using Nominatim
  const searchAddress = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
        {
          headers: {
            'User-Agent': 'rMaps.online/1.0',
          },
        }
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Get current location on demand
  const getCurrentLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelectedLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: 'My current location',
        });
        setIsGettingLocation(false);
        setLocationMode('current');
      },
      (error) => {
        setLocationError(
          error.code === 1
            ? 'Location permission denied'
            : error.code === 2
            ? 'Location unavailable'
            : 'Location request timed out'
        );
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  const selectSearchResult = (result: SearchResult) => {
    setSelectedLocation({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name: result.display_name.split(',')[0],
    });
    setSearchResults([]);
    setSearchQuery(result.display_name.split(',')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let latitude: number;
    let longitude: number;

    if (locationMode === 'manual') {
      latitude = parseFloat(customLat);
      longitude = parseFloat(customLng);
      if (isNaN(latitude) || isNaN(longitude)) {
        setLocationError('Please enter valid coordinates');
        return;
      }
    } else if (selectedLocation) {
      latitude = selectedLocation.lat;
      longitude = selectedLocation.lng;
    } else {
      setLocationError('Please select a location');
      return;
    }

    onSetMeetingPoint({
      name: name || selectedLocation?.name || 'Meeting Point',
      emoji,
      location: { latitude, longitude },
      type: 'meetup',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="room-panel rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Set Meeting Point</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name input */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main entrance, Food court..."
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-rmaps-primary"
            />
          </div>

          {/* Emoji selector */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Icon</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                    emoji === e
                      ? 'bg-rmaps-primary'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Location selection */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Location</label>

            {/* Quick actions */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className={`flex-1 py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${
                  locationMode === 'current' && selectedLocation
                    ? 'bg-rmaps-primary text-white'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {isGettingLocation ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Getting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Use My Location
                  </>
                )}
              </button>
            </div>

            {/* Search input */}
            <div className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setLocationMode('search');
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchAddress())}
                placeholder="Search for an address..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 pr-10 text-white placeholder:text-white/40 focus:outline-none focus:border-rmaps-primary"
              />
              <button
                type="button"
                onClick={searchAddress}
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10"
              >
                {isSearching ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="bg-white/5 rounded-lg border border-white/10 mb-3 max-h-40 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => selectSearchResult(result)}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm border-b border-white/5 last:border-0"
                  >
                    <div className="truncate">{result.display_name}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Manual coordinates toggle */}
            <button
              type="button"
              onClick={() => setLocationMode(locationMode === 'manual' ? 'search' : 'manual')}
              className="text-xs text-white/40 hover:text-white/60 mb-2"
            >
              {locationMode === 'manual' ? 'Hide manual entry' : 'Enter coordinates manually'}
            </button>

            {/* Manual coordinates input */}
            {locationMode === 'manual' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-white/40 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    placeholder="53.5550"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-rmaps-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    placeholder="9.9898"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-rmaps-primary"
                  />
                </div>
              </div>
            )}

            {/* Selected location display */}
            {selectedLocation && locationMode !== 'manual' && (
              <div className="bg-rmaps-primary/20 rounded-lg px-3 py-2 text-sm mt-2">
                <div className="font-medium">{selectedLocation.name || 'Selected location'}</div>
                <div className="text-white/60 text-xs">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </div>
              </div>
            )}

            {/* Error display */}
            {locationError && (
              <p className="text-xs text-red-400 mt-2">{locationError}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={!selectedLocation && locationMode !== 'manual'}
            >
              Set Point
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
