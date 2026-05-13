/**
 * Update Order Status DTO - Request validation for order status transitions.
 *
 * Enforces valid status transitions per the order lifecycle state machine:
 * placed -> confirmed -> dispatched -> picked_up -> in_transit -> delivered
 * Any state -> cancelled (with reason)
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.4
 * @module svc-orders
 */

import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum OrderStatusDto {
  PLACED = 'placed',
  CONFIRMED = 'confirmed',
  DISPATCHED = 'dispatched',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/**
 * Valid state transitions for the order lifecycle.
 * Key is the current status, value is an array of valid next statuses.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatusDto, OrderStatusDto[]> = {
  [OrderStatusDto.PLACED]: [OrderStatusDto.CONFIRMED, OrderStatusDto.CANCELLED],
  [OrderStatusDto.CONFIRMED]: [OrderStatusDto.DISPATCHED, OrderStatusDto.CANCELLED],
  [OrderStatusDto.DISPATCHED]: [OrderStatusDto.PICKED_UP, OrderStatusDto.CANCELLED],
  [OrderStatusDto.PICKED_UP]: [OrderStatusDto.IN_TRANSIT, OrderStatusDto.CANCELLED],
  [OrderStatusDto.IN_TRANSIT]: [OrderStatusDto.DELIVERED, OrderStatusDto.CANCELLED],
  [OrderStatusDto.DELIVERED]: [OrderStatusDto.REFUNDED],
  [OrderStatusDto.CANCELLED]: [],
  [OrderStatusDto.REFUNDED]: [],
};

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatusDto)
  status!: OrderStatusDto;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;

  @IsString()
  @IsOptional()
  driverId?: string;
}
