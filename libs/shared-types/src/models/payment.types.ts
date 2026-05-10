/**
 * Payment type definitions.
 * Maps to the `payments` table in Supabase PostgreSQL.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2
 * @see docs/specs/11_PAYMENTS_FINANCIAL.md
 */

import { PaymentGateway, PaymentStatus, PayoutType } from '../enums';

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
  gatewayRef: string | null;
  status: PaymentStatus;
  payoutType: PayoutType;
  createdAt: string;
  completedAt: string | null;
}

export interface InitiatePaymentDto {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  customerEmail: string;
  callbackUrl: string;
}

export interface PaymentWebhookPayload {
  gateway: PaymentGateway;
  event: string;
  reference: string;
  amount: number;
  status: PaymentStatus;
  metadata: Record<string, unknown>;
}

export interface DriverPayoutRequest {
  driverId: string;
  orderId: string;
  grossAmount: number;
  commissionRate: number;
  netAmount: number;
  payoutMethod: 'ozow' | 'polygon';
}

export interface ReconciliationReport {
  date: string;
  totalTransactions: number;
  totalAmount: number;
  matched: number;
  discrepancies: number;
  byGateway: Record<string, { count: number; amount: number }>;
}
