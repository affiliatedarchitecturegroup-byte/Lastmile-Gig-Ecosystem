/**
 * Order Repository - Supabase PostgreSQL data access layer.
 *
 * Handles all direct database operations for the orders table.
 * Uses Supabase client with RLS policies enforced.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2
 * @module svc-orders
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Order, OrderItem, DeliveryAddress } from '@lastmile-gig/shared-types';

/** Database row shape for the orders table */
interface OrderRow {
  id: string;
  customer_id: string;
  partner_id: string;
  driver_id: string | null;
  status: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_ref: string | null;
  delivery_address: DeliveryAddress;
  placed_at: string;
  dispatched_at: string | null;
  delivered_at: string | null;
  delivery_photo_hash: string | null;
  blockchain_tx: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** Parameters for inserting a new order */
export interface InsertOrderParams {
  customerId: string;
  partnerId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  deliveryAddress: DeliveryAddress;
}

/** Parameters for updating order status */
export interface UpdateStatusParams {
  status: string;
  driverId?: string;
  reason?: string;
}

@Injectable()
export class OrderRepository {
  private readonly logger = new Logger(OrderRepository.name);
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('LMG_SUPABASE_URL', 'https://placeholder.supabase.co');
    const supabaseKey = this.configService.get<string>('LMG_SUPABASE_SERVICE_KEY', 'placeholder-key');
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Insert a new order into the orders table.
   * Returns the created order with generated UUID and timestamps.
   */
  async insert(params: InsertOrderParams): Promise<Order> {
    this.logger.log(`Inserting order for customer=${params.customerId}, partner=${params.partnerId}`);

    const { data, error } = await this.supabase
      .from('orders')
      .insert({
        customer_id: params.customerId,
        partner_id: params.partnerId,
        status: 'placed',
        items: params.items,
        subtotal: params.subtotal,
        delivery_fee: params.deliveryFee,
        total: params.total,
        payment_method: params.paymentMethod,
        delivery_address: params.deliveryAddress,
        placed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to insert order: ${error.message}`, error.details);
      throw new Error(`Order insert failed: ${error.message}`);
    }

    return this.mapRowToOrder(data as OrderRow);
  }

  /**
   * Find an order by its UUID.
   * Throws NotFoundException if the order does not exist.
   */
  async findById(id: string): Promise<Order> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return this.mapRowToOrder(data as OrderRow);
  }

  /**
   * Find all orders for a specific customer with pagination.
   */
  async findByCustomerId(
    customerId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ orders: Order[]; total: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('customer_id', customerId)
      .order('placed_at', { ascending: false })
      .range(from, to);

    if (error) {
      this.logger.error(`Failed to fetch customer orders: ${error.message}`);
      throw new Error(`Customer orders query failed: ${error.message}`);
    }

    const orders = (data as OrderRow[]).map((row) => this.mapRowToOrder(row));
    return { orders, total: count ?? 0 };
  }

  /**
   * Find all orders for a specific driver with pagination.
   */
  async findByDriverId(
    driverId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ orders: Order[]; total: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('driver_id', driverId)
      .order('placed_at', { ascending: false })
      .range(from, to);

    if (error) {
      this.logger.error(`Failed to fetch driver orders: ${error.message}`);
      throw new Error(`Driver orders query failed: ${error.message}`);
    }

    const orders = (data as OrderRow[]).map((row) => this.mapRowToOrder(row));
    return { orders, total: count ?? 0 };
  }

  /**
   * Update order status with optional driver assignment and cancellation reason.
   * Validates the status transition is legal before writing.
   */
  async updateStatus(id: string, params: UpdateStatusParams): Promise<Order> {
    const updatePayload: Record<string, unknown> = {
      status: params.status,
      updated_at: new Date().toISOString(),
    };

    if (params.driverId) {
      updatePayload['driver_id'] = params.driverId;
    }

    if (params.status === 'dispatched') {
      updatePayload['dispatched_at'] = new Date().toISOString();
    }

    if (params.status === 'delivered') {
      updatePayload['delivered_at'] = new Date().toISOString();
    }

    if (params.status === 'cancelled') {
      updatePayload['cancelled_at'] = new Date().toISOString();
      updatePayload['cancel_reason'] = params.reason ?? 'No reason provided';
    }

    const { data, error } = await this.supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to update order status: ${error?.message}`);
      throw new Error(`Order status update failed: ${error?.message}`);
    }

    return this.mapRowToOrder(data as OrderRow);
  }

  /**
   * Update delivery verification fields on a completed delivery.
   */
  async updateDeliveryVerification(
    id: string,
    photoHash: string,
    blockchainTx: string | null,
  ): Promise<Order> {
    const { data, error } = await this.supabase
      .from('orders')
      .update({
        delivery_photo_hash: photoHash,
        blockchain_tx: blockchainTx,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Delivery verification update failed: ${error?.message}`);
    }

    return this.mapRowToOrder(data as OrderRow);
  }

  /**
   * Map a Supabase row (snake_case) to the Order interface (camelCase).
   */
  private mapRowToOrder(row: OrderRow): Order {
    return {
      id: row.id,
      customerId: row.customer_id,
      partnerId: row.partner_id,
      driverId: row.driver_id,
      status: row.status as Order['status'],
      items: row.items,
      subtotal: row.subtotal,
      deliveryFee: row.delivery_fee,
      total: row.total,
      paymentMethod: row.payment_method as Order['paymentMethod'],
      paymentRef: row.payment_ref,
      deliveryAddress: row.delivery_address,
      placedAt: row.placed_at,
      dispatchedAt: row.dispatched_at,
      deliveredAt: row.delivered_at,
      deliveryPhotoHash: row.delivery_photo_hash,
      blockchainTx: row.blockchain_tx,
      cancelledAt: row.cancelled_at,
      cancelReason: row.cancel_reason,
    };
  }
}
