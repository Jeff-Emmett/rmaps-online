'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useRoom } from '@/hooks/useRoom';
import { useLocationSharing } from '@/hooks/useLocationSharing';
import ParticipantList from '@/components/room/ParticipantList';
import RoomHeader from '@/components/room/RoomHeader';
import ShareModal from '@/components/room/ShareModal';
import type { Participant, ParticipantLocation } from '@/types';

// Dynamic import for map to avoid SSR issues with MapLibre
const DualMapView = dynamic(() => import('@/components/map/DualMapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-rmaps-dark flex items-center justify-center">
      <div className="text-white/60">Loading map...</div>
    </div>
  ),
});

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [showShare, setShowShare] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ name: string; emoji: string } | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('rmaps_user');
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    } else {
      // Redirect to home if no user info
      router.push('/');
    }
  }, [router]);

  // Room hook (only initialize when we have user info)
  const {
    isConnected,
    isLoading,
    error,
    participants,
    waypoints,
    currentParticipantId,
    roomName,
    updateLocation,
    clearLocation,
    setStatus,
    addWaypoint,
    removeWaypoint,
    leave,
  } = useRoom({
    slug,
    userName: currentUser?.name || '',
    userEmoji: currentUser?.emoji || '👤',
  });

  // Use refs to avoid stale closures in callbacks
  const isConnectedRef = useRef(isConnected);
  const updateLocationRef = useRef(updateLocation);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    updateLocationRef.current = updateLocation;
  }, [updateLocation]);

  // Stable callback that always uses latest refs
  const handleLocationUpdate = useCallback((location: ParticipantLocation) => {
    console.log('Location update received:', location.latitude, location.longitude, 'connected:', isConnectedRef.current);
    if (isConnectedRef.current) {
      updateLocationRef.current(location);
    }
  }, []);

  // Location sharing hook
  const {
    isSharing,
    currentLocation,
    startSharing,
    stopSharing,
  } = useLocationSharing({
    onLocationUpdate: handleLocationUpdate,
    updateInterval: 5000,
    highAccuracy: true,
  });

  // Location sharing is opt-in - user must click to start
  // Handler for toggling location sharing
  const handleToggleSharing = useCallback(() => {
    if (isSharing) {
      console.log('Stopping location sharing and clearing location');
      stopSharing();
      clearLocation();
    } else {
      console.log('Starting location sharing');
      startSharing();
    }
  }, [isSharing, startSharing, stopSharing, clearLocation]);

  // Track if we've centered on user's location yet
  const hasCenteredRef = useRef(false);

  // Log when we get location updates
  useEffect(() => {
    if (currentLocation && !hasCenteredRef.current) {
      console.log('First location acquired:', currentLocation.latitude, currentLocation.longitude);
      hasCenteredRef.current = true;
    }
  }, [currentLocation]);

  // Update status when app goes to background
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setStatus('away');
      } else {
        setStatus('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [setStatus]);

  // Handle leaving room
  useEffect(() => {
    const handleBeforeUnload = () => {
      leave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      leave();
    };
  }, [leave]);

  // Navigate to participant
  const handleNavigateTo = (participant: Participant) => {
    setSelectedParticipant(participant);
    // TODO: Implement navigation route display
    console.log('Navigate to:', participant.name);
  };

  // Loading state
  if (!currentUser || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rmaps-dark">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-rmaps-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-white/60">Joining room...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-rmaps-dark">
        <div className="room-panel rounded-2xl p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
          <p className="text-white/60 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="btn-ghost">
              Retry
            </button>
            <a href="/" className="btn-primary">
              Go Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-rmaps-dark">
      {/* Header */}
      <RoomHeader
        roomSlug={slug}
        participantCount={participants.length}
        isSharing={isSharing}
        onToggleSharing={handleToggleSharing}
        onShare={() => setShowShare(true)}
        onToggleParticipants={() => setShowParticipants(!showParticipants)}
      />

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Map */}
        <DualMapView
          participants={participants}
          currentUserId={currentParticipantId || undefined}
          currentLocation={currentLocation}
          eventId="38c3"
          onParticipantClick={(p) => {
            setSelectedParticipant(p);
            setShowParticipants(true);
          }}
        />

        {/* Participant Panel */}
        {showParticipants && (
          <div className="absolute bottom-0 left-0 right-0 md:top-0 md:right-auto md:w-80 md:bottom-auto md:h-full z-20">
            <ParticipantList
              participants={participants}
              currentUserId={currentUser.name}
              onClose={() => setShowParticipants(false)}
              onNavigateTo={handleNavigateTo}
            />
          </div>
        )}

        {/* Connection status indicator */}
        {!isConnected && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black text-sm px-3 py-1.5 rounded-full z-30">
            Reconnecting...
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
