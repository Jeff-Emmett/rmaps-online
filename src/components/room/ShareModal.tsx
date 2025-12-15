'use client';

import { useState } from 'react';

interface ShareModalProps {
  roomSlug: string;
  onClose: () => void;
}

export default function ShareModal({ roomSlug, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  // In production, this would be <slug>.rmaps.online
  // For now, use path-based routing
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/room/${roomSlug}`
      : `https://rmaps.online/room/${roomSlug}`;

  const subdomainUrl = `https://${roomSlug}.rmaps.online`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my rMaps room: ${roomSlug}`,
          text: 'Find me on rMaps!',
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled:', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="room-panel rounded-2xl p-6 max-w-md w-full relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded hover:bg-white/10 transition-colors"
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

        <h2 className="text-xl font-bold mb-4">Share this Map</h2>

        <p className="text-white/60 text-sm mb-4">
          Invite friends to join your map. Anyone with this link can see your
          shared location.
        </p>

        {/* URL display */}
        <div className="bg-white/5 rounded-lg p-3 mb-4">
          <div className="text-xs text-white/40 mb-1">Room Link</div>
          <div className="font-mono text-sm break-all">{shareUrl}</div>
        </div>

        {/* Subdomain preview */}
        <div className="bg-rmaps-primary/10 border border-rmaps-primary/30 rounded-lg p-3 mb-6">
          <div className="text-xs text-rmaps-primary mb-1">Coming soon</div>
          <div className="font-mono text-sm text-rmaps-primary">{subdomainUrl}</div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleCopy} className="btn-ghost flex-1">
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
          <button onClick={handleShare} className="btn-primary flex-1">
            Share
          </button>
        </div>

        {/* QR Code placeholder */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <div className="text-xs text-white/40 mb-2">Or scan QR code</div>
          <div className="w-32 h-32 mx-auto bg-white rounded-lg flex items-center justify-center">
            <span className="text-rmaps-dark text-xs">QR Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
