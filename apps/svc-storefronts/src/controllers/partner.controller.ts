/**
 * Partner Controller - REST API for partner-facing operations.
 *
 * Endpoints:
 * - GET    /v1/partners/:id/analytics    Partner analytics
 * - GET    /v1/partners/:id/orders/today Today's order count
 * - GET    /v1/partners/:id/top-items    Top-selling items
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.11
 * @module svc-storefronts
 */

import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { PartnerAnalyticsService, PartnerAnalytics } from '../services/partner-analytics.service';

@Controller('partners')
export class PartnerController {
  private readonly logger = new Logger(PartnerController.name);

  constructor(private readonly analyticsService: PartnerAnalyticsService) {}

  @Get(':id/analytics')
  async getAnalytics(
    @Param('id') partnerId: string,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
  ): Promise<{ success: boolean; data: PartnerAnalytics }> {
    const analytics = await this.analyticsService.getAnalytics(partnerId, fromDate, toDate);
    return { success: true, data: analytics };
  }

  @Get(':id/orders/today')
  async getTodayOrders(
    @Param('id') partnerId: string,
  ): Promise<{ success: boolean; data: { count: number } }> {
    const count = await this.analyticsService.getTodayOrderCount(partnerId);
    return { success: true, data: { count } };
  }

  @Get(':id/top-items')
  async getTopItems(
    @Param('id') partnerId: string,
    @Query('limit') limit?: string,
  ): Promise<{ success: boolean; data: Array<{ name: string; quantity: number; revenue: number }> }> {
    const items = await this.analyticsService.getTopItems(partnerId, limit ? parseInt(limit, 10) : 10);
    return { success: true, data: items };
  }
}
