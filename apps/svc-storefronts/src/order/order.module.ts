/**
 * Storefront Order Module (P184)
 *
 * Handles order placement from restaurant storefronts.
 * Orders are validated, priced, and published to Kafka
 * for processing by the main svc-orders service.
 *
 * @module svc-storefronts/order/order.module
 */

import { Module } from '@nestjs/common';

import { StorefrontOrderController } from './order.controller';
import { StorefrontOrderService } from './order.service';

@Module({
  controllers: [StorefrontOrderController],
  providers: [StorefrontOrderService],
  exports: [StorefrontOrderService],
})
export class OrderModule {}
