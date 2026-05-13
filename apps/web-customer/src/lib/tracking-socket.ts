/**
 * Customer Web App - Tracking WebSocket Client (P171)
 *
 * Lightweight Phoenix Channel client for the customer-facing
 * order tracking page. Connects to order:{orderId} channel.
 *
 * @module web-customer/lib/tracking-socket
 * @language TypeScript (Next.js 14)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhoenixMessage {
  topic: string;
  event: string;
  payload: Record<string, unknown>;
  ref: string | null;
}

export type ChannelEventHandler = (payload: Record<string, unknown>) => void;

// ---------------------------------------------------------------------------
// TrackingSocketClient
// ---------------------------------------------------------------------------

export class TrackingSocketClient {
  private ws: WebSocket | null = null;
  private topic: string;
  private token: string;
  private wsUrl: string;
  private handlers: Map<string, ChannelEventHandler[]> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private refCounter: number = 0;
  private joined: boolean = false;

  constructor(wsUrl: string, token: string, topic: string) {
    this.wsUrl = wsUrl;
    this.token = token;
    this.topic = topic;
  }

  /**
   * Connect to the WebSocket and join the channel.
   */
  connect(): void {
    const endpoint = `${this.wsUrl}/websocket?token=${encodeURIComponent(this.token)}&vsn=2.0.0`;

    this.ws = new WebSocket(endpoint);

    this.ws.onopen = (): void => {
      this.startHeartbeat();
      this.joinChannel();
    };

    this.ws.onmessage = (event: MessageEvent): void => {
      this.handleRawMessage(event.data as string);
    };

    this.ws.onclose = (): void => {
      this.joined = false;
      this.stopHeartbeat();
      this.scheduleReconnect();
    };

    this.ws.onerror = (): void => {
      // Error handler - reconnect handled by onclose
    };
  }

  /**
   * Register an event handler for a channel event.
   */
  on(event: string, handler: ChannelEventHandler): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...existing, handler]);
  }

  /**
   * Remove an event handler.
   */
  off(event: string, handler: ChannelEventHandler): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(
      event,
      existing.filter((h) => h !== handler)
    );
  }

  /**
   * Push an event to the channel.
   */
  push(event: string, payload: Record<string, unknown>): void {
    if (!this.ws || !this.joined) return;

    const msg: PhoenixMessage = {
      topic: this.topic,
      event,
      payload,
      ref: String(++this.refCounter),
    };

    this.ws.send(JSON.stringify(msg));
  }

  /**
   * Disconnect and clean up.
   */
  disconnect(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.joined = false;
    this.handlers.clear();
  }

  /**
   * Check if connected and joined.
   */
  isConnected(): boolean {
    return this.joined && this.ws?.readyState === WebSocket.OPEN;
  }

  // -------------------------------------------------------------------------
  // Private methods
  // -------------------------------------------------------------------------

  private joinChannel(): void {
    const msg: PhoenixMessage = {
      topic: this.topic,
      event: 'phx_join',
      payload: {},
      ref: String(++this.refCounter),
    };

    this.ws?.send(JSON.stringify(msg));
  }

  private handleRawMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw) as PhoenixMessage;

      if (msg.topic !== this.topic && msg.topic !== 'phoenix') return;

      // Handle join reply
      if (msg.event === 'phx_reply' && !this.joined) {
        const response = msg.payload as { status?: string };
        if (response.status === 'ok') {
          this.joined = true;
        }
        return;
      }

      // Dispatch to registered handlers
      const handlers = this.handlers.get(msg.event) ?? [];
      for (const handler of handlers) {
        handler(msg.payload);
      }
    } catch {
      // Ignore parse errors
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            topic: 'phoenix',
            event: 'heartbeat',
            payload: {},
            ref: String(++this.refCounter),
          })
        );
      }
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3_000);
  }
}
