/**
 * Partner Dashboard Types
 * @module web-storefronts/types/partner
 * @description Type definitions for partner admin dashboard, order queue, and analytics
 */

/** Revenue summary for dashboard cards */
export interface RevenueSummary {
  readonly todayRevenue: number;
  readonly yesterdayRevenue: number;
  readonly weekRevenue: number;
  readonly monthRevenue: number;
  readonly percentChangeToday: number;
  readonly percentChangeWeek: number;
  readonly currency: 'ZAR';
}

/** Quick stats for dashboard overview */
export interface DashboardQuickStats {
  readonly totalOrdersToday: number;
  readonly totalOrdersYesterday: number;
  readonly averageOrderValue: number;
  readonly averagePrepTime: number;
  readonly activeDeliveries: number;
  readonly pendingOrders: number;
  readonly cancelledToday: number;
  readonly customerRating: number;
  readonly ratingCount: number;
}

/** Order status enum for partner-facing flows */
export enum PartnerOrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  PICKED_UP = 'PICKED_UP',
  DELIVERING = 'DELIVERING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/** Order item within a partner order */
export interface PartnerOrderItem {
  readonly id: string;
  readonly menuItemId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
  readonly specialInstructions?: string;
  readonly modifiers?: ReadonlyArray<OrderItemModifier>;
}

/** Modifier applied to an order item */
export interface OrderItemModifier {
  readonly id: string;
  readonly name: string;
  readonly price: number;
}

/** Customer info visible to partner (no PII beyond delivery needs) */
export interface PartnerOrderCustomer {
  readonly displayName: string;
  readonly orderCount: number;
  readonly isRepeatCustomer: boolean;
}

/** Full order as seen by partner admin */
export interface PartnerOrder {
  readonly id: string;
  readonly orderNumber: string;
  readonly status: PartnerOrderStatus;
  readonly items: ReadonlyArray<PartnerOrderItem>;
  readonly customer: PartnerOrderCustomer;
  readonly subtotal: number;
  readonly deliveryFee: number;
  readonly serviceFee: number;
  readonly total: number;
  readonly currency: 'ZAR';
  readonly estimatedPrepTime: number;
  readonly estimatedDeliveryTime: number;
  readonly driverAssigned: boolean;
  readonly driverName?: string;
  readonly specialInstructions?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly confirmedAt?: string;
  readonly readyAt?: string;
  readonly pickedUpAt?: string;
  readonly deliveredAt?: string;
}

/** Dashboard period filter */
export type DashboardPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';

/** Revenue chart data point */
export interface RevenueDataPoint {
  readonly date: string;
  readonly revenue: number;
  readonly orderCount: number;
}

/** Peak hour heatmap entry */
export interface PeakHourEntry {
  readonly dayOfWeek: number;
  readonly hour: number;
  readonly orderCount: number;
  readonly averageRevenue: number;
}

/** Popular menu item summary */
export interface PopularItemSummary {
  readonly menuItemId: string;
  readonly name: string;
  readonly totalOrdered: number;
  readonly totalRevenue: number;
  readonly percentOfOrders: number;
  readonly trend: 'up' | 'down' | 'stable';
}

/** Partner analytics aggregate */
export interface PartnerAnalytics {
  readonly partnerId: string;
  readonly period: DashboardPeriod;
  readonly revenueData: ReadonlyArray<RevenueDataPoint>;
  readonly peakHours: ReadonlyArray<PeakHourEntry>;
  readonly popularItems: ReadonlyArray<PopularItemSummary>;
  readonly totalRevenue: number;
  readonly totalOrders: number;
  readonly averageOrderValue: number;
  readonly averageDeliveryTime: number;
  readonly customerSatisfaction: number;
  readonly returnCustomerRate: number;
  readonly cancellationRate: number;
}

/** WebSocket event types for real-time order updates */
export enum OrderWebSocketEvent {
  NEW_ORDER = 'new_order',
  ORDER_UPDATED = 'order_updated',
  ORDER_CANCELLED = 'order_cancelled',
  DRIVER_ASSIGNED = 'driver_assigned',
  DRIVER_ARRIVED = 'driver_arrived',
  ORDER_PICKED_UP = 'order_picked_up',
  ORDER_DELIVERED = 'order_delivered',
}

/** WebSocket message payload */
export interface OrderWebSocketMessage {
  readonly event: OrderWebSocketEvent;
  readonly order: PartnerOrder;
  readonly timestamp: string;
}

/** Partner settings configuration */
export interface PartnerSettings {
  readonly partnerId: string;
  readonly isOpen: boolean;
  readonly autoAcceptOrders: boolean;
  readonly estimatedPrepTimeMinutes: number;
  readonly minimumOrderAmount: number;
  readonly deliveryRadius: number;
  readonly maxConcurrentOrders: number;
  readonly openingHours: ReadonlyArray<OpeningHourSlot>;
  readonly pauseNewOrders: boolean;
  readonly notificationPreferences: NotificationPreferences;
}

/** Opening hour slot */
export interface OpeningHourSlot {
  readonly dayOfWeek: number;
  readonly openTime: string;
  readonly closeTime: string;
  readonly isOpen: boolean;
}

/** Notification preferences for partner */
export interface NotificationPreferences {
  readonly newOrderSound: boolean;
  readonly newOrderPush: boolean;
  readonly orderCancelledPush: boolean;
  readonly dailySummaryEmail: boolean;
  readonly weeklySummaryEmail: boolean;
}
