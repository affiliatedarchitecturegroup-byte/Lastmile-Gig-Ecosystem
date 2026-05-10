/**
 * Kafka event type definitions for the Lastmile Gig event backbone.
 * All inter-service asynchronous communication uses these event schemas.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 3.1
 */

// --- Base Event ---

export interface KafkaEvent<T = unknown> {
  eventId: string;
  eventType: string;
  timestamp: string;
  source: string;
  traceId: string;
  payload: T;
}

// --- Order Events ---

export interface OrderPlacedEvent
  extends KafkaEvent<{
    orderId: string;
    customerId: string;
    partnerId: string;
    items: Array<{ itemId: string; quantity: number; unitPrice: number }>;
    total: number;
    deliveryAddress: { latitude: number; longitude: number; street: string };
    zone: string;
  }> {
  eventType: 'order.placed';
}

export interface OrderDispatchedEvent
  extends KafkaEvent<{
    orderId: string;
    driverId: string;
    estimatedMinutes: number;
    routeDistanceKm: number;
  }> {
  eventType: 'order.dispatched';
}

export interface OrderDeliveredEvent
  extends KafkaEvent<{
    orderId: string;
    driverId: string;
    deliveryLatitude: number;
    deliveryLongitude: number;
    photoHash: string;
    deliveredAt: string;
  }> {
  eventType: 'order.delivered';
}

export interface OrderCancelledEvent
  extends KafkaEvent<{
    orderId: string;
    cancelledBy: string;
    reason: string;
  }> {
  eventType: 'order.cancelled';
}

// --- Driver Events ---

export interface DriverStatusChangedEvent
  extends KafkaEvent<{
    driverId: string;
    previousStatus: string;
    newStatus: string;
    zone: string;
  }> {
  eventType: 'driver.status.changed';
}

export interface DriverLocationEvent
  extends KafkaEvent<{
    driverId: string;
    latitude: number;
    longitude: number;
    speedKmh: number;
    heading: number;
  }> {
  eventType: 'driver.location';
}

// --- Payment Events ---

export interface PaymentCompletedEvent
  extends KafkaEvent<{
    paymentId: string;
    orderId: string;
    amount: number;
    gateway: string;
    gatewayRef: string;
  }> {
  eventType: 'payment.completed';
}

// --- Fleet Events ---

export interface FleetTelemetryEvent
  extends KafkaEvent<{
    vehicleId: string;
    latitude: number;
    longitude: number;
    speedKmh: number;
    batteryPct: number | null;
    engineTempC: number;
    errorCodes: string[];
  }> {
  eventType: 'fleet.telemetry';
}

export interface FleetMaintenanceEvent
  extends KafkaEvent<{
    vehicleId: string;
    alertType: string;
    severity: string;
    message: string;
  }> {
  eventType: 'fleet.maintenance';
}

// --- Fraud Events ---

export interface FraudAlertEvent
  extends KafkaEvent<{
    entityType: 'driver' | 'customer' | 'partner';
    entityId: string;
    riskScore: number;
    indicators: string[];
    recommendedAction: string;
  }> {
  eventType: 'fraud.alert';
}

// --- Kafka Topic Constants ---

export const KAFKA_TOPICS = {
  ORDERS_PLACED: 'lmg.orders.placed',
  ORDERS_DISPATCHED: 'lmg.orders.dispatched',
  ORDERS_DELIVERED: 'lmg.orders.delivered',
  ORDERS_CANCELLED: 'lmg.orders.cancelled',
  DRIVERS_STATUS: 'lmg.drivers.status',
  DRIVERS_LOCATION: 'lmg.drivers.location',
  PAYMENTS_COMPLETED: 'lmg.payments.completed',
  PAYMENTS_WEBHOOK: 'lmg.payments.webhook',
  FLEET_TELEMETRY: 'lmg.fleet.telemetry',
  FLEET_MAINTENANCE: 'lmg.fleet.maintenance',
  FRAUD_ALERT: 'lmg.fraud.alert',
  ESG_METRICS: 'lmg.esg.metrics',
} as const;
