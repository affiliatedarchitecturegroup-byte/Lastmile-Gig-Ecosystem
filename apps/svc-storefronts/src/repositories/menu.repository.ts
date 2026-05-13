/**
 * Menu Repository - MongoDB data access for menu items and categories.
 *
 * Menus are synced from Sanity CMS via webhook and stored in MongoDB
 * for fast query performance on the storefront pages.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 3.2
 * @module svc-storefronts
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Collection, Db } from 'mongodb';

export interface MenuCategoryDocument {
  _id: string;
  restaurantId: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuItemDocument {
  _id: string;
  restaurantId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discountPrice: number | null;
  imageUrl: string | null;
  cloudinaryUrl: string | null;
  tags: string[];
  allergens: string[];
  dietaryFlags: string[];
  preparationTime: number;
  isAvailable: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class MenuRepository implements OnModuleDestroy {
  private readonly logger = new Logger(MenuRepository.name);
  private readonly client: MongoClient;
  private readonly db: Db;
  private readonly categories: Collection<MenuCategoryDocument>;
  private readonly items: Collection<MenuItemDocument>;

  constructor(private readonly configService: ConfigService) {
    const mongoUri = this.configService.get<string>('LMG_MONGODB_URI', 'mongodb://localhost:27017');
    const dbName = this.configService.get<string>('LMG_MONGODB_DB', 'lastmilegig');

    this.client = new MongoClient(mongoUri);
    this.db = this.client.db(dbName);
    this.categories = this.db.collection<MenuCategoryDocument>('menu_categories');
    this.items = this.db.collection<MenuItemDocument>('menu_items');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  // --- Categories ---

  async findCategoriesByRestaurant(restaurantId: string): Promise<MenuCategoryDocument[]> {
    return this.categories
      .find({ restaurantId, isActive: true })
      .sort({ sortOrder: 1 })
      .toArray();
  }

  async upsertCategory(doc: MenuCategoryDocument): Promise<void> {
    await this.categories.updateOne(
      { _id: doc._id },
      { $set: doc },
      { upsert: true },
    );
  }

  // --- Items ---

  async findItemsByRestaurant(restaurantId: string): Promise<MenuItemDocument[]> {
    return this.items
      .find({ restaurantId, isAvailable: true })
      .sort({ categoryName: 1, sortOrder: 1 })
      .toArray();
  }

  async findItemsByCategory(categoryId: string): Promise<MenuItemDocument[]> {
    return this.items
      .find({ categoryId, isAvailable: true })
      .sort({ sortOrder: 1 })
      .toArray();
  }

  async findPopularItems(restaurantId: string, limit: number = 6): Promise<MenuItemDocument[]> {
    return this.items
      .find({ restaurantId, isPopular: true, isAvailable: true })
      .sort({ sortOrder: 1 })
      .limit(limit)
      .toArray();
  }

  async upsertItem(doc: MenuItemDocument): Promise<void> {
    await this.items.updateOne(
      { _id: doc._id },
      { $set: doc },
      { upsert: true },
    );
  }

  async searchItems(restaurantId: string, query: string): Promise<MenuItemDocument[]> {
    return this.items
      .find({
        restaurantId,
        isAvailable: true,
        $text: { $search: query },
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .toArray();
  }

  async bulkUpsertItems(items: MenuItemDocument[]): Promise<number> {
    if (items.length === 0) return 0;

    const ops = items.map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: item },
        upsert: true,
      },
    }));

    const result = await this.items.bulkWrite(ops);
    this.logger.log(`Bulk upserted ${result.upsertedCount + result.modifiedCount} menu items`);
    return result.upsertedCount + result.modifiedCount;
  }
}
