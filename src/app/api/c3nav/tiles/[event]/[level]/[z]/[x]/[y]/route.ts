import { NextRequest, NextResponse } from 'next/server';

// Proxy c3nav tiles to add CORS headers
// URL pattern: /api/c3nav/tiles/{event}/{level}/{z}/{x}/{y}
// Proxies to: https://tiles.{event}.c3nav.de/{level}/{z}/{x}/{y}.png

interface RouteParams {
  params: {
    event: string;
    level: string;
    z: string;
    x: string;
    y: string;
  };
}

// Valid c3nav events
const VALID_EVENTS = ['38c3', '37c3', 'eh22', 'eh2025', 'camp2023'];

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { event, level, z, x, y } = params;

  // Validate event
  if (!VALID_EVENTS.includes(event)) {
    return NextResponse.json(
      { error: 'Invalid event' },
      { status: 400 }
    );
  }

  // Validate numeric params
  const levelNum = parseInt(level, 10);
  const zNum = parseInt(z, 10);
  const xNum = parseInt(x, 10);
  const yNum = parseInt(y, 10);

  if ([levelNum, zNum, xNum, yNum].some(isNaN)) {
    return NextResponse.json(
      { error: 'Invalid tile coordinates' },
      { status: 400 }
    );
  }

  // Build c3nav tile URL
  const tileUrl = `https://tiles.${event}.c3nav.de/${level}/${z}/${x}/${y}.png`;

  try {
    const response = await fetch(tileUrl, {
      headers: {
        'User-Agent': 'rMaps.online/1.0 (c3nav tile proxy)',
      },
    });

    if (!response.ok) {
      // Pass through error responses
      const errorText = await response.text();
      return new NextResponse(errorText, {
        status: response.status,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get the tile image
    const imageBuffer = await response.arrayBuffer();

    // Return with CORS headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error) {
    console.error('Tile proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tile' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
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
