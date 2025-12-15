/**
 * c3nav API client for indoor navigation at CCC events
 * API docs: https://<event>.c3nav.de/api/v2/
 */

import type {
  C3NavLocation,
  C3NavRouteRequest,
  C3NavRouteResponse,
} from '@/types';

// Default to 38c3, can be overridden per-room
const DEFAULT_C3NAV_BASE = 'https://38c3.c3nav.de';

export class C3NavClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_C3NAV_BASE) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all locations (rooms, POIs, etc.)
   */
  async getLocations(options?: {
    searchable?: boolean;
    geometry?: boolean;
  }): Promise<C3NavLocation[]> {
    const params = new URLSearchParams();
    if (options?.searchable !== undefined) {
      params.set('searchable', String(options.searchable));
    }
    if (options?.geometry !== undefined) {
      params.set('geometry', String(options.geometry));
    }

    const response = await fetch(
      `${this.baseUrl}/api/v2/map/locations/?${params}`
    );

    if (!response.ok) {
      throw new Error(`c3nav API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get a specific location by slug
   */
  async getLocation(slug: string): Promise<C3NavLocation> {
    const response = await fetch(
      `${this.baseUrl}/api/v2/map/locations/by-slug/${slug}/`
    );

    if (!response.ok) {
      throw new Error(`c3nav location not found: ${slug}`);
    }

    return response.json();
  }

  /**
   * Calculate a route between two points
   */
  async getRoute(request: C3NavRouteRequest): Promise<C3NavRouteResponse> {
    const response = await fetch(`${this.baseUrl}/api/v2/routing/route/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`c3nav routing error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get map settings (includes projection info for coordinate conversion)
   */
  async getMapSettings(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/api/v2/map/settings/`);

    if (!response.ok) {
      throw new Error(`c3nav settings error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get map bounds
   */
  async getMapBounds(): Promise<{
    bounds: [number, number, number, number];
    levels: Array<{ level: number; title: string }>;
  }> {
    const response = await fetch(`${this.baseUrl}/api/v2/map/bounds/`);

    if (!response.ok) {
      throw new Error(`c3nav bounds error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Position using WiFi/BLE measurements
   */
  async locate(measurements: {
    wifi?: Array<{ bssid: string; rssi: number }>;
    ble?: Array<{ uuid: string; major: number; minor: number; rssi: number }>;
  }): Promise<{
    x: number;
    y: number;
    level: number;
    accuracy: number;
  } | null> {
    const response = await fetch(`${this.baseUrl}/api/v2/positioning/locate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(measurements),
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  }

  /**
   * Get the embed URL for iframe integration
   */
  getEmbedUrl(options?: {
    location?: string;
    origin?: string;
    destination?: string;
    level?: number;
  }): string {
    const params = new URLSearchParams();
    params.set('embed', '1');

    if (options?.location) {
      params.set('o', options.location);
    }
    if (options?.origin) {
      params.set('origin', options.origin);
    }
    if (options?.destination) {
      params.set('destination', options.destination);
    }
    if (options?.level !== undefined) {
      params.set('level', String(options.level));
    }

    return `${this.baseUrl}/?${params}`;
  }
}

// Singleton instance
export const c3nav = new C3NavClient();

// Helper to check if coordinates are within c3nav coverage
export function isInC3NavArea(
  lat: number,
  lng: number,
  eventBounds?: { north: number; south: number; east: number; west: number }
): boolean {
  // Default: Hamburg CCH bounds
  const bounds = eventBounds ?? {
    north: 53.558,
    south: 53.552,
    east: 9.995,
    west: 9.985,
  };

  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}
