/**
 * Menu Service (P183)
 *
 * Business logic for menu categories and items.
 * Data stored in MongoDB Atlas `menu_categories` and `menu_items` collections.
 *
 * @module svc-storefronts/menu/menu.service
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';

interface MenuCategoryDoc {
  _id: string;
  restaurantId: string;
  sanityId: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  availableFrom: string | null;
  availableUntil: string | null;
}

interface MenuItemDoc {
  _id: string;
  restaurantId: string;
  categoryId: string;
  sanityId: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  images: Array<Record<string, unknown>>;
  allergens: string[];
  isVegetarian: boolean;
  isVegan: boolean;
  isHalal: boolean;
  isSpicy: boolean;
  spiceLevel: number | null;
  options: Array<Record<string, unknown>>;
  preparationTime: number;
  isAvailable: boolean;
  displayOrder: number;
  orderCount: number;
}

interface FullMenu {
  restaurant: { id: string; name: string; slug: string };
  categories: Array<MenuCategoryDoc & { items: MenuItemDoc[] }>;
}

interface SearchParams {
  query: string;
  cuisine?: string;
  maxPrice?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
}

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  /**
   * Get full menu for a restaurant (categories + items), sorted by displayOrder.
   */
  async getFullMenu(restaurantSlug: string): Promise<FullMenu> {
    this.logger.debug(`Getting full menu for restaurant: ${restaurantSlug}`);

    // MongoDB aggregation pipeline:
    // 1. Find restaurant by slug
    // 2. Lookup categories for restaurant, sorted by displayOrder
    // 3. Lookup items per category, sorted by displayOrder
    // 4. Filter out inactive categories and unavailable items

    // Placeholder return
    return {
      restaurant: { id: '', name: '', slug: restaurantSlug },
      categories: [],
    };
  }

  /**
   * Get menu items filtered by category slug.
   */
  async getMenuByCategory(
    restaurantSlug: string,
    categorySlug: string,
  ): Promise<MenuItemDoc[]> {
    this.logger.debug(
      `Getting menu for ${restaurantSlug}, category: ${categorySlug}`,
    );

    // Placeholder: MongoDB find with category filter
    return [];
  }

  /**
   * Get a single menu item by ID.
   */
  async getMenuItemById(id: string): Promise<MenuItemDoc> {
    this.logger.debug(`Getting menu item: ${id}`);

    const item = null as MenuItemDoc | null;
    if (!item) {
      throw new NotFoundException(`Menu item '${id}' not found`);
    }
    return item;
  }

  /**
   * Search menu items across all restaurants.
   * Uses MongoDB text search or OpenSearch for full-text search.
   */
  async searchItems(params: SearchParams): Promise<MenuItemDoc[]> {
    this.logger.debug(`Searching menu items: "${params.query}"`);

    // Build filter pipeline
    const filter: Record<string, unknown> = {
      isAvailable: true,
      $text: { $search: params.query },
    };

    if (params.maxPrice) {
      filter['price'] = { $lte: params.maxPrice };
    }
    if (params.isVegetarian) {
      filter['isVegetarian'] = true;
    }
    if (params.isVegan) {
      filter['isVegan'] = true;
    }
    if (params.isHalal) {
      filter['isHalal'] = true;
    }

    // Placeholder: MongoDB text search or OpenSearch query
    return [];
  }

  /**
   * Create a menu category.
   */
  async createCategory(dto: CreateMenuCategoryDto): Promise<MenuCategoryDoc> {
    this.logger.log(`Creating category: ${dto.name}`);

    const doc: MenuCategoryDoc = {
      _id: crypto.randomUUID(),
      restaurantId: dto.restaurantId,
      sanityId: '',
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      displayOrder: dto.displayOrder ?? 0,
      isActive: true,
      availableFrom: dto.availableFrom ?? null,
      availableUntil: dto.availableUntil ?? null,
    };

    // Placeholder: MongoDB insertOne
    return doc;
  }

  /**
   * Create a menu item.
   */
  async createItem(dto: CreateMenuItemDto): Promise<MenuItemDoc> {
    this.logger.log(`Creating item: ${dto.name}`);

    const doc: MenuItemDoc = {
      _id: crypto.randomUUID(),
      restaurantId: dto.restaurantId,
      categoryId: dto.categoryId,
      sanityId: '',
      name: dto.name,
      slug: dto.slug ?? dto.name.toLowerCase().replace(/\s+/g, '-'),
      description: dto.description ?? null,
      price: dto.price,
      images: [],
      allergens: dto.allergens ?? [],
      isVegetarian: dto.isVegetarian ?? false,
      isVegan: dto.isVegan ?? false,
      isHalal: dto.isHalal ?? false,
      isSpicy: dto.isSpicy ?? false,
      spiceLevel: dto.spiceLevel ?? null,
      options: [],
      preparationTime: dto.preparationTime ?? 15,
      isAvailable: true,
      displayOrder: dto.displayOrder ?? 0,
      orderCount: 0,
    };

    // Placeholder: MongoDB insertOne
    return doc;
  }

  /**
   * Update a menu item.
   */
  async updateItem(id: string, dto: Partial<CreateMenuItemDto>): Promise<MenuItemDoc> {
    this.logger.log(`Updating item: ${id}`);

    const updated = null as MenuItemDoc | null;
    if (!updated) {
      throw new NotFoundException(`Menu item '${id}' not found`);
    }
    return updated;
  }

  /**
   * Toggle item availability (quick on/off for sold-out items).
   */
  async toggleItemAvailability(id: string, isAvailable: boolean): Promise<MenuItemDoc> {
    this.logger.log(`Setting item ${id} availability to: ${isAvailable}`);

    const updated = null as MenuItemDoc | null;
    if (!updated) {
      throw new NotFoundException(`Menu item '${id}' not found`);
    }
    return updated;
  }

  /**
   * Sync menu data from Sanity webhook.
   */
  async syncMenuFromSanity(
    sanityId: string,
    docType: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    this.logger.log(`Syncing menu ${docType} from Sanity: ${sanityId}`);
    // Upsert to MongoDB based on docType (menuCategory or menuItem)
  }
}
