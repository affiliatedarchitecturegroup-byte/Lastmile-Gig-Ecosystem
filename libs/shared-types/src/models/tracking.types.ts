/**
 * Shared Tracking Types (P170-P172)
 *
 * Type definitions shared across all frontends and the tracking service
 * for real-time location tracking via WebSocket.
 *
 * Used by:
 * - mobile-driver (React Native) - GPS push
 * - web-customer (Next.js) - Order tracking map
 * - dashboard-command (Angular) - Command Centre map
 * - svc-tracking (Elixir) - Channel event contracts
 *
 * @module shared-types/models/tracking
 * @language TypeScript
 */

// ---------------------------------------------------------------------------
// GPS & Location types
// ---------------------------------------------------------------------------

/** GPS coordinate pair */
export interface GpsCoordinate {
  lat: number;
  lng: number;
}

/** Full driver location update payload */
export interface DriverLocationUpdate {
  driverId: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: number;
  zone: TrackingZone;
}

/** Location with metadata stored in Redis */
export interface StoredLocation {
  lat: number;
  lng: number;
  ts: number;
  zone: string;
  speed: number;
  heading: number;
}

// ---------------------------------------------------------------------------
// Zone types
// ---------------------------------------------------------------------------

/** Supported delivery zones in South Africa */
export type TrackingZone =
  | 'KZN-North'
  | 'KZN-South'
  | 'Gauteng'
  | 'WC'
  | 'EC'
  | 'Other';

/** Zone summary with driver counts */
export interface ZoneSummary {
  zones: Record<TrackingZone, number>;
  totalActiveDrivers: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Channel event types
// ---------------------------------------------------------------------------

/** Events sent from driver to tracking service */
export interface DriverChannelInEvents {
  'location:update': {
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    accuracy: number;
    timestamp: number;
  };
  'status:update': {
    status: DriverTrackingStatus;
  };
  'shift:end': Record<string, never>;
}

/** Events broadcast from tracking service to subscribers */
export interface DriverChannelOutEvents {
  'location:new': DriverLocationUpdate;
  'status:changed': {
    driverId: string;
    status: DriverTrackingStatus;
    timestamp: string;
  };
  'shift:ended': {
    driverId: string;
    endedAt: string;
  };
  presence_state: Record<string, unknown>;
}

/** Events for order tracking channel */
export interface OrderChannelOutEvents {
  'driver:location': DriverLocationUpdate;
  'order:status': {
    orderId: string;
    status: OrderTrackingStatus;
    geoVerified?: boolean;
    timestamp: string;
  };
  'order:eta': {
    orderId: string;
    distanceM: number;
    etaMinutes: number;
    calculatedAt: string;
  };
  'pickup:confirmed': {
    orderId: string;
    driverId: string;
    pickedUpAt: string;
  };
  'delivery:confirmed': {
    orderId: string;
    driverId: string;
    geoVerified: boolean | null;
    deliveryLat: number;
    deliveryLng: number;
    attemptedAt: string;
  };
}

/** Events for ops:global command centre channel */
export interface OpsChannelOutEvents {
  'driver:location_update': DriverLocationUpdate;
  'driver:online': { driverId: string; zone: TrackingZone; timestamp: string };
  'driver:offline': { driverId: string; zone: TrackingZone; timestamp: string };
  'order:status_change': {
    orderId: string;
    status: OrderTrackingStatus;
    driverId?: string;
    timestamp: string;
  };
  'zone:summary': ZoneSummary;
  'dispatch:event': {
    orderId: string;
    driverId: string;
    etaMinutes?: number;
    dispatchedAt: string;
  };
  'alert:anomaly': {
    driverId: string;
    anomalyType: AnomalyType;
    severity: AlertSeverity;
    distanceM?: number;
    timestamp: string;
  };
  'zone:paused': {
    zone: TrackingZone;
    reason: string;
    pausedBy: string;
    pausedAt: string;
  };
  'zone:resumed': {
    zone: TrackingZone;
    resumedBy: string;
    resumedAt: string;
  };
}

// ---------------------------------------------------------------------------
// Enums & status types
// ---------------------------------------------------------------------------

/** Driver tracking status */
export type DriverTrackingStatus = 'active' | 'idle' | 'offline' | 'en_route';

/** Order tracking status */
export type OrderTrackingStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'dispatched'
  | 'picked_up'
  | 'en_route'
  | 'delivered'
  | 'cancelled';

/** Anomaly types detected by tracking service */
export type AnomalyType = 'drift' | 'gps_spoofing' | 'speed_violation' | 'zone_violation';

/** Alert severity levels */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

// ---------------------------------------------------------------------------
// WebSocket connection types
// ---------------------------------------------------------------------------

/** Tracking WebSocket connection configuration */
export interface TrackingSocketConfig {
  wsUrl: string;
  token: string;
  heartbeatIntervalMs: number;
  reconnectAfterMs: (tries: number) => number;
}

/** Tracking connection state */
export interface TrackingConnectionState {
  connected: boolean;
  channelJoined: boolean;
  reconnectAttempts: number;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
}

// ---------------------------------------------------------------------------
// Redis key types (for documentation)
// ---------------------------------------------------------------------------

/**
 * Redis key namespace documentation.
 * These are the key patterns used by the tracking service.
 *
 * - `lmg:tracking:driver:{driverId}:location` - Current GPS (TTL: 60s)
 * - `lmg:tracking:driver:{driverId}:history`  - Last 10 positions (TTL: 5min)
 * - `lmg:tracking:zone:{zone}:drivers`        - Active driver IDs per zone (set)
 * - `lmg:tracking:order:{orderId}:driver`      - Order-to-driver mapping (TTL: 4h)
 * - `lmg:tracking:dispatch:lock:{orderId}`     - Dispatch lock (TTL: 30s)
 */
export type TrackingRedisKeyPattern = string;
