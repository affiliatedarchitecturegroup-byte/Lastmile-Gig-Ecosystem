/**
 * Storefront Order Controller (P184)
 *
 * Handles order placement from restaurant storefronts.
 *
 * Endpoints:
 * - POST /v1/restaurants/:slug/orders  - Place a new order
 * - GET  /v1/orders/:id                - Get order status
 *
 * Flow:
 * 1. Customer submits order via storefront checkout
 * 2. Validate items exist and are available
 * 3. Calculate pricing (subtotal + delivery fee + service fee)
 * 4. Publish order.placed event to Kafka
 * 5. Return order confirmation with tracking URL
 *
 * @module svc-storefronts/order/order.controller
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';

import { StorefrontOrderService } from './order.service';
import { PlaceOrderDto } from './dto/place-order.dto';

@ApiTags('orders')
@Controller()
export class StorefrontOrderController {
  private readonly logger = new Logger(StorefrontOrderController.name);

  constructor(private readonly orderService: StorefrontOrderService) {}

  @Post('restaurants/:slug/orders')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Place a new order from a restaurant storefront' })
  @ApiParam({ name: 'slug', description: 'Restaurant URL slug' })
  async placeOrder(
    @Param('slug') slug: string,
    @Body() dto: PlaceOrderDto,
  ): Promise<unknown> {
    this.logger.log(`Order placed for restaurant: ${slug}`);
    return this.orderService.placeOrder(slug, dto);
  }

  @Get('orders/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order status by ID' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async getOrderStatus(@Param('id') id: string): Promise<unknown> {
    return this.orderService.getOrderStatus(id);
  }
}
