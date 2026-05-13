/**
 * Restaurant Controller (P181)
 *
 * REST API endpoints for restaurant management and discovery.
 *
 * Endpoints:
 * - GET    /v1/restaurants              - List/search restaurants
 * - GET    /v1/restaurants/:slug        - Get restaurant by slug
 * - POST   /v1/restaurants              - Create restaurant (admin/partner)
 * - PATCH  /v1/restaurants/:id          - Update restaurant
 * - GET    /v1/restaurants/:slug/menu   - Get full menu for a restaurant
 * - GET    /v1/restaurants/featured     - Get featured restaurants
 * - GET    /v1/restaurants/nearby       - Get nearby restaurants by geo
 *
 * @module svc-storefronts/restaurant/restaurant.controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { ListRestaurantsQueryDto } from './dto/list-restaurants-query.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantController {
  private readonly logger = new Logger(RestaurantController.name);

  constructor(private readonly restaurantService: RestaurantService) {}

  @Get()
  @ApiOperation({ summary: 'List restaurants with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cuisine', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isOpen', required: false, type: Boolean })
  async listRestaurants(
    @Query() query: ListRestaurantsQueryDto,
  ): Promise<unknown> {
    this.logger.debug(`Listing restaurants with query: ${JSON.stringify(query)}`);
    return this.restaurantService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured restaurants' })
  async getFeatured(): Promise<unknown> {
    return this.restaurantService.findFeatured();
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby restaurants by geo coordinates' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
  async getNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radiusKm') radiusKm?: number,
  ): Promise<unknown> {
    return this.restaurantService.findNearby(lat, lng, radiusKm ?? 10);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get restaurant by URL slug' })
  @ApiParam({ name: 'slug', description: 'Restaurant URL slug' })
  async getBySlug(@Param('slug') slug: string): Promise<unknown> {
    return this.restaurantService.findBySlug(slug);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new restaurant (admin/partner)' })
  async create(@Body() dto: CreateRestaurantDto): Promise<unknown> {
    this.logger.log(`Creating restaurant: ${dto.name}`);
    return this.restaurantService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update restaurant details' })
  @ApiParam({ name: 'id', description: 'Restaurant UUID' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto,
  ): Promise<unknown> {
    this.logger.log(`Updating restaurant: ${id}`);
    return this.restaurantService.update(id, dto);
  }
}
