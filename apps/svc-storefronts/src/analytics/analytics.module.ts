/**
 * Partner Analytics Module (P185)
 *
 * Provides analytics endpoints for restaurant partners.
 * Aggregates order, revenue, and performance data from MongoDB.
 *
 * @module svc-storefronts/analytics/analytics.module
 */

import { Module } from '@nestjs/common';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
