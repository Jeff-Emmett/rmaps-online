'use client';

interface RoomHeaderProps {
  roomSlug: string;
  participantCount: number;
  isSharing: boolean;
  onToggleSharing: () => void;
  onShare: () => void;
  onToggleParticipants: () => void;
}

export default function RoomHeader({
  roomSlug,
  participantCount,
  isSharing,
  onToggleSharing,
  onShare,
  onToggleParticipants,
}: RoomHeaderProps) {
  return (
    <header className="bg-rmaps-dark/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between z-10">
      {/* Left: Room info */}
      <div className="flex items-center gap-3">
        <a href="/" className="text-xl font-bold">
          <span className="text-rmaps-primary">r</span>Maps
        </a>
        <div className="h-4 w-px bg-white/20" />
        <span className="text-white/60 text-sm">{roomSlug}</span>
      </div>

      {/* Center: Participant count */}
      <button
        onClick={onToggleParticipants}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 transition-colors"
      >
        <span className="text-lg">👥</span>
        <span className="text-sm font-medium">{participantCount}</span>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Share button */}
        <button
          onClick={onShare}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors"
          title="Share room"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        </button>

        {/* Location sharing toggle */}
        <button
          onClick={onToggleSharing}
          className={`p-2 rounded-lg transition-colors ${
            isSharing
              ? 'bg-rmaps-primary text-white'
              : 'bg-white/10 hover:bg-white/15'
          }`}
          title={isSharing ? 'Stop sharing location' : 'Share my location'}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
