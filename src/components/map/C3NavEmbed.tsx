'use client';

import { useState, useEffect, useRef } from 'react';
import type { Participant } from '@/types';

interface C3NavEmbedProps {
  /** Event identifier (e.g., '38c3', 'eh2025') */
  eventId?: string;
  /** Initial location to show */
  initialLocation?: string;
  /** Participants to show on the map overlay */
  participants?: Participant[];
  /** Current user ID */
  currentUserId?: string;
  /** Callback when user taps a location */
  onLocationSelect?: (location: { slug: string; name: string }) => void;
  /** Show the indoor/outdoor toggle */
  showToggle?: boolean;
  /** Callback when toggling to outdoor mode */
  onToggleOutdoor?: () => void;
}

// c3nav event URLs
const C3NAV_EVENTS: Record<string, string> = {
  '38c3': 'https://38c3.c3nav.de',
  '37c3': 'https://37c3.c3nav.de',
  'eh2025': 'https://eh2025.c3nav.de',
  'eh22': 'https://eh22.c3nav.de',
  'camp2023': 'https://camp2023.c3nav.de',
};

export default function C3NavEmbed({
  eventId = '38c3',
  initialLocation,
  participants = [],
  currentUserId,
  onLocationSelect,
  showToggle = true,
  onToggleOutdoor,
}: C3NavEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the c3nav base URL for the event
  const baseUrl = C3NAV_EVENTS[eventId] || C3NAV_EVENTS['38c3'];

  // Build the embed URL
  const embedUrl = new URL(baseUrl);
  embedUrl.searchParams.set('embed', '1');
  if (initialLocation) {
    embedUrl.searchParams.set('o', initialLocation);
  }

  // Handle iframe load
  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  // Handle iframe error
  const handleError = () => {
    setIsLoading(false);
    setError('Failed to load indoor map');
  };

  // Listen for messages from c3nav iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from c3nav
      if (!event.origin.includes('c3nav.de')) return;

      try {
        const data = event.data;
        if (data.type === 'c3nav:location' && onLocationSelect) {
          onLocationSelect({
            slug: data.slug,
            name: data.name,
          });
        }
      } catch (e) {
        // Ignore invalid messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLocationSelect]);

  return (
    <div className="relative w-full h-full">
      {/* c3nav iframe */}
      <iframe
        ref={iframeRef}
        src={embedUrl.toString()}
        className="w-full h-full border-0"
        allow="geolocation"
        onLoad={handleLoad}
        onError={handleError}
        title="c3nav indoor navigation"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-rmaps-dark flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-rmaps-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <div className="text-white/60 text-sm">Loading indoor map...</div>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-rmaps-dark flex items-center justify-center">
          <div className="text-center p-4">
            <div className="text-red-400 mb-2">{error}</div>
            <button
              onClick={() => {
                setIsLoading(true);
                setError(null);
                if (iframeRef.current) {
                  iframeRef.current.src = embedUrl.toString();
                }
              }}
              className="btn-ghost text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Friend markers overlay */}
      {participants.length > 0 && (
        <div className="absolute top-2 left-2 right-2 pointer-events-none">
          <div className="flex flex-wrap gap-1 pointer-events-auto">
            {participants
              .filter((p) => p.location?.indoor && p.id !== currentUserId)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1 bg-rmaps-dark/90 rounded-full px-2 py-1 text-xs"
                  style={{ borderColor: p.color, borderWidth: 2 }}
                >
                  <span>{p.emoji}</span>
                  <span className="text-white/80">{p.name}</span>
                  {p.location?.indoor?.spaceName && (
                    <span className="text-white/50">@ {p.location.indoor.spaceName}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Toggle to outdoor */}
      {showToggle && onToggleOutdoor && (
        <button
          onClick={onToggleOutdoor}
          className="absolute bottom-4 left-4 bg-rmaps-dark/90 text-white px-3 py-2 rounded-lg text-sm hover:bg-rmaps-dark transition-colors flex items-center gap-2"
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

      {/* c3nav attribution */}
      <div className="absolute bottom-4 right-4 text-xs text-white/40">
        <a
          href={baseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/60"
        >
          Powered by c3nav
        </a>
      </div>
    </div>
  );
}
