/**
 * Restaurant Repository - MongoDB data access for restaurant documents.
 *
 * Restaurants are stored in MongoDB for flexible schema and
 * fast read performance on the storefront pages.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 3.2
 * @module svc-storefronts
 */

import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Collection, Db } from 'mongodb';

export interface RestaurantDocument {
  _id: string;
  partnerId: string;
  name: string;
  slug: string;
  description: string;
  partnerType: string;
  heroImageUrl: string | null;
  logoUrl: string | null;
  cuisine: string[];
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  };
  phone: string | null;
  email: string | null;
  operatingHours: Array<{
    day: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  deliveryRadius: number;
  minimumOrder: number;
  averageDeliveryTime: number;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class RestaurantRepository implements OnModuleDestroy {
  private readonly logger = new Logger(RestaurantRepository.name);
  private readonly client: MongoClient;
  private readonly db: Db;
  private readonly collection: Collection<RestaurantDocument>;

  constructor(private readonly configService: ConfigService) {
    const mongoUri = this.configService.get<string>('LMG_MONGODB_URI', 'mongodb://localhost:27017');
    const dbName = this.configService.get<string>('LMG_MONGODB_DB', 'lastmilegig');

    this.client = new MongoClient(mongoUri);
    this.db = this.client.db(dbName);
    this.collection = this.db.collection<RestaurantDocument>('restaurants');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  async findAll(filters?: {
    partnerType?: string;
    cuisine?: string;
    isActive?: boolean;
    isFeatured?: boolean;
  }): Promise<RestaurantDocument[]> {
    const query: Record<string, unknown> = {};

    if (filters?.partnerType) query['partnerType'] = filters.partnerType;
    if (filters?.cuisine) query['cuisine'] = { $in: [filters.cuisine] };
    if (filters?.isActive !== undefined) query['isActive'] = filters.isActive;
    if (filters?.isFeatured !== undefined) query['isFeatured'] = filters.isFeatured;

    return this.collection
      .find(query)
      .sort({ isFeatured: -1, rating: -1 })
      .toArray();
  }

  async findBySlug(slug: string): Promise<RestaurantDocument> {
    const doc = await this.collection.findOne({ slug });
    if (!doc) throw new NotFoundException(`Restaurant with slug '${slug}' not found`);
    return doc;
  }

  async findById(id: string): Promise<RestaurantDocument> {
    const doc = await this.collection.findOne({ _id: id });
    if (!doc) throw new NotFoundException(`Restaurant ${id} not found`);
    return doc;
  }

  async findByPartnerId(partnerId: string): Promise<RestaurantDocument> {
    const doc = await this.collection.findOne({ partnerId });
    if (!doc) throw new NotFoundException(`Restaurant for partner ${partnerId} not found`);
    return doc;
  }

  async create(doc: Omit<RestaurantDocument, 'createdAt' | 'updatedAt'>): Promise<RestaurantDocument> {
    const now = new Date().toISOString();
    const fullDoc = { ...doc, createdAt: now, updatedAt: now };
    await this.collection.insertOne(fullDoc as RestaurantDocument);
    this.logger.log(`Created restaurant: ${doc.name} (${doc.slug})`);
    return fullDoc as RestaurantDocument;
  }

  async update(id: string, update: Partial<RestaurantDocument>): Promise<RestaurantDocument> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id },
      { $set: { ...update, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' },
    );
    if (!result) throw new NotFoundException(`Restaurant ${id} not found`);
    return result;
  }

  async search(query: string): Promise<RestaurantDocument[]> {
    return this.collection
      .find({ $text: { $search: query } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .toArray();
  }
}
