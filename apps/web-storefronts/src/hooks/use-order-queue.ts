/**
 * Order Queue Hook with WebSocket
 * @module web-storefronts/hooks/use-order-queue
 * @description Real-time order queue management via WebSocket + REST fallback
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  OrderWebSocketEvent,
  OrderWebSocketMessage,
  PartnerOrder,
  PartnerOrderStatus,
} from '../types/partner.types';

const LMG_API_BASE = process.env.NEXT_PUBLIC_LMG_API_URL ?? '/api/v1';
const LMG_WS_URL = process.env.NEXT_PUBLIC_LMG_WS_URL ?? 'wss://ws.lastmilegig.aagais.co.za';

/** WebSocket reconnection config */
const WS_RECONNECT_DELAY_MS = 3_000;
const WS_MAX_RECONNECT_ATTEMPTS = 10;
const WS_HEARTBEAT_INTERVAL_MS = 30_000;

/** Order queue filter options */
export interface OrderQueueFilters {
  readonly status?: PartnerOrderStatus;
  readonly searchQuery?: string;
  readonly sortBy: 'newest' | 'oldest' | 'total_desc' | 'total_asc';
}

/** Default filters */
const DEFAULT_FILTERS: OrderQueueFilters = {
  sortBy: 'newest',
};

/** Order queue state */
interface OrderQueueState {
  readonly orders: ReadonlyArray<PartnerOrder>;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly isConnected: boolean;
  readonly filters: OrderQueueFilters;
  readonly newOrderAlert: PartnerOrder | null;
}

const INITIAL_STATE: OrderQueueState = {
  orders: [],
  isLoading: true,
  error: null,
  isConnected: false,
  filters: DEFAULT_FILTERS,
  newOrderAlert: null,
};

/**
 * Fetches active orders from REST API (initial load + fallback)
 */
