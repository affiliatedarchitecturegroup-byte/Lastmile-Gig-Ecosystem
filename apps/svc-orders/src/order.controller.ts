/**
 * Order Controller
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.4
 */

import { Controller, Post, Get, Patch, Param, Body, Logger } from '@nestjs/common';
import { OrderService } from './order.service';
import type { PlaceOrderDto, Order, OrderStatus } from '@lastmile-gig/shared-types';

@Controller('orders')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {}

  @Post()
  async placeOrder(@Body() dto: PlaceOrderDto): Promise<{ orderId: string }> {
    this.logger.log('New order placement');
    return this.orderService.placeOrder(dto);
  }

  @Get(':id')
  async getOrder(@Param('id') id: string): Promise<Order | null> {
    return this.orderService.getOrder(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: OrderStatus },
  ): Promise<{ success: boolean }> {
    return this.orderService.updateStatus(id, body.status);
  }

  @Post(':id/verify-delivery')
  async verifyDelivery(
    @Param('id') id: string,
    @Body() body: { latitude: number; longitude: number; photoHash: string },
  ): Promise<{ verified: boolean }> {
    return this.orderService.verifyDelivery(id, body);
  }

  @Get('customer/:customerId')
  async getCustomerOrders(@Param('customerId') customerId: string): Promise<Order[]> {
    return this.orderService.getCustomerOrders(customerId);
  }
}
