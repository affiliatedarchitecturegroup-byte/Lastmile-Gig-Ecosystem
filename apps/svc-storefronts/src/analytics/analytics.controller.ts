/**
 * Partner Analytics Controller (P185)
 *
 * Endpoints for partner dashboard analytics.
 *
 * - GET /v1/partners/:id/analytics           - Full analytics summary
 * - GET /v1/partners/:id/analytics/revenue   - Revenue breakdown
 * - GET /v1/partners/:id/analytics/popular   - Popular items ranked
 * - GET /v1/partners/:id/analytics/peak      - Peak hours heatmap data
 * - GET /v1/partners/:id/analytics/export    - Export CSV/PDF
 *
 * @module svc-storefronts/analytics/analytics.controller
 */

import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('partners/:partnerId/analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get full analytics summary for a partner' })
  @ApiParam({ name: 'partnerId', description: 'Partner UUID' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month', 'quarter', 'year'] })
  async getAnalyticsSummary(
    @Param('partnerId') partnerId: string,
    @Query('period') period?: string,
  ): Promise<unknown> {
    return this.analyticsService.getSummary(partnerId, period ?? 'today');
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue breakdown' })
  @ApiParam({ name: 'partnerId' })
  @ApiQuery({ name: 'period', required: false })
  async getRevenue(
    @Param('partnerId') partnerId: string,
    @Query('period') period?: string,
  ): Promise<unknown> {
    return this.analyticsService.getRevenueBreakdown(partnerId, period ?? 'month');
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular items ranked by order count' })
  @ApiParam({ name: 'partnerId' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPopularItems(
    @Param('partnerId') partnerId: string,
    @Query('limit') limit?: number,
  ): Promise<unknown> {
    return this.analyticsService.getPopularItems(partnerId, limit ?? 10);
  }

  @Get('peak')
  @ApiOperation({ summary: 'Get peak hours heatmap data' })
  @ApiParam({ name: 'partnerId' })
  async getPeakHours(
    @Param('partnerId') partnerId: string,
  ): Promise<unknown> {
    return this.analyticsService.getPeakHours(partnerId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export analytics data as CSV' })
  @ApiParam({ name: 'partnerId' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'pdf'] })
  @ApiQuery({ name: 'period', required: false })
  async exportAnalytics(
    @Param('partnerId') partnerId: string,
    @Query('format') format?: string,
    @Query('period') period?: string,
  ): Promise<unknown> {
    return this.analyticsService.exportData(
      partnerId,
      format ?? 'csv',
      period ?? 'month',
    );
  }
}
