/**
 * Driver Mobile App - WebSocket Tracking Service (P170)
 *
 * Manages the persistent WebSocket connection between the driver's mobile
 * device and the Lastmile Gig tracking service (Elixir/Phoenix).
 *
 * Responsibilities:
 * - Connect to the tracking WebSocket with JWT authentication
 * - Push GPS coordinates every 5 seconds while on shift
 * - Handle reconnection with exponential backoff
 * - Manage shift start/end lifecycle
 * - Queue location updates when offline (sync on reconnect)
 *
 * @module mobile-driver/services/tracking-socket
 * @language TypeScript (React Native / Expo)
 * @see POLYGLOT_ARCHITECTURE.md Section 3.3
 */

import { Socket, Channel } from 'phoenix';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DriverLocation {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: number;
}

export interface TrackingConfig {
  wsUrl: string;
  token: string;
  driverId: string;
  zone: string;
  vehicleType: string;
  updateIntervalMs?: number;
}

export interface TrackingSocketState {
  connected: boolean;
  channelJoined: boolean;
  shiftActive: boolean;
  lastLocation: DriverLocation | null;
  reconnectAttempts: number;
  offlineQueue: DriverLocation[];
}

type ConnectionCallback = (state: TrackingSocketState) => void;
type ErrorCallback = (error: string) => void;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_UPDATE_INTERVAL_MS = 5_000;
const MAX_RECONNECT_ATTEMPTS = 50;
const MAX_OFFLINE_QUEUE_SIZE = 100;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

// ---------------------------------------------------------------------------
// TrackingSocketService
// ---------------------------------------------------------------------------

export class TrackingSocketService {
  private socket: Socket | null = null;
  private driverChannel: Channel | null = null;
  private locationInterval: ReturnType<typeof setInterval> | null = null;
  private config: TrackingConfig;

  private state: TrackingSocketState = {
    connected: false,
    channelJoined: false,
    shiftActive: false,
    lastLocation: null,
    reconnectAttempts: 0,
    offlineQueue: [],
  };

  private onStateChange: ConnectionCallback | null = null;
  private onError: ErrorCallback | null = null;

  constructor(config: TrackingConfig) {
    this.config = config;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Connect to the tracking WebSocket and join the driver channel.
   * Called when the driver starts their shift.
   */
  connect(onStateChange?: ConnectionCallback, onError?: ErrorCallback): void {
    this.onStateChange = onStateChange ?? null;
    this.onError = onError ?? null;

    this.socket = new Socket(this.config.wsUrl, {
      params: { token: this.config.token },
      reconnectAfterMs: (tries: number): number => {
        const delay = Math.min(
          RECONNECT_BASE_DELAY_MS * Math.pow(2, tries),
          RECONNECT_MAX_DELAY_MS
        );
        return delay;
      },
      heartbeatIntervalMs: 30_000,
    });

    this.socket.onOpen(() => {
      this.updateState({ connected: true, reconnectAttempts: 0 });
      this.joinDriverChannel();
    });

    this.socket.onClose(() => {
      this.updateState({ connected: false, channelJoined: false });
    });

    this.socket.onError(() => {
      this.updateState({
        connected: false,
        reconnectAttempts: this.state.reconnectAttempts + 1,
      });

      if (this.state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        this.onError?.('Max reconnection attempts reached');
      }
    });

    this.socket.connect();
  }

  /**
   * Start the shift - begin pushing GPS coordinates at 5-second intervals.
   */
  startShift(getLocation: () => Promise<DriverLocation>): void {
    this.updateState({ shiftActive: true });

    const intervalMs =
      this.config.updateIntervalMs ?? DEFAULT_UPDATE_INTERVAL_MS;

    // Flush any queued offline locations first
    this.flushOfflineQueue();

    this.locationInterval = setInterval(async () => {
      try {
        const location = await getLocation();
        this.pushLocation(location);
      } catch (error) {
        // Location fetch failed - skip this interval
      }
    }, intervalMs);
  }

  /**
   * End the shift - stop location updates and notify the server.
   */
  endShift(): void {
    if (this.locationInterval) {
      clearInterval(this.locationInterval);
      this.locationInterval = null;
    }

    if (this.driverChannel) {
      this.driverChannel.push('shift:end', {}).receive('ok', () => {
        this.updateState({ shiftActive: false });
      });
    }
  }

  /**
   * Update driver status (active/idle/offline).
   */
  updateStatus(status: 'active' | 'idle' | 'offline'): void {
    if (this.driverChannel) {
      this.driverChannel.push('status:update', { status });
    }
  }

  /**
   * Disconnect from the WebSocket entirely.
   */
  disconnect(): void {
    this.endShift();

    if (this.driverChannel) {
      this.driverChannel.leave();
      this.driverChannel = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateState({
      connected: false,
      channelJoined: false,
      shiftActive: false,
    });
  }

  /**
   * Get current tracking state.
   */
  getState(): Readonly<TrackingSocketState> {
    return { ...this.state };
  }

  // -------------------------------------------------------------------------
  // Private methods
  // -------------------------------------------------------------------------

  private joinDriverChannel(): void {
    if (!this.socket) return;

    const topic = `driver:${this.config.driverId}`;

    this.driverChannel = this.socket.channel(topic, {
      zone: this.config.zone,
      vehicle_type: this.config.vehicleType,
    });

    this.driverChannel
      .join()
      .receive('ok', (response: Record<string, unknown>) => {
        this.updateState({ channelJoined: true });
        this.flushOfflineQueue();
      })
      .receive('error', (response: Record<string, unknown>) => {
        this.onError?.(`Channel join failed: ${JSON.stringify(response)}`);
      })
      .receive('timeout', () => {
        this.onError?.('Channel join timed out');
      });

    // Listen for presence state
    this.driverChannel.on('presence_state', (_payload: unknown) => {
      // Presence state received - can be used for UI indicators
    });
  }

  private pushLocation(location: DriverLocation): void {
    if (this.driverChannel && this.state.channelJoined) {
      this.driverChannel
        .push('location:update', {
          lat: location.lat,
          lng: location.lng,
          speed: location.speed,
          heading: location.heading,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
        })
        .receive('ok', () => {
          this.updateState({ lastLocation: location });
        })
        .receive('error', () => {
          // Failed to push - queue for later
          this.queueOfflineLocation(location);
        });
    } else {
      // Not connected - queue location
      this.queueOfflineLocation(location);
    }
  }

  private queueOfflineLocation(location: DriverLocation): void {
    if (this.state.offlineQueue.length < MAX_OFFLINE_QUEUE_SIZE) {
      this.state.offlineQueue.push(location);
    }
  }

  private flushOfflineQueue(): void {
    if (this.state.offlineQueue.length === 0) return;
    if (!this.driverChannel || !this.state.channelJoined) return;

    const queue = [...this.state.offlineQueue];
    this.state.offlineQueue = [];

    // Push the most recent queued location (skip stale ones)
    const mostRecent = queue[queue.length - 1];
    if (mostRecent) {
      this.pushLocation(mostRecent);
    }
  }

  private updateState(partial: Partial<TrackingSocketState>): void {
    this.state = { ...this.state, ...partial };
    this.onStateChange?.(this.state);
  }
}
