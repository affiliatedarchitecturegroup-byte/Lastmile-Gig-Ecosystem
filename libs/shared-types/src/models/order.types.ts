/**
 * Order type definitions.
 * Maps to the `orders` table in Supabase PostgreSQL.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.4
 */

import { OrderStatus, PaymentMethod } from '../enums';

export interface Order {
  id: string;
  customerId: string;
  partnerId: string;
  driverId: string | null;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentRef: string | null;
  deliveryAddress: DeliveryAddress;
  placedAt: string;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  deliveryPhotoHash: string | null;
  blockchainTx: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface DeliveryAddress {
  street: string;
  latitude: number;
  longitude: number;
  instructions: string | null;
}

export interface PlaceOrderDto {
  partnerId: string;
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  paymentMethod: PaymentMethod;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  timestamp: string;
  driverId?: string;
  metadata?: Record<string, unknown>;
}

export interface DeliveryVerification {
  orderId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  photoHash: string;
  timestamp: string;
  withinRange: boolean;
}

export interface DispatchDecision {
  orderId: string;
  candidateDrivers: DriverCandidate[];
  selectedDriverId: string;
  confidence: number;
  hitlRequired: boolean;
  routeEstimate: RouteEstimate;
}

export interface DriverCandidate {
  driverId: string;
  score: number;
  distanceKm: number;
  estimatedMinutes: number;
  performanceTier: string;
}

export interface RouteEstimate {
  distanceKm: number;
  estimatedMinutes: number;
  waypoints: Array<{ latitude: number; longitude: number }>;
}
