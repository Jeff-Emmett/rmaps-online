'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';

// Emoji options for avatars
const EMOJI_OPTIONS = ['🐙', '🦊', '🐻', '🐱', '🦝', '🐸', '🦉', '🐧', '🦋', '🐝'];

// Generate a URL-safe room slug
function generateSlug(): string {
  return nanoid(8).toLowerCase();
}

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [joinSlug, setJoinSlug] = useState('');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)]);
  const [roomName, setRoomName] = useState('');

  const handleCreateRoom = async () => {
    if (!name.trim()) return;

    const slug = roomName.trim()
      ? roomName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)
      : generateSlug();

    // Store user info in localStorage for the session
    localStorage.setItem('rmaps_user', JSON.stringify({ name, emoji }));

    // Navigate to the room (will create it if it doesn't exist)
    router.push(`/room/${slug}`);
  };

  const handleJoinRoom = () => {
    if (!name.trim() || !joinSlug.trim()) return;

    localStorage.setItem('rmaps_user', JSON.stringify({ name, emoji }));

    // Clean the slug
    const cleanSlug = joinSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    router.push(`/room/${cleanSlug}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo/Title */}
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-rmaps-primary">r</span>Maps
          </h1>
          <p className="text-white/60">Find your friends at events</p>
        </div>

        {/* Main Card */}
        <div className="room-panel rounded-2xl p-6 space-y-6">
          {/* User Setup */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Your Profile</h2>

            <div>
              <label className="block text-sm text-white/60 mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input w-full"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">Your Avatar</label>
              <div className="flex gap-2 flex-wrap">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      emoji === e
                        ? 'bg-rmaps-primary scale-110'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Create Room */}
          {!isCreating ? (
            <div className="space-y-4">
              <button
                onClick={() => setIsCreating(true)}
                className="btn-primary w-full text-lg py-3"
                disabled={!name.trim()}
              >
                Create New Map
              </button>

              <div className="text-center text-white/40 text-sm">or</div>

              {/* Join Room */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={joinSlug}
                  onChange={(e) => setJoinSlug(e.target.value)}
                  placeholder="Enter room name or code"
                  className="input w-full"
                />
                <button
                  onClick={handleJoinRoom}
                  className="btn-secondary w-full"
                  disabled={!name.trim() || !joinSlug.trim()}
                >
                  Join Existing Map
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Room Name (optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g., 38c3-crew"
                    className="input flex-1"
                    maxLength={20}
                  />
                  <span className="text-white/40">.rmaps.online</span>
                </div>
                <p className="text-xs text-white/40 mt-1">
                  Leave blank for a random code
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsCreating(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRoom}
                  className="btn-primary flex-1"
                  disabled={!name.trim()}
                >
                  Create Map
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-white/40 text-sm space-y-2">
          <p>Privacy-first location sharing</p>
          <p>
            Built for{' '}
            <a
              href="https://events.ccc.de/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-rmaps-primary hover:underline"
            >
              CCC events
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
