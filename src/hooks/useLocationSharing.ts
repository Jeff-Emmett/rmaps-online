import { useState, useEffect, useCallback, useRef } from 'react';
import type { ParticipantLocation, LocationSource } from '@/types';

interface UseLocationSharingOptions {
  /** Called when location updates */
  onLocationUpdate?: (location: ParticipantLocation) => void;
  /** Update interval in milliseconds (default: 5000) */
  updateInterval?: number;
  /** Enable high accuracy mode (uses more battery) */
  highAccuracy?: boolean;
  /** Maximum age of cached position in ms (default: 10000) */
  maxAge?: number;
  /** Timeout for position request in ms (default: 10000) */
  timeout?: number;
}

interface UseLocationSharingReturn {
  /** Whether location sharing is currently active */
  isSharing: boolean;
  /** Current location (if available) */
  currentLocation: ParticipantLocation | null;
  /** Any error that occurred */
  error: GeolocationPositionError | null;
  /** Start sharing location */
  startSharing: () => void;
  /** Stop sharing location */
  stopSharing: () => void;
  /** Request a single location update */
  requestUpdate: () => void;
  /** Permission state */
  permissionState: PermissionState | null;
}

export function useLocationSharing(
  options: UseLocationSharingOptions = {}
): UseLocationSharingReturn {
  const {
    onLocationUpdate,
    updateInterval = 5000,
    highAccuracy = true,
    maxAge = 10000,
    timeout = 10000,
  } = options;

  const [isSharing, setIsSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<ParticipantLocation | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const onLocationUpdateRef = useRef(onLocationUpdate);

  // Keep callback ref updated
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
  }, [onLocationUpdate]);

  // Check permission state
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          setPermissionState(result.state);
          result.addEventListener('change', () => {
            setPermissionState(result.state);
          });
        })
        .catch(() => {
          // Permissions API not supported, will check on first request
        });
    }
  }, []);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const location: ParticipantLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude ?? undefined,
      altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
      heading: position.coords.heading ?? undefined,
      speed: position.coords.speed ?? undefined,
      timestamp: new Date(position.timestamp),
      source: 'gps' as LocationSource,
    };

    setCurrentLocation(location);
    setError(null);
    onLocationUpdateRef.current?.(location);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(err);
    console.error('Geolocation error:', err.message);
  }, []);

  const startSharing = useCallback(() => {
    if (!('geolocation' in navigator)) {
      console.error('Geolocation is not supported');
      return;
    }

    if (watchIdRef.current !== null) {
      return; // Already watching
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: highAccuracy,
      maximumAge: maxAge,
      timeout,
    };

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      geoOptions
    );

    setIsSharing(true);
    console.log('Started location sharing');
  }, [highAccuracy, maxAge, timeout, handlePosition, handleError]);

  const stopSharing = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsSharing(false);
    console.log('Stopped location sharing');
  }, []);

  const requestUpdate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: 0,
        timeout,
      }
    );
  }, [highAccuracy, timeout, handlePosition, handleError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isSharing,
    currentLocation,
    error,
    startSharing,
    stopSharing,
    requestUpdate,
    permissionState,
  };
}