async function fetchActiveOrders(
  partnerId: string,
  token: string,
): Promise<ReadonlyArray<PartnerOrder>> {
  const response = await fetch(
    `${LMG_API_BASE}/partners/${partnerId}/orders?status=active`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Order fetch failed: ${response.status}`);
  }

  const result: { data: ReadonlyArray<PartnerOrder> } = await response.json();
  return result.data;
}

/**
 * Updates order status via REST API
 */
async function updateOrderStatusApi(
  partnerId: string,
  orderId: string,
  status: PartnerOrderStatus,
  token: string,
): Promise<PartnerOrder> {
  const response = await fetch(
    `${LMG_API_BASE}/partners/${partnerId}/orders/${orderId}/status`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    throw new Error(`Order status update failed: ${response.status}`);
  }

  const result: { data: PartnerOrder } = await response.json();
  return result.data;
}

/**
 * Applies filters and sorting to order list
 */
function applyFilters(
  orders: ReadonlyArray<PartnerOrder>,
  filters: OrderQueueFilters,
): ReadonlyArray<PartnerOrder> {
  let filtered = [...orders];

  if (filters.status) {
    filtered = filtered.filter((order) => order.status === filters.status);
  }

  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.customer.displayName.toLowerCase().includes(query) ||
        order.items.some((item) => item.name.toLowerCase().includes(query)),
    );
  }

  switch (filters.sortBy) {
    case 'newest':
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
    case 'oldest':
      filtered.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      break;
    case 'total_desc':
      filtered.sort((a, b) => b.total - a.total);
      break;
    case 'total_asc':
      filtered.sort((a, b) => a.total - b.total);
      break;
  }

  return filtered;
}

/**
 * Play notification sound for new orders
 */
function playNewOrderSound(): void {
  if (typeof window === 'undefined') return;

  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.5,
    );
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch {
    // Audio not available, silently ignore
  }
}

/**
 * Custom hook for real-time order queue management
 * Connects to Elixir Phoenix WebSocket for live updates with REST fallback
 *
 * @param partnerId - UUID of the partner restaurant
 * @param token - JWT bearer token for API authentication
 * @returns Order queue state with actions
 */
export function useOrderQueue(
  partnerId: string,
  token: string,
): {
  readonly orders: ReadonlyArray<PartnerOrder>;
  readonly filteredOrders: ReadonlyArray<PartnerOrder>;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly isConnected: boolean;
  readonly newOrderAlert: PartnerOrder | null;
  readonly filters: OrderQueueFilters;
  readonly setFilters: (filters: Partial<OrderQueueFilters>) => void;
  readonly updateOrderStatus: (
    orderId: string,
    status: PartnerOrderStatus,
  ) => Promise<void>;
  readonly confirmOrder: (orderId: string) => Promise<void>;
  readonly markReady: (orderId: string) => Promise<void>;
  readonly dismissAlert: () => void;
  readonly refresh: () => Promise<void>;
} {
  const [state, setState] = useState<OrderQueueState>(INITIAL_STATE);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  /** Load initial orders from REST API */
  const loadOrders = useCallback(async (): Promise<void> => {
    if (!partnerId || !token) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const orders = await fetchActiveOrders(partnerId, token);
      setState((prev) => ({ ...prev, orders, isLoading: false }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load orders';
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, [partnerId, token]);

  /** Handle incoming WebSocket message */
  const handleWsMessage = useCallback((message: OrderWebSocketMessage): void => {
    const { event, order } = message;

    setState((prev) => {
      const eventType = event as OrderWebSocketEvent;
      let updatedOrders = [...prev.orders];
      let alert: PartnerOrder | null = prev.newOrderAlert;

      switch (eventType) {
        case 'new_order' as OrderWebSocketEvent:
          updatedOrders = [order, ...updatedOrders];
          alert = order;
          playNewOrderSound();
          break;

        case 'order_updated' as OrderWebSocketEvent:
        case 'driver_assigned' as OrderWebSocketEvent:
        case 'driver_arrived' as OrderWebSocketEvent:
        case 'order_picked_up' as OrderWebSocketEvent:
        case 'order_delivered' as OrderWebSocketEvent:
          updatedOrders = updatedOrders.map((existing) =>
            existing.id === order.id ? order : existing,
          );
          break;

        case 'order_cancelled' as OrderWebSocketEvent:
          updatedOrders = updatedOrders.map((existing) =>
            existing.id === order.id ? order : existing,
          );
          break;

        default:
          break;
      }

      return { ...prev, orders: updatedOrders, newOrderAlert: alert };
    });
  }, []);

  /** Establish WebSocket connection */
  const connectWebSocket = useCallback((): void => {
    if (!partnerId || !token) return;

    try {
      const wsUrl = `${LMG_WS_URL}/partner/${partnerId}?token=${token}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = (): void => {
        setState((prev) => ({ ...prev, isConnected: true }));
        reconnectAttemptsRef.current = 0;

        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, WS_HEARTBEAT_INTERVAL_MS);
      };

      ws.onmessage = (event: MessageEvent): void => {
        try {
          const message = JSON.parse(String(event.data)) as OrderWebSocketMessage;
          handleWsMessage(message);
        } catch {
          // Invalid message format, skip
        }
      };

      ws.onclose = (): void => {
        setState((prev) => ({ ...prev, isConnected: false }));

        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
        }

        if (reconnectAttemptsRef.current < WS_MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          setTimeout(connectWebSocket, WS_RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = (): void => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: 'WebSocket connection failed',
      }));
    }
  }, [partnerId, token, handleWsMessage]);

  /** Update order status */
  const updateOrderStatus = useCallback(
    async (orderId: string, status: PartnerOrderStatus): Promise<void> => {
      try {
        const updatedOrder = await updateOrderStatusApi(
          partnerId,
          orderId,
          status,
          token,
        );

        setState((prev) => ({
          ...prev,
          orders: prev.orders.map((order) =>
            order.id === orderId ? updatedOrder : order,
          ),
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update order';
        setState((prev) => ({ ...prev, error: message }));
      }
    },
    [partnerId, token],
  );

  const confirmOrder = useCallback(
    async (orderId: string): Promise<void> => {
      await updateOrderStatus(orderId, 'CONFIRMED' as PartnerOrderStatus);
    },
    [updateOrderStatus],
  );

  const markReady = useCallback(
    async (orderId: string): Promise<void> => {
      await updateOrderStatus(
        orderId,
        'READY_FOR_PICKUP' as PartnerOrderStatus,
      );
    },
    [updateOrderStatus],
  );

  const dismissAlert = useCallback((): void => {
    setState((prev) => ({ ...prev, newOrderAlert: null }));
  }, []);

  const setFilters = useCallback(
    (newFilters: Partial<OrderQueueFilters>): void => {
      setState((prev) => ({
        ...prev,
        filters: { ...prev.filters, ...newFilters },
      }));
    },
    [],
  );

  /** Initialize: load orders + connect WebSocket */
  useEffect(() => {
    void loadOrders();
    connectWebSocket();

    return (): void => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [loadOrders, connectWebSocket]);

  const filteredOrders = applyFilters(state.orders, state.filters);

  return {
    orders: state.orders,
    filteredOrders,
    isLoading: state.isLoading,
    error: state.error,
    isConnected: state.isConnected,
    newOrderAlert: state.newOrderAlert,
    filters: state.filters,
    setFilters,
    updateOrderStatus,
    confirmOrder,
    markReady,
    dismissAlert,
    refresh: loadOrders,
  };
}
