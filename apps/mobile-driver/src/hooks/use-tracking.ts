/**
 * Driver Mobile App - useTracking React Hook (P170)
 *
 * React hook for managing the driver's real-time tracking connection.
 * Wraps TrackingSocketService with React state management and
 * Expo Location API integration.
 *
 * Usage:
 * ```tsx
 * const { state, startShift, endShift, updateStatus } = useTracking({
 *   driverId: driver.id,
 *   zone: driver.zone,
 *   vehicleType: driver.vehicleType,
 * });
 * ```
 *
 * @module mobile-driver/hooks/use-tracking
 * @language TypeScript (React Native / Expo)
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  DriverLocation,
  TrackingConfig,
  TrackingSocketState,
} from '../services/tracking-socket.service';
import { TrackingSocketService } from '../services/tracking-socket.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseTrackingOptions {
  driverId: string;
  zone: string;
  vehicleType: string;
  token: string;
  wsUrl?: string;
  updateIntervalMs?: number;
  autoConnect?: boolean;
}

export interface UseTrackingReturn {
  state: TrackingSocketState;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  startShift: () => void;
  endShift: () => void;
  updateStatus: (status: 'active' | 'idle' | 'offline') => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_WS_URL = 'wss://ws.lastmilegig.aagais.co.za/tracking';

const DEFAULT_STATE: TrackingSocketState = {
  connected: false,
  channelJoined: false,
  shiftActive: false,
  lastLocation: null,
  reconnectAttempts: 0,
  offlineQueue: [],
};

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useTracking(options: UseTrackingOptions): UseTrackingReturn {
  const [state, setState] = useState<TrackingSocketState>(DEFAULT_STATE);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef<TrackingSocketService | null>(null);

  // Create the tracking service config
  const config: TrackingConfig = {
    wsUrl: options.wsUrl ?? DEFAULT_WS_URL,
    token: options.token,
    driverId: options.driverId,
    zone: options.zone,
    vehicleType: options.vehicleType,
    updateIntervalMs: options.updateIntervalMs,
  };

  // -------------------------------------------------------------------------
  // Location provider (Expo Location API)
  // -------------------------------------------------------------------------

  const getLocation = useCallback(async (): Promise<DriverLocation> => {
    // In a real implementation, this uses expo-location:
    // const location = await Location.getCurrentPositionAsync({
    //   accuracy: Location.Accuracy.High,
    // });

    // Placeholder - in production, replace with actual Expo Location call
    return {
      lat: 0,
      lng: 0,
      speed: 0,
      heading: 0,
      accuracy: 0,
      timestamp: Date.now(),
    };
  }, []);

  // -------------------------------------------------------------------------
  // Connection management
  // -------------------------------------------------------------------------

  const connect = useCallback((): void => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
    }

    const service = new TrackingSocketService(config);
    serviceRef.current = service;

    service.connect(
      (newState: TrackingSocketState) => {
        setState(newState);
        setError(null);
      },
      (err: string) => {
        setError(err);
      }
    );
  }, [config.driverId, config.token, config.zone]);

  const disconnect = useCallback((): void => {
    serviceRef.current?.disconnect();
    serviceRef.current = null;
    setState(DEFAULT_STATE);
  }, []);

  // -------------------------------------------------------------------------
  // Shift management
  // -------------------------------------------------------------------------

  const startShift = useCallback((): void => {
    serviceRef.current?.startShift(getLocation);
  }, [getLocation]);

  const endShift = useCallback((): void => {
    serviceRef.current?.endShift();
  }, []);

  // -------------------------------------------------------------------------
  // Status management
  // -------------------------------------------------------------------------

  const updateStatus = useCallback(
    (status: 'active' | 'idle' | 'offline'): void => {
      serviceRef.current?.updateStatus(status);
    },
    []
  );

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (options.autoConnect !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [options.driverId]);

  return {
    state,
    error,
    connect,
    disconnect,
    startShift,
    endShift,
    updateStatus,
  };
}
