'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useRoomStore } from '@/stores/room';
import { useLocationSharing } from '@/hooks/useLocationSharing';
import ParticipantList from '@/components/room/ParticipantList';
import RoomHeader from '@/components/room/RoomHeader';
import ShareModal from '@/components/room/ShareModal';
import type { Participant } from '@/types';

// Dynamic import for map to avoid SSR issues with MapLibre
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-rmaps-dark flex items-center justify-center">
      <div className="text-white/60">Loading map...</div>
    </div>
  ),
});

export default function RoomPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [showShare, setShowShare] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ name: string; emoji: string } | null>(null);

  const {
    room,
    participants,
    isConnected,
    error,
    joinRoom,
    leaveRoom,
    updateParticipant,
  } = useRoomStore();

  const { isSharing, startSharing, stopSharing, currentLocation } = useLocationSharing({
    onLocationUpdate: (location) => {
      if (currentUser) {
        updateParticipant({ location });
      }
    },
  });

  // Load user from localStorage and join room
  useEffect(() => {
    const stored = localStorage.getItem('rmaps_user');
    if (stored) {
      const user = JSON.parse(stored);
      setCurrentUser(user);
      joinRoom(slug, user.name, user.emoji);
    } else {
      // Redirect to home if no user info
      window.location.href = '/';
    }

    return () => {
      leaveRoom();
    };
  }, [slug, joinRoom, leaveRoom]);

  // Auto-start location sharing when joining
  useEffect(() => {
    if (isConnected && currentUser && !isSharing) {
      startSharing();
    }
  }, [isConnected, currentUser, isSharing, startSharing]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="room-panel rounded-2xl p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
          <p className="text-white/60 mb-4">{error}</p>
          <a href="/" className="btn-primary inline-block">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <RoomHeader
        roomSlug={slug}
        participantCount={participants.length}
        isSharing={isSharing}
        onToggleSharing={() => (isSharing ? stopSharing() : startSharing())}
        onShare={() => setShowShare(true)}
        onToggleParticipants={() => setShowParticipants(!showParticipants)}
      />

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Map */}
        <MapView
          participants={participants}
          currentUserId={room?.participants ? Array.from(room.participants.keys())[0] : undefined}
          onParticipantClick={(p) => console.log('Clicked participant:', p)}
        />

        {/* Participant Panel (mobile: bottom sheet, desktop: sidebar) */}
        {showParticipants && (
          <div className="absolute bottom-0 left-0 right-0 md:top-0 md:right-auto md:w-80 md:bottom-auto md:h-full">
            <ParticipantList
              participants={participants}
              currentUserId={currentUser?.name}
              onClose={() => setShowParticipants(false)}
              onNavigateTo={(p) => console.log('Navigate to:', p)}
            />
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShare && (
        <ShareModal roomSlug={slug} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
