/**
 * Restaurant Service - Business logic for restaurant/partner management.
 *
 * Handles restaurant CRUD, Sanity webhook sync, and directory listing.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.11
 * @module svc-storefronts
 */

import { Injectable, Logger } from '@nestjs/common';
import { RestaurantRepository, RestaurantDocument } from '../repositories/restaurant.repository';
import { randomUUID } from 'crypto';

@Injectable()
export class RestaurantService {
  private readonly logger = new Logger(RestaurantService.name);

  constructor(private readonly repository: RestaurantRepository) {}

  /**
   * Get all restaurants with optional filters.
   */
  async listRestaurants(filters?: {
    partnerType?: string;
    cuisine?: string;
    isActive?: boolean;
    isFeatured?: boolean;
  }): Promise<RestaurantDocument[]> {
    return this.repository.findAll(filters);
  }

  /**
   * Get a single restaurant by its URL slug.
   */
  async getBySlug(slug: string): Promise<RestaurantDocument> {
    return this.repository.findBySlug(slug);
  }

  /**
   * Get a single restaurant by partner ID.
   */
  async getByPartnerId(partnerId: string): Promise<RestaurantDocument> {
    return this.repository.findByPartnerId(partnerId);
  }

  /**
   * Create a new restaurant profile.
   */
  async create(data: {
    partnerId: string;
    name: string;
    slug: string;
    description: string;
    partnerType: string;
    address: RestaurantDocument['address'];
    phone?: string;
    email?: string;
    deliveryRadius?: number;
    minimumOrder?: number;
  }): Promise<RestaurantDocument> {
    const restaurant = await this.repository.create({
      _id: randomUUID(),
      partnerId: data.partnerId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      partnerType: data.partnerType,
      heroImageUrl: null,
      logoUrl: null,
      cuisine: [],
      address: data.address,
      phone: data.phone ?? null,
      email: data.email ?? null,
      operatingHours: [],
      deliveryRadius: data.deliveryRadius ?? 10,
      minimumOrder: data.minimumOrder ?? 50,
      averageDeliveryTime: 30,
      rating: 0,
      reviewCount: 0,
      isActive: true,
      isFeatured: false,
    });

    this.logger.log(`Created restaurant: ${restaurant.name} (${restaurant.slug})`);
    return restaurant;
  }

  /**
   * Update restaurant profile fields.
   */
  async update(id: string, data: Partial<RestaurantDocument>): Promise<RestaurantDocument> {
    return this.repository.update(id, data);
  }

  /**
   * Handle Sanity CMS webhook for restaurant sync.
   * When a restaurant is updated in Sanity, this method syncs the data to MongoDB.
   */
  async syncFromSanity(sanityPayload: Record<string, unknown>): Promise<void> {
    const slug = sanityPayload['slug'] as string;
    if (!slug) {
      this.logger.warn('Sanity webhook received without slug, skipping');
      return;
    }

    this.logger.log(`Syncing restaurant from Sanity: ${slug}`);
    // Full Sanity sync implementation in Phase H expansion
  }

  /**
   * Search restaurants by name or cuisine.
   */
  async search(query: string): Promise<RestaurantDocument[]> {
    return this.repository.search(query);
  }
}
