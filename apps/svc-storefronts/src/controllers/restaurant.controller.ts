/**
 * Restaurant Controller - REST API for restaurant management.
 *
 * Endpoints:
 * - GET    /v1/restaurants           Directory listing with filters
 * - GET    /v1/restaurants/:slug     Single restaurant by slug
 * - POST   /v1/restaurants           Create restaurant
 * - PATCH  /v1/restaurants/:id       Update restaurant
 * - GET    /v1/restaurants/search    Search restaurants
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.11
 * @module svc-storefronts
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RestaurantService } from '../services/restaurant.service';
import type { RestaurantDocument } from '../repositories/restaurant.repository';

@Controller('restaurants')
export class RestaurantController {
  private readonly logger = new Logger(RestaurantController.name);

  constructor(private readonly restaurantService: RestaurantService) {}

  @Get()
  async listRestaurants(
    @Query('partnerType') partnerType?: string,
    @Query('cuisine') cuisine?: string,
    @Query('featured') featured?: string,
  ): Promise<{ success: boolean; data: RestaurantDocument[] }> {
    const restaurants = await this.restaurantService.listRestaurants({
      partnerType,
      cuisine,
      isActive: true,
      isFeatured: featured === 'true' ? true : undefined,
    });
    return { success: true, data: restaurants };
  }

  @Get('search')
  async search(
    @Query('q') query: string,
  ): Promise<{ success: boolean; data: RestaurantDocument[] }> {
    const results = await this.restaurantService.search(query);
    return { success: true, data: results };
  }

  @Get(':slug')
  async getBySlug(
    @Param('slug') slug: string,
  ): Promise<{ success: boolean; data: RestaurantDocument }> {
    const restaurant = await this.restaurantService.getBySlug(slug);
    return { success: true, data: restaurant };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: {
      partnerId: string;
      name: string;
      slug: string;
      description: string;
      partnerType: string;
      address: RestaurantDocument['address'];
      phone?: string;
      email?: string;
    },
  ): Promise<{ success: boolean; data: RestaurantDocument }> {
    this.logger.log(`Creating restaurant: ${body.name}`);
    const restaurant = await this.restaurantService.create(body);
    return { success: true, data: restaurant };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<RestaurantDocument>,
  ): Promise<{ success: boolean; data: RestaurantDocument }> {
    const restaurant = await this.restaurantService.update(id, body);
    return { success: true, data: restaurant };
  }
}
