/**
 * Order Controller - REST API endpoints for order lifecycle management.
 *
 * Exposes the following endpoints:
 * - POST   /v1/orders                      Place a new order
 * - GET    /v1/orders/:id                   Get order by ID
 * - PATCH  /v1/orders/:id/status            Update order status
 * - POST   /v1/orders/:id/verify-delivery   Verify delivery with GPS + photo
 * - GET    /v1/orders/customer/:customerId  Customer order history
 * - GET    /v1/orders/driver/:driverId      Driver order history
 * - GET    /v1/orders/:id/events            Order event history (audit)
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.4
 * @module svc-orders
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Logger,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { PlaceOrderRequestDto } from './dto/place-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import type { Order } from '@lastmile-gig/shared-types';

/** DTO for delivery verification request body */
interface VerifyDeliveryBody {
  latitude: number;
  longitude: number;
  photoHash: string;
  driverId: string;
}

@Controller('orders')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {}

  /**
   * POST /v1/orders - Place a new order.
   *
   * Accepts order details, calculates totals, persists to database,
   * and triggers dispatch via Kafka event.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async placeOrder(
    @Body() dto: PlaceOrderRequestDto,
    @Query('customerId') customerId: string,
  ): Promise<{ success: boolean; data: Order }> {
    this.logger.log(`POST /orders - customerId=${customerId}`);
    const order = await this.orderService.placeOrder(customerId, dto);
    return { success: true, data: order };
  }

  /**
   * GET /v1/orders/:id - Get a single order by UUID.
   */
  @Get(':id')
  async getOrder(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: Order }> {
    const order = await this.orderService.getOrder(id);
    return { success: true, data: order };
  }

  /**
   * PATCH /v1/orders/:id/status - Update order status.
   *
   * Validates state machine transitions before applying.
   * Publishes appropriate Kafka events on status change.
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<{ success: boolean; data: Order }> {
    this.logger.log(`PATCH /orders/${id}/status -> ${dto.status}`);
    const order = await this.orderService.updateStatus(id, dto);
    return { success: true, data: order };
  }

  /**
   * POST /v1/orders/:id/verify-delivery - Verify delivery with GPS + photo.
   *
   * Validates that the driver is within 100m of the delivery address.
   * On success, triggers blockchain proof-of-delivery recording.
   */
  @Post(':id/verify-delivery')
  @HttpCode(HttpStatus.OK)
  async verifyDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: VerifyDeliveryBody,
  ): Promise<{ success: boolean; data: { verified: boolean; distanceMeters: number } }> {
    this.logger.log(`POST /orders/${id}/verify-delivery`);
    const result = await this.orderService.verifyDelivery(id, body.driverId, {
      latitude: body.latitude,
      longitude: body.longitude,
      photoHash: body.photoHash,
    });
    return { success: true, data: result };
  }

  /**
   * GET /v1/orders/customer/:customerId - Customer order history with pagination.
   */
  @Get('customer/:customerId')
  async getCustomerOrders(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ): Promise<{
    success: boolean;
    data: Order[];
    meta: { page: number; pageSize: number; total: number };
  }> {
    const { orders, total } = await this.orderService.getCustomerOrders(
      customerId,
      page,
      pageSize,
    );
    return {
      success: true,
      data: orders,
      meta: { page, pageSize, total },
    };
  }

  /**
   * GET /v1/orders/driver/:driverId - Driver order history with pagination.
   */
  @Get('driver/:driverId')
  async getDriverOrders(
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ): Promise<{
    success: boolean;
    data: Order[];
    meta: { page: number; pageSize: number; total: number };
  }> {
    const { orders, total } = await this.orderService.getDriverOrders(
      driverId,
      page,
      pageSize,
    );
    return {
      success: true,
      data: orders,
      meta: { page, pageSize, total },
    };
  }

  /**
   * GET /v1/orders/:id/events - Order event history for audit trail.
   */
  @Get(':id/events')
  async getOrderEvents(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: unknown[] }> {
    const events = await this.orderService.getOrderEventHistory(id);
    return { success: true, data: events };
  }
}
