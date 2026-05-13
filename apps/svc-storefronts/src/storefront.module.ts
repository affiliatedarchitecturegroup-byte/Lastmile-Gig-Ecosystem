/**
 * Storefront Module - Root module for the Storefront Service.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.11
 * @module svc-storefronts
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RestaurantController } from './controllers/restaurant.controller';
import { MenuController } from './controllers/menu.controller';
import { PartnerController } from './controllers/partner.controller';
import { RestaurantService } from './services/restaurant.service';
import { MenuService } from './services/menu.service';
import { PartnerAnalyticsService } from './services/partner-analytics.service';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { MenuRepository } from './repositories/menu.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  controllers: [RestaurantController, MenuController, PartnerController],
  providers: [
    RestaurantService,
    MenuService,
    PartnerAnalyticsService,
    RestaurantRepository,
    MenuRepository,
  ],
  exports: [RestaurantService, MenuService],
})
export class StorefrontModule {}
