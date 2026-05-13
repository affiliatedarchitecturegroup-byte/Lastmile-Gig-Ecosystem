/**
 * Restaurant Module (P181)
 *
 * Handles restaurant CRUD operations, Sanity CMS synchronization,
 * and restaurant discovery/search.
 *
 * @module svc-storefronts/restaurant/restaurant.module
 */

import { Module } from '@nestjs/common';

import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';

@Module({
  controllers: [RestaurantController],
  providers: [RestaurantService],
  exports: [RestaurantService],
})
export class RestaurantModule {}
