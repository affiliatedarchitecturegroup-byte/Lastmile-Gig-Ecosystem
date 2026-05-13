/**
 * Restaurant Service (P181)
 *
 * Business logic for restaurant operations. Reads/writes restaurant
 * data from MongoDB Atlas (primary store for storefront data).
 *
 * Data flow:
 * - Sanity CMS (content authoring) -> Webhook -> MongoDB (operational store)
 * - MongoDB -> NestJS API -> Next.js SSR (customer storefront)
 *
 * MongoDB collection: `restaurants`
 *
 * @module svc-storefronts/restaurant/restaurant.service
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { ListRestaurantsQueryDto } from './dto/list-restaurants-query.dto';

/** Restaurant document shape in MongoDB */
interface RestaurantDocument {
  _id: string;
  partnerId: string;
  sanityId: string;
  name: string;
  slug: string;
  description: string;
  cuisine: string[];
  logo: Record<string, unknown> | null;
  coverImage: Record<string, unknown> | null;
  address: {
    street: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
    lat: number;
    lng: number;
  };
  deliveryRadius: number;
  minimumOrder: number;
  avgDeliveryTime: number;
  commissionRate: number;
  operatingHours: Array<{
    day: string;
    isClosed: boolean;
    openTime: string | null;
    closeTime: string | null;
    lastOrderTime: string | null;
  }>;
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  totalOrders: number;
  phone: string;
  email: string;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class RestaurantService {
  private readonly logger = new Logger(RestaurantService.name);

  // In production, this would be injected as a MongoDB collection via @InjectModel
  // For the scaffold, we define the interface and method signatures

  /**
   * List restaurants with filtering, search, and pagination.
   */
  async findAll(query: ListRestaurantsQueryDto): Promise<PaginatedResult<RestaurantDocument>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Build MongoDB filter
    const filter: Record<string, unknown> = { isActive: true };

    if (query.cuisine) {
      filter['cuisine'] = { $in: [query.cuisine] };
    }
    if (query.city) {
      filter['address.city'] = { $regex: query.city, $options: 'i' };
    }
    if (query.search) {
      filter['$or'] = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        { cuisine: { $in: [query.search.toLowerCase()] } },
      ];
    }
    if (query.isOpen !== undefined) {
      // Open status is calculated from operatingHours + current time
      // Complex query handled in aggregation pipeline
    }

    this.logger.debug(`Finding restaurants with filter: ${JSON.stringify(filter)}`);

    // Placeholder: In production, execute MongoDB query
    return {
      data: [],
      meta: { total: 0, page, limit, totalPages: 0 },
    };
  }

  /**
   * Find a restaurant by its URL slug.
   */
  async findBySlug(slug: string): Promise<RestaurantDocument> {
    this.logger.debug(`Finding restaurant by slug: ${slug}`);

    // Placeholder: MongoDB findOne({ slug, isActive: true })
    const restaurant = null as RestaurantDocument | null;

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with slug '${slug}' not found`);
    }

    return restaurant;
  }

  /**
   * Find featured restaurants.
   */
  async findFeatured(): Promise<RestaurantDocument[]> {
    this.logger.debug('Finding featured restaurants');

    // Placeholder: MongoDB find({ isFeatured: true, isActive: true })
    return [];
  }

  /**
   * Find restaurants near a geographic point.
   * Uses MongoDB 2dsphere index for geospatial queries.
   */
  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<RestaurantDocument[]> {
    this.logger.debug(
      `Finding restaurants near (${lat}, ${lng}) within ${radiusKm}km`,
    );

    // Placeholder: MongoDB $geoNear aggregation
    // {
    //   $geoNear: {
    //     near: { type: "Point", coordinates: [lng, lat] },
    //     distanceField: "distance",
    //     maxDistance: radiusKm * 1000,
    //     spherical: true,
    //     query: { isActive: true }
    //   }
    // }
    return [];
  }

  /**
   * Create a new restaurant document.
   */
  async create(dto: CreateRestaurantDto): Promise<RestaurantDocument> {
    this.logger.log(`Creating restaurant: ${dto.name}`);

    const now = new Date();
    const document: RestaurantDocument = {
      _id: crypto.randomUUID(),
      partnerId: dto.partnerId,
      sanityId: '',
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? '',
      cuisine: dto.cuisine ?? [],
      logo: null,
      coverImage: null,
      address: dto.address ?? {
        street: '', suburb: '', city: '', province: '', postalCode: '',
        lat: 0, lng: 0,
      },
      deliveryRadius: dto.deliveryRadius ?? 10,
      minimumOrder: dto.minimumOrder ?? 50,
      avgDeliveryTime: dto.avgDeliveryTime ?? 30,
      commissionRate: 15,
      operatingHours: [],
      isActive: true,
      isFeatured: false,
      rating: 0,
      totalOrders: 0,
      phone: dto.phone ?? '',
      email: dto.email ?? '',
      website: dto.website ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Placeholder: MongoDB insertOne(document)
    return document;
  }

  /**
   * Update an existing restaurant document.
   */
  async update(id: string, dto: UpdateRestaurantDto): Promise<RestaurantDocument> {
    this.logger.log(`Updating restaurant: ${id}`);

    // Placeholder: MongoDB findOneAndUpdate({ _id: id }, { $set: dto })
    const updated = null as RestaurantDocument | null;

    if (!updated) {
      throw new NotFoundException(`Restaurant with id '${id}' not found`);
    }

    return updated;
  }

  /**
   * Sync a restaurant document from Sanity CMS webhook data.
   * Called by the webhook handler when Sanity publishes a restaurant change.
   */
  async syncFromSanity(sanityId: string, data: Record<string, unknown>): Promise<void> {
    this.logger.log(`Syncing restaurant from Sanity: ${sanityId}`);

    // Upsert: find by sanityId, update or insert
    // Placeholder: MongoDB updateOne(
    //   { sanityId },
    //   { $set: { ...transformSanityData(data), updatedAt: new Date() } },
    //   { upsert: true }
    // )
  }

  /**
   * Check if a restaurant is currently open based on operating hours.
   */
  isCurrentlyOpen(restaurant: RestaurantDocument): boolean {
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[now.getDay()];

    const todayHours = restaurant.operatingHours.find(
      (h) => h.day === today,
    );

    if (!todayHours || todayHours.isClosed) {
      return false;
    }

    if (!todayHours.openTime || !todayHours.closeTime) {
      return false;
    }

    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
  }
}
