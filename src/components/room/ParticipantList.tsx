'use client';

import type { Participant } from '@/types';

interface ParticipantListProps {
  participants: Participant[];
  currentUserId?: string;
  onClose: () => void;
  onNavigateTo: (participant: Participant) => void;
}

export default function ParticipantList({
  participants,
  currentUserId,
  onClose,
  onNavigateTo,
}: ParticipantListProps) {
  const formatDistance = (participant: Participant, current: Participant | undefined) => {
    if (!participant.location || !current?.location) return null;

    // Haversine distance calculation
    const R = 6371e3; // Earth radius in meters
    const lat1 = (current.location.latitude * Math.PI) / 180;
    const lat2 = (participant.location.latitude * Math.PI) / 180;
    const deltaLat =
      ((participant.location.latitude - current.location.latitude) * Math.PI) / 180;
    const deltaLng =
      ((participant.location.longitude - current.location.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance < 50) return 'nearby';
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const currentParticipant = participants.find((p) => p.name === currentUserId);

  return (
    <div className="room-panel h-full md:h-auto md:max-h-[calc(100vh-4rem)] rounded-t-2xl md:rounded-2xl md:m-4 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="font-semibold">Friends ({participants.length})</h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto p-2">
        {participants.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            No one else is here yet
          </div>
        ) : (
          <div className="space-y-1">
            {participants.map((participant) => {
              const isMe = participant.name === currentUserId;
              const distance = !isMe
                ? formatDistance(participant, currentParticipant)
                : null;

              return (
                <div
                  key={participant.id}
                  className="participant-item cursor-pointer"
                  onClick={() => !isMe && onNavigateTo(participant)}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    style={{ backgroundColor: participant.color }}
                  >
                    {participant.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {participant.name}
                        {isMe && (
                          <span className="text-white/40 text-sm ml-1">(you)</span>
                        )}
                      </span>
                      <div className={`status-dot ${participant.status}`} />
                    </div>
                    {participant.location && (
                      <div className="text-xs text-white/40">
                        {distance ? `${distance} away` : 'Location shared'}
                      </div>
                    )}
                    {participant.status === 'ghost' && (
                      <div className="text-xs text-white/40">Location hidden</div>
                    )}
                  </div>

                  {/* Navigate button */}
                  {!isMe && participant.location && (
                    <button
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      title="Navigate to"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-white/10">
        <button className="btn-secondary w-full text-sm">
          Set Meeting Point
        </button>
      </div>
    </div>
  );
}
