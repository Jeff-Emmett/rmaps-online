# rMaps.online

Collaborative real-time friend-finding navigation for events.

## Features

- **Real-time GPS Sharing**: See your friends' locations on the map
- **Privacy-First**: Control who sees your location and at what precision
- **c3nav Integration**: Indoor navigation for CCC events (38C3, Easterhegg, Camp)
- **Ephemeral Rooms**: Create a room, share the link, meet up
- **No Account Required**: Just enter your name and go

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  rMaps.online                    │
├─────────────────────────────────────────────────┤
│  Frontend: Next.js + React + MapLibre GL        │
│  State: Zustand + Automerge (CRDT)              │
│  Maps: OpenStreetMap (outdoor) + c3nav (indoor) │
│  Sync: WebSocket / Automerge Repo               │
└─────────────────────────────────────────────────┘
```

## Room URLs

- **Path-based**: `rmaps.online/room/my-crew`
- **Subdomain** (planned): `my-crew.rmaps.online`

## c3nav Integration

rMaps integrates with [c3nav](https://github.com/c3nav/c3nav) for indoor navigation at CCC events:

- Automatic detection when entering venue area
- Indoor positioning via WiFi/BLE
- Floor-aware navigation
- Route planning to friends, events, and POIs

## Development

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
```

## Deployment

### Docker

```bash
docker compose up -d --build
```

### Traefik Labels

The docker-compose.yml includes Traefik labels for:
- Main domain routing (`rmaps.online`)
- Wildcard subdomain routing (`*.rmaps.online`)

## Privacy

- **No tracking**: We don't store location history
- **Ephemeral rooms**: Auto-delete after 7 days of inactivity
- **Precision control**: Choose how accurately to share your location
- **Ghost mode**: Hide your location while staying in the room

## License

MIT
