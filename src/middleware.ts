import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to handle subdomain-based room routing
 *
 * Routes:
 * - rmaps.online -> home page
 * - www.rmaps.online -> home page
 * - <room>.rmaps.online -> /room/<room>
 *
 * Also handles localhost for development
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Extract subdomain
  // Production: <room>.rmaps.online
  // Development: <room>.localhost:3000
  let subdomain: string | null = null;

  if (hostname.includes('rmaps.online')) {
    // Production
    const parts = hostname.split('.rmaps.online')[0].split('.');
    if (parts.length > 0 && parts[0] !== 'www' && parts[0] !== 'rmaps') {
      subdomain = parts[parts.length - 1];
    }
  } else if (hostname.includes('localhost')) {
    // Development: check for subdomain.localhost:port
    const parts = hostname.split('.localhost')[0].split('.');
    if (parts.length > 0 && parts[0] !== 'localhost') {
      subdomain = parts[parts.length - 1];
    }
  }

  // If we have a subdomain, rewrite to the room page
  if (subdomain && subdomain.length > 0) {
    // Don't rewrite if already on /room/ path
    if (!url.pathname.startsWith('/room/')) {
      url.pathname = `/room/${subdomain}${url.pathname === '/' ? '' : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match all paths except static files and API routes
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};
