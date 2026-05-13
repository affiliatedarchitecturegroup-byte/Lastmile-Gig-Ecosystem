/**
 * Command Centre Tracking Service (P172)
 *
 * Angular service for managing the WebSocket connection to the
 * tracking service's ops:global channel.
 *
 * Provides observables for:
 * - Driver location updates
 * - Zone summaries
 * - Dispatch events
 * - Anomaly alerts
 * - Connection state
 *
 * @module dashboard-command/services/tracking
 * @language TypeScript (Angular 17)
 */

import { Injectable, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subject,
  timer,
  retry,
  takeUntil,
} from 'rxjs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DriverLocationEvent {
  driverId: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  zone: string;
  timestamp: number;
}

export interface ZoneSummaryEvent {
  zones: Record<string, number>;
  totalActiveDrivers: number;
  timestamp: string;
}

export interface OrderStatusEvent {
  orderId: string;
  status: string;
  driverId?: string;
  timestamp: string;
}

export interface DispatchEventData {
  orderId: string;
  driverId: string;
  etaMinutes?: number;
  dispatchedAt: string;
}

export interface AnomalyAlertData {
  driverId: string;
  anomalyType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  distanceM?: number;
  timestamp: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable({
  providedIn: 'root',
})
export class TrackingService implements OnDestroy {
  // Connection state
  private connectionState$ = new BehaviorSubject<ConnectionState>('disconnected');
  readonly connection$: Observable<ConnectionState> = this.connectionState$.asObservable();

  // Event streams
  private driverLocation$ = new Subject<DriverLocationEvent>();
  private zoneSummary$ = new Subject<ZoneSummaryEvent>();
  private orderStatus$ = new Subject<OrderStatusEvent>();
  private dispatchEvent$ = new Subject<DispatchEventData>();
  private anomalyAlert$ = new Subject<AnomalyAlertData>();

  // Public observables
  readonly driverLocations$: Observable<DriverLocationEvent> =
    this.driverLocation$.asObservable();
  readonly zoneSummaries$: Observable<ZoneSummaryEvent> =
    this.zoneSummary$.asObservable();
  readonly orderStatuses$: Observable<OrderStatusEvent> =
    this.orderStatus$.asObservable();
  readonly dispatchEvents$: Observable<DispatchEventData> =
    this.dispatchEvent$.asObservable();
  readonly anomalyAlerts$: Observable<AnomalyAlertData> =
    this.anomalyAlert$.asObservable();

  private destroy$ = new Subject<void>();
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // -------------------------------------------------------------------------
  // Connection management
  // -------------------------------------------------------------------------

  /**
   * Connect to the ops:global channel on the tracking service.
   */
  connect(wsUrl: string, token: string): void {
    this.connectionState$.next('connecting');

    const endpoint = `${wsUrl}/websocket?token=${encodeURIComponent(token)}`;

    try {
      this.socket = new WebSocket(endpoint);

      this.socket.onopen = (): void => {
        this.connectionState$.next('connected');
        this.joinOpsChannel();
      };

      this.socket.onmessage = (event: MessageEvent): void => {
        this.handleMessage(event.data as string);
      };

      this.socket.onclose = (): void => {
        this.connectionState$.next('disconnected');
        this.scheduleReconnect(wsUrl, token);
      };

      this.socket.onerror = (): void => {
        this.connectionState$.next('error');
      };
    } catch {
      this.connectionState$.next('error');
      this.scheduleReconnect(wsUrl, token);
    }
  }

  /**
   * Disconnect from the tracking service.
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.connectionState$.next('disconnected');
  }

  // -------------------------------------------------------------------------
  // Channel commands
  // -------------------------------------------------------------------------

  /**
   * Request zone summary (triggers zone:summary push from server).
   */
  requestZoneSummary(): void {
    this.sendChannelMessage('zone:request_summary', {});
  }

  /**
   * Request all active drivers.
   */
  requestAllDrivers(): void {
    this.sendChannelMessage('drivers:request_all', {});
  }

  /**
   * Request driver location history.
   */
  requestDriverHistory(driverId: string): void {
    this.sendChannelMessage('driver:request_history', { driver_id: driverId });
  }

  /**
   * Pause dispatch in a zone (admin only).
   */
  pauseZone(zone: string, reason: string): void {
    this.sendChannelMessage('zone:pause', { zone, reason });
  }

  /**
   * Resume dispatch in a zone (admin only).
   */
  resumeZone(zone: string): void {
    this.sendChannelMessage('zone:resume', { zone });
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  // -------------------------------------------------------------------------
  // Private methods
  // -------------------------------------------------------------------------

  private joinOpsChannel(): void {
    this.sendRawMessage({
      topic: 'ops:global',
      event: 'phx_join',
      payload: {},
      ref: 'join-1',
    });
  }

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw) as {
        topic: string;
        event: string;
        payload: Record<string, unknown>;
      };

      switch (msg.event) {
        case 'driver:location_update':
          this.driverLocation$.next(msg.payload as unknown as DriverLocationEvent);
          break;

        case 'zone:summary':
          this.zoneSummary$.next(msg.payload as unknown as ZoneSummaryEvent);
          break;

        case 'order:status_change':
          this.orderStatus$.next(msg.payload as unknown as OrderStatusEvent);
          break;

        case 'dispatch:event':
          this.dispatchEvent$.next(msg.payload as unknown as DispatchEventData);
          break;

        case 'alert:anomaly':
          this.anomalyAlert$.next(msg.payload as unknown as AnomalyAlertData);
          break;

        case 'zone:paused':
        case 'zone:resumed':
          // Zone control events handled by component
          break;

        case 'phx_reply':
          // Server acknowledgement
          break;

        case 'phx_error':
          this.connectionState$.next('error');
          break;

        default:
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  }

  private sendChannelMessage(event: string, payload: Record<string, unknown>): void {
    this.sendRawMessage({
      topic: 'ops:global',
      event,
      payload,
      ref: `msg-${Date.now()}`,
    });
  }

  private sendRawMessage(msg: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    }
  }

  private scheduleReconnect(wsUrl: string, token: string): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(wsUrl, token);
    }, 5_000);
  }
}
