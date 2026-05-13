/**
 * Storefront Service - Root Module (P180)
 *
 * Registers all feature modules for the storefront microservice:
 * - RestaurantModule: Restaurant CRUD + Sanity sync
 * - MenuModule: Menu categories and items
 * - OrderModule: Storefront order placement
 * - AnalyticsModule: Partner analytics
 * - WebhookModule: Sanity CMS webhooks
 * - HealthModule: Kubernetes probes
 *
 * @module svc-storefronts/storefront.module
 */

import { Module } from '@nestjs/common';

import { RestaurantModule } from './restaurant/restaurant.module';
import { MenuModule } from './menu/menu.module';
import { OrderModule } from './order/order.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WebhookModule } from './webhook/webhook.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    RestaurantModule,
    MenuModule,
    OrderModule,
    AnalyticsModule,
    WebhookModule,
    HealthModule,
  ],
})
export class StorefrontModule {}
