/**
 * Menu Controller - REST API for menu management.
 *
 * Endpoints:
 * - GET    /v1/restaurants/:slug/menu     Full structured menu
 * - GET    /v1/restaurants/:slug/menu/search  Search menu items
 * - POST   /v1/partners/:id/menu/sync     Sanity webhook receiver
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.11
 * @module svc-storefronts
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MenuService, FullMenu } from '../services/menu.service';
import { RestaurantService } from '../services/restaurant.service';
import type { MenuItemDocument } from '../repositories/menu.repository';

@Controller()
export class MenuController {
  private readonly logger = new Logger(MenuController.name);

  constructor(
    private readonly menuService: MenuService,
    private readonly restaurantService: RestaurantService,
  ) {}

  /**
   * GET /v1/restaurants/:slug/menu - Full structured menu.
   */
  @Get('restaurants/:slug/menu')
  async getMenu(
    @Param('slug') slug: string,
  ): Promise<{ success: boolean; data: FullMenu }> {
    const restaurant = await this.restaurantService.getBySlug(slug);
    const menu = await this.menuService.getFullMenu(restaurant._id);
    return { success: true, data: menu };
  }

  /**
   * GET /v1/restaurants/:slug/menu/search - Search menu items.
   */
  @Get('restaurants/:slug/menu/search')
  async searchMenu(
    @Param('slug') slug: string,
    @Query('q') query: string,
  ): Promise<{ success: boolean; data: MenuItemDocument[] }> {
    const restaurant = await this.restaurantService.getBySlug(slug);
    const items = await this.menuService.searchItems(restaurant._id, query);
    return { success: true, data: items };
  }

  /**
   * POST /v1/partners/:id/menu/sync - Sanity CMS webhook receiver.
   * Called when menu items are updated in the Sanity Studio.
   */
  @Post('partners/:id/menu/sync')
  @HttpCode(HttpStatus.OK)
  async syncMenu(
    @Param('id') partnerId: string,
    @Body() payload: Record<string, unknown>,
  ): Promise<{ success: boolean; synced: number }> {
    this.logger.log(`Menu sync webhook received for partner ${partnerId}`);
    const restaurant = await this.restaurantService.getByPartnerId(partnerId);
    const result = await this.menuService.syncFromSanity(restaurant._id, payload);
    return { success: true, synced: result.synced };
  }
}
