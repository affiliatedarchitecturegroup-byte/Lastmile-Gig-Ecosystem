/**
 * Sanity Client Service (P179)
 *
 * Server-side Sanity CMS client for fetching and querying
 * restaurant content. Used for manual syncs and data retrieval.
 *
 * GROQ queries are used to fetch documents from Sanity:
 * - Restaurant by slug: `*[_type == "restaurant" && slug.current == $slug][0]`
 * - Menu for restaurant: `*[_type == "menuItem" && restaurant._ref == $restaurantId]`
 * - Categories: `*[_type == "menuCategory" && restaurant._ref == $restaurantId]`
 *
 * @module svc-storefronts/sanity/sanity-client.service
 */

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SanityClientService {
  private readonly logger = new Logger(SanityClientService.name);

  private readonly projectId: string =
    process.env['LMG_SANITY_PROJECT_ID'] || 'lmg-storefronts';
  private readonly dataset: string =
    process.env['LMG_SANITY_DATASET'] || 'production';
  private readonly apiVersion = '2024-01-01';
  private readonly token: string =
    process.env['LMG_SANITY_API_TOKEN'] || '';

  /**
   * Fetch a restaurant document by slug from Sanity.
   */
  async getRestaurantBySlug(slug: string): Promise<Record<string, unknown> | null> {
    const query = `*[_type == "restaurant" && slug.current == $slug][0]{
      ...,
      "categories": *[_type == "menuCategory" && restaurant._ref == ^._id] | order(displayOrder asc) {
        ...,
        "items": *[_type == "menuItem" && category._ref == ^._id && isAvailable == true] | order(displayOrder asc)
      }
    }`;

    return this.executeQuery(query, { slug });
  }

  /**
   * Fetch all restaurants for the partner directory.
   */
  async getAllRestaurants(): Promise<Array<Record<string, unknown>>> {
    const query = `*[_type == "restaurant" && isActive == true] | order(name asc) {
      _id,
      name,
      slug,
      description,
      cuisine,
      logo,
      coverImage,
      "address": address { city, suburb },
      rating,
      avgDeliveryTime,
      minimumOrder,
      isFeatured
    }`;

    const result = await this.executeQuery(query, {});
    return Array.isArray(result) ? result : [];
  }

  /**
   * Fetch all menu items for a restaurant (for full sync).
   */
  async getMenuForRestaurant(
    restaurantSanityId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const query = `*[_type == "menuItem" && restaurant._ref == $restaurantId]{
      ...,
      "categoryName": category->name,
      "restaurantName": restaurant->name,
      "restaurantSlug": restaurant->slug.current
    }`;

    const result = await this.executeQuery(query, {
      restaurantId: restaurantSanityId,
    });
    return Array.isArray(result) ? result : [];
  }

  /**
   * Fetch a single document by ID from Sanity.
   */
  async getDocumentById(documentId: string): Promise<Record<string, unknown> | null> {
    const query = `*[_id == $id][0]`;
    return this.executeQuery(query, { id: documentId });
  }

  /**
   * Execute a GROQ query against the Sanity API.
   */
  private async executeQuery(
    query: string,
    params: Record<string, string>,
  ): Promise<unknown> {
    const encodedQuery = encodeURIComponent(query);
    const paramString = Object.entries(params)
      .map(([key, value]) => `$${key}="${encodeURIComponent(value)}"`)
      .join('&');

    const url = `https://${this.projectId}.api.sanity.io/v${this.apiVersion}/data/query/${this.dataset}?query=${encodedQuery}&${paramString}`;

    this.logger.debug(`Sanity GROQ query: ${query.substring(0, 100)}...`);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Sanity API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { result: unknown };
      return data.result;
    } catch (error) {
      this.logger.error(`Sanity query failed: ${error}`);
      return null;
    }
  }
}
