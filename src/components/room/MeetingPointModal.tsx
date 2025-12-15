'use client';

import { useState, useEffect } from 'react';
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

const EMOJI_OPTIONS = ['📍', '🎯', '🏁', '⭐', '🍺', '☕', '🍕', '🎪', '🚻', '🚪'];

export default function MeetingPointModal({
  currentLocation,
  onClose,
  onSetMeetingPoint,
}: MeetingPointModalProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📍');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');

  useEffect(() => {
    if (currentLocation) {
      setCustomLat(currentLocation.latitude.toFixed(6));
      setCustomLng(currentLocation.longitude.toFixed(6));
    }
  }, [currentLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let latitude: number;
    let longitude: number;

    if (useCurrentLocation && currentLocation) {
      latitude = currentLocation.latitude;
      longitude = currentLocation.longitude;
    } else {
      latitude = parseFloat(customLat);
      longitude = parseFloat(customLng);
      if (isNaN(latitude) || isNaN(longitude)) {
        alert('Please enter valid coordinates');
        return;
      }
    }

    onSetMeetingPoint({
      name: name || 'Meeting Point',
      emoji,
      location: { latitude, longitude },
      type: 'meetup',
    });

    onClose();
  };

  const hasLocation = currentLocation || (!isNaN(parseFloat(customLat)) && !isNaN(parseFloat(customLng)));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="room-panel rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Set Meeting Point</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name input */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Name</label>
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

          {/* Location options */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Location</label>

            {currentLocation && (
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="radio"
                  checked={useCurrentLocation}
                  onChange={() => setUseCurrentLocation(true)}
                  className="accent-rmaps-primary"
                />
                <span className="text-sm">Use my current location</span>
              </label>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!useCurrentLocation}
                onChange={() => setUseCurrentLocation(false)}
                className="accent-rmaps-primary"
              />
              <span className="text-sm">Enter coordinates manually</span>
            </label>

            {!useCurrentLocation && (
              <div className="mt-3 grid grid-cols-2 gap-2">
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

            {!hasLocation && !useCurrentLocation && (
              <p className="text-xs text-yellow-400 mt-2">
                Share your location first, or enter coordinates manually
              </p>
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
              disabled={!hasLocation && useCurrentLocation}
            >
              Set Point
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
