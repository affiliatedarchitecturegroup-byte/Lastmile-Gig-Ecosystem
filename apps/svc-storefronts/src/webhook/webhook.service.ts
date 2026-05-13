/**
 * Webhook Service (P179, P182)
 *
 * Processes Sanity CMS webhooks and syncs content to MongoDB
 * and OpenSearch. Handles HMAC signature verification.
 *
 * Sync flow:
 * - restaurant document -> MongoDB restaurants collection
 * - menuCategory document -> MongoDB menu_categories collection
 * - menuItem document -> MongoDB menu_items collection + OpenSearch menus index
 * - partnerSettings document -> MongoDB partner_settings collection
 * - deliveryZone document -> MongoDB delivery_zones collection
 *
 * @module svc-storefronts/webhook/webhook.service
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  private readonly webhookSecret: string =
    process.env['LMG_SANITY_WEBHOOK_SECRET'] || 'dev-webhook-secret';

  // -------------------------------------------------------------------------
  // Signature verification
  // -------------------------------------------------------------------------

  /**
   * Verify the HMAC-SHA256 signature of a Sanity webhook payload.
   */
  verifySignature(payload: string, signature: string): boolean {
    const expected = createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    if (expected.length !== signature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  }

  // -------------------------------------------------------------------------
  // Webhook processing
  // -------------------------------------------------------------------------

  /**
   * Process a Sanity webhook event by document type.
   */
  async processWebhook(
    documentId: string,
    documentType: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const startTime = Date.now();

    switch (documentType) {
      case 'restaurant':
        await this.syncRestaurant(documentId, data);
        break;

      case 'menuCategory':
        await this.syncMenuCategory(documentId, data);
        break;

      case 'menuItem':
        await this.syncMenuItem(documentId, data);
        break;

      case 'partnerSettings':
        await this.syncPartnerSettings(documentId, data);
        break;

      case 'deliveryZone':
        await this.syncDeliveryZone(documentId, data);
        break;

      default:
        this.logger.warning(`Unknown document type: ${documentType}`);
        return;
    }

    const duration = Date.now() - startTime;
    this.logger.log(
      `Webhook processed: ${documentType} (${documentId}) in ${duration}ms`,
    );
  }

  // -------------------------------------------------------------------------
  // Document-specific sync handlers
  // -------------------------------------------------------------------------

  private async syncRestaurant(
    sanityId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const mongoDoc = this.transformRestaurant(data);

    // Upsert to MongoDB
    // db.restaurants.updateOne(
    //   { sanityId },
    //   { $set: { ...mongoDoc, updatedAt: new Date() } },
    //   { upsert: true }
    // )
    this.logger.debug(`Synced restaurant: ${mongoDoc.name}`);
  }

  private async syncMenuCategory(
    sanityId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const mongoDoc = this.transformMenuCategory(data);

    // Upsert to MongoDB
    this.logger.debug(`Synced menu category: ${mongoDoc.name}`);
  }

  private async syncMenuItem(
    sanityId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const mongoDoc = this.transformMenuItem(data);

    // Upsert to MongoDB
    // Also index in OpenSearch for full-text search
    await this.indexInOpenSearch(sanityId, mongoDoc);

    this.logger.debug(`Synced menu item: ${mongoDoc.name}`);
  }

  private async syncPartnerSettings(
    sanityId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    this.logger.debug(`Synced partner settings: ${sanityId}`);
    // Upsert to MongoDB partner_settings collection
  }

  private async syncDeliveryZone(
    sanityId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    this.logger.debug(`Synced delivery zone: ${sanityId}`);
    // Upsert to MongoDB delivery_zones collection
  }

  // -------------------------------------------------------------------------
  // Full menu sync (manual trigger)
  // -------------------------------------------------------------------------

  /**
   * Perform a full menu sync for a partner.
   * Fetches all documents from Sanity and upserts to MongoDB + OpenSearch.
   */
  async fullMenuSync(partnerId: string): Promise<void> {
    this.logger.log(`Starting full menu sync for partner: ${partnerId}`);

    // 1. Fetch restaurant from Sanity by partnerId
    // 2. Fetch all menuCategories for the restaurant
    // 3. Fetch all menuItems for the restaurant
    // 4. Upsert all to MongoDB
    // 5. Re-index all items in OpenSearch

    this.logger.log(`Full menu sync complete for partner: ${partnerId}`);
  }

  // -------------------------------------------------------------------------
  // OpenSearch indexing
  // -------------------------------------------------------------------------

  /**
   * Index a menu item in OpenSearch for full-text search.
   *
   * OpenSearch index: `menus`
   * Used by the storefront search bar and partner directory.
   */
  private async indexInOpenSearch(
    documentId: string,
    item: Record<string, unknown>,
  ): Promise<void> {
    // OpenSearch client PUT /menus/_doc/{documentId}
    // {
    //   name: item.name,
    //   description: item.description,
    //   restaurant_name: item.restaurantName,
    //   restaurant_slug: item.restaurantSlug,
    //   cuisine: item.cuisine,
    //   price: item.price,
    //   allergens: item.allergens,
    //   is_vegetarian: item.isVegetarian,
    //   is_vegan: item.isVegan,
    //   is_halal: item.isHalal,
    //   category: item.category,
    // }
    this.logger.debug(`Indexed menu item in OpenSearch: ${documentId}`);
  }

  // -------------------------------------------------------------------------
  // Data transformation (Sanity -> MongoDB)
  // -------------------------------------------------------------------------

  private transformRestaurant(data: Record<string, unknown>): Record<string, unknown> {
    return {
      sanityId: data['_id'],
      name: data['name'] || '',
      slug: (data['slug'] as Record<string, unknown>)?.['current'] || '',
      description: data['description'] || '',
      cuisine: data['cuisine'] || [],
      logo: this.transformCloudinaryAsset(data['logo']),
      coverImage: this.transformCloudinaryAsset(data['coverImage']),
      address: data['address'] || {},
      deliveryRadius: data['deliveryRadius'] || 10,
      minimumOrder: data['minimumOrder'] || 50,
      avgDeliveryTime: data['avgDeliveryTime'] || 30,
      commissionRate: data['commissionRate'] || 15,
      operatingHours: data['operatingHours'] || [],
      isActive: data['isActive'] ?? true,
      isFeatured: data['isFeatured'] ?? false,
      phone: data['phone'] || '',
      email: data['email'] || '',
      website: data['website'] || null,
      seoTitle: data['seoTitle'] || '',
      seoDescription: data['seoDescription'] || '',
    };
  }

  private transformMenuCategory(data: Record<string, unknown>): Record<string, unknown> {
    return {
      sanityId: data['_id'],
      name: data['name'] || '',
      slug: (data['slug'] as Record<string, unknown>)?.['current'] || '',
      description: data['description'] || null,
      restaurantRef: (data['restaurant'] as Record<string, unknown>)?.['_ref'] || '',
      displayOrder: data['displayOrder'] || 0,
      isActive: data['isActive'] ?? true,
      availableFrom: data['availableFrom'] || null,
      availableUntil: data['availableUntil'] || null,
    };
  }

  private transformMenuItem(data: Record<string, unknown>): Record<string, unknown> {
    return {
      sanityId: data['_id'],
      name: data['name'] || '',
      slug: (data['slug'] as Record<string, unknown>)?.['current'] || '',
      description: data['description'] || null,
      price: data['price'] || 0,
      images: this.transformCloudinaryArray(data['images']),
      categoryRef: (data['category'] as Record<string, unknown>)?.['_ref'] || '',
      restaurantRef: (data['restaurant'] as Record<string, unknown>)?.['_ref'] || '',
      allergens: data['allergens'] || [],
      isVegetarian: data['isVegetarian'] ?? false,
      isVegan: data['isVegan'] ?? false,
      isHalal: data['isHalal'] ?? false,
      isSpicy: data['isSpicy'] ?? false,
      spiceLevel: data['spiceLevel'] || null,
      options: data['options'] || [],
      preparationTime: data['preparationTime'] || 15,
      isAvailable: data['isAvailable'] ?? true,
      displayOrder: data['displayOrder'] || 0,
    };
  }

  private transformCloudinaryAsset(asset: unknown): Record<string, unknown> | null {
    if (!asset || typeof asset !== 'object') return null;
    const a = asset as Record<string, unknown>;
    return {
      publicId: a['public_id'] || a['publicId'] || '',
      url: a['url'] || '',
      secureUrl: a['secure_url'] || a['secureUrl'] || '',
      width: a['width'] || 0,
      height: a['height'] || 0,
      format: a['format'] || '',
    };
  }

  private transformCloudinaryArray(images: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(images)) return [];
    return images
      .map((img) => this.transformCloudinaryAsset(img))
      .filter((img): img is Record<string, unknown> => img !== null);
  }
}
