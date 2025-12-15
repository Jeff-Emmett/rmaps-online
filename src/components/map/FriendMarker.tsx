'use client';

import type { Participant } from '@/types';

interface FriendMarkerProps {
  participant: Participant;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

export default function FriendMarker({
  participant,
  isCurrentUser = false,
  onClick,
}: FriendMarkerProps) {
  const { emoji, color, name, status, location } = participant;

  // Calculate how stale the location is
  const getLocationAge = () => {
    if (!location) return null;
    const ageMs = Date.now() - location.timestamp.getTime();
    const ageSec = Math.floor(ageMs / 1000);
    if (ageSec < 60) return `${ageSec}s ago`;
    const ageMin = Math.floor(ageSec / 60);
    if (ageMin < 60) return `${ageMin}m ago`;
    return 'stale';
  };

  const locationAge = getLocationAge();
  const isStale = locationAge === 'stale';

  return (
    <div
      className={`friend-marker ${isCurrentUser ? 'sharing' : ''} ${isStale ? 'opacity-50' : ''}`}
      style={{ backgroundColor: color }}
      onClick={onClick}
      title={`${name} - ${status}${locationAge ? ` (${locationAge})` : ''}`}
    >
      <span className="text-xl">{emoji}</span>

      {/* Status indicator */}
      <div
        className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-rmaps-dark status-dot ${status}`}
      />

      {/* Heading indicator */}
      {location?.heading !== undefined && (
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: `8px solid ${color}`,
            transform: `translateX(-50%) rotate(${location.heading}deg)`,
          }}
        />
      )}
    </div>
  );
}
