import { NextRequest, NextResponse } from 'next/server';

// Proxy c3nav API calls
// URL pattern: /api/c3nav/{event}?endpoint=map/locations
// Proxies to: https://{event}.c3nav.de/api/v2/{endpoint}

interface RouteParams {
  params: {
    event: string;
  };
}

// Valid c3nav events
const VALID_EVENTS = ['38c3', '37c3', 'eh22', 'eh2025', 'camp2023'];

// Allowed API endpoints (whitelist for security)
const ALLOWED_ENDPOINTS = [
  'map/settings',
  'map/bounds',
  'map/locations',
  'map/locations/full',
  'map/projection',
];

// Cache for session cookies per event
const sessionCache = new Map<string, { cookie: string; expires: number }>();

// Get a valid session cookie for an event
async function getSessionCookie(event: string): Promise<string | null> {
  const cached = sessionCache.get(event);
  if (cached && cached.expires > Date.now()) {
    return cached.cookie;
  }

  try {
    // Get session by visiting the main page
    const response = await fetch(`https://${event}.c3nav.de/`, {
      redirect: 'follow',
    });

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      // Extract tile_access cookie
      const match = setCookie.match(/c3nav_tile_access="([^"]+)"/);
      if (match) {
        const cookie = `c3nav_tile_access="${match[1]}"`;
        // Cache for 50 seconds (cookie lasts 60s)
        sessionCache.set(event, {
          cookie,
          expires: Date.now() + 50000
        });
        return cookie;
      }
    }
  } catch (e) {
    console.error('Failed to get c3nav session:', e);
  }

  return null;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { event } = params;
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'map/bounds';

  // Validate event
  if (!VALID_EVENTS.includes(event)) {
    return NextResponse.json(
      { error: 'Invalid event' },
      { status: 400 }
    );
  }

  // Check if endpoint is allowed (basic path check)
  const isAllowed = ALLOWED_ENDPOINTS.some(
    (allowed) => endpoint === allowed || endpoint.startsWith(allowed + '/')
  );

  if (!isAllowed && !endpoint.startsWith('map/locations/')) {
    return NextResponse.json(
      { error: 'Endpoint not allowed' },
      { status: 403 }
    );
  }

  // Build c3nav API URL (trailing slash required to avoid redirect)
  const apiUrl = `https://${event}.c3nav.de/api/v2/${endpoint}/`;

  try {
    // Get session cookie
    const sessionCookie = await getSessionCookie(event);

    const headers: HeadersInit = {
      'X-API-Key': 'anonymous',
      'Accept': 'application/json',
      'User-Agent': 'rMaps.online/1.0',
    };

    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(apiUrl, {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(errorData, {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('c3nav API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from c3nav' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
