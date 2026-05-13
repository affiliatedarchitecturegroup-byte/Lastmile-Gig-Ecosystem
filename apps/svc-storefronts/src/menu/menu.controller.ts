/**
 * Menu Controller (P183)
 *
 * REST API endpoints for menu management.
 *
 * Endpoints:
 * - GET    /v1/restaurants/:slug/menu          - Full menu with categories
 * - GET    /v1/restaurants/:slug/menu/:catSlug  - Category-filtered items
 * - GET    /v1/menu/items/:id                   - Single menu item detail
 * - POST   /v1/menu/categories                  - Create category (partner)
 * - POST   /v1/menu/items                       - Create menu item (partner)
 * - PATCH  /v1/menu/items/:id                   - Update menu item
 * - PATCH  /v1/menu/items/:id/availability      - Toggle item availability
 * - GET    /v1/menu/search                      - Search menu items across restaurants
 *
 * @module svc-storefronts/menu/menu.controller
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

import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';

@ApiTags('menus')
@Controller()
export class MenuController {
  private readonly logger = new Logger(MenuController.name);

  constructor(private readonly menuService: MenuService) {}

  @Get('restaurants/:slug/menu')
  @ApiOperation({ summary: 'Get full menu for a restaurant by slug' })
  @ApiParam({ name: 'slug', description: 'Restaurant URL slug' })
  async getFullMenu(@Param('slug') slug: string): Promise<unknown> {
    return this.menuService.getFullMenu(slug);
  }

  @Get('restaurants/:slug/menu/:categorySlug')
  @ApiOperation({ summary: 'Get menu items filtered by category' })
  @ApiParam({ name: 'slug', description: 'Restaurant URL slug' })
  @ApiParam({ name: 'categorySlug', description: 'Menu category slug' })
  async getMenuByCategory(
    @Param('slug') slug: string,
    @Param('categorySlug') categorySlug: string,
  ): Promise<unknown> {
    return this.menuService.getMenuByCategory(slug, categorySlug);
  }

  @Get('menu/items/:id')
  @ApiOperation({ summary: 'Get a single menu item by ID' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  async getMenuItem(@Param('id') id: string): Promise<unknown> {
    return this.menuService.getMenuItemById(id);
  }

  @Get('menu/search')
  @ApiOperation({ summary: 'Search menu items across all restaurants' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'cuisine', required: false })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'isVegetarian', required: false, type: Boolean })
  @ApiQuery({ name: 'isVegan', required: false, type: Boolean })
  @ApiQuery({ name: 'isHalal', required: false, type: Boolean })
  async searchMenuItems(
    @Query('q') query: string,
    @Query('cuisine') cuisine?: string,
    @Query('maxPrice') maxPrice?: number,
    @Query('isVegetarian') isVegetarian?: boolean,
    @Query('isVegan') isVegan?: boolean,
    @Query('isHalal') isHalal?: boolean,
  ): Promise<unknown> {
    return this.menuService.searchItems({
      query, cuisine, maxPrice, isVegetarian, isVegan, isHalal,
    });
  }

  @Post('menu/categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a menu category (partner)' })
  async createCategory(@Body() dto: CreateMenuCategoryDto): Promise<unknown> {
    this.logger.log(`Creating menu category: ${dto.name}`);
    return this.menuService.createCategory(dto);
  }

  @Post('menu/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a menu item (partner)' })
  async createMenuItem(@Body() dto: CreateMenuItemDto): Promise<unknown> {
    this.logger.log(`Creating menu item: ${dto.name}`);
    return this.menuService.createItem(dto);
  }

  @Patch('menu/items/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  async updateMenuItem(
    @Param('id') id: string,
    @Body() dto: Partial<CreateMenuItemDto>,
  ): Promise<unknown> {
    return this.menuService.updateItem(id, dto);
  }

  @Patch('menu/items/:id/availability')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle menu item availability' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  async toggleAvailability(
    @Param('id') id: string,
    @Body() body: { isAvailable: boolean },
  ): Promise<unknown> {
    return this.menuService.toggleItemAvailability(id, body.isAvailable);
  }
}
