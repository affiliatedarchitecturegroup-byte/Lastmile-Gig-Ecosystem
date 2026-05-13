/**
 * Menu Service - Business logic for menu management.
 *
 * Handles menu CRUD, Sanity webhook sync, and menu querying.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.11
 * @module svc-storefronts
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  MenuRepository,
  MenuCategoryDocument,
  MenuItemDocument,
} from '../repositories/menu.repository';

export interface FullMenu {
  categories: Array<
    MenuCategoryDocument & { items: MenuItemDocument[] }
  >;
  popularItems: MenuItemDocument[];
  totalItems: number;
}

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(private readonly repository: MenuRepository) {}

  /**
   * Get the full structured menu for a restaurant.
   * Categories with their items, plus popular items.
   */
  async getFullMenu(restaurantId: string): Promise<FullMenu> {
    const [categories, allItems, popularItems] = await Promise.all([
      this.repository.findCategoriesByRestaurant(restaurantId),
      this.repository.findItemsByRestaurant(restaurantId),
      this.repository.findPopularItems(restaurantId),
    ]);

    const categorisedMenu = categories.map((cat) => ({
      ...cat,
      items: allItems.filter((item) => item.categoryId === cat._id),
    }));

    return {
      categories: categorisedMenu,
      popularItems,
      totalItems: allItems.length,
    };
  }

  /**
   * Get items in a specific category.
   */
  async getItemsByCategory(categoryId: string): Promise<MenuItemDocument[]> {
    return this.repository.findItemsByCategory(categoryId);
  }

  /**
   * Search menu items within a restaurant.
   */
  async searchItems(restaurantId: string, query: string): Promise<MenuItemDocument[]> {
    return this.repository.searchItems(restaurantId, query);
  }

  /**
   * Handle Sanity CMS webhook for menu sync.
   * When menu items are updated in Sanity, this method syncs to MongoDB.
   */
  async syncFromSanity(
    restaurantId: string,
    sanityPayload: Record<string, unknown>,
  ): Promise<{ synced: number }> {
    this.logger.log(`Syncing menu from Sanity for restaurant ${restaurantId}`);

    const items = sanityPayload['items'] as Array<Record<string, unknown>> | undefined;
    if (!items || items.length === 0) {
      return { synced: 0 };
    }

    const menuItems: MenuItemDocument[] = items.map((item) => ({
      _id: (item['_id'] as string) ?? '',
      restaurantId,
      categoryId: (item['categoryId'] as string) ?? '',
      categoryName: (item['categoryName'] as string) ?? '',
      name: (item['name'] as string) ?? '',
      slug: (item['slug'] as string) ?? '',
      description: (item['description'] as string) ?? null,
      price: (item['price'] as number) ?? 0,
      discountPrice: (item['discountPrice'] as number) ?? null,
      imageUrl: (item['imageUrl'] as string) ?? null,
      cloudinaryUrl: (item['cloudinaryUrl'] as string) ?? null,
      tags: (item['tags'] as string[]) ?? [],
      allergens: (item['allergens'] as string[]) ?? [],
      dietaryFlags: (item['dietaryFlags'] as string[]) ?? [],
      preparationTime: (item['preparationTime'] as number) ?? 15,
      isAvailable: (item['isAvailable'] as boolean) ?? true,
      isPopular: (item['isPopular'] as boolean) ?? false,
      sortOrder: (item['sortOrder'] as number) ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const synced = await this.repository.bulkUpsertItems(menuItems);
    this.logger.log(`Synced ${synced} menu items for restaurant ${restaurantId}`);

    return { synced };
  }
}
