/**
 * OpenSearch Service (P182)
 *
 * Client for AWS OpenSearch (Elasticsearch) for full-text menu search.
 *
 * Index: `menus`
 * - Indexed fields: name, description, restaurant_name, cuisine, allergens
 * - Filterable: price, is_vegetarian, is_vegan, is_halal, category
 * - Boost: name (3x), description (1.5x)
 *
 * Used by:
 * - Storefront search bar (customer-facing)
 * - Partner directory search
 * - Menu extraction AI pipeline (indexing after extraction)
 *
 * @module svc-storefronts/search/opensearch.service
 */

import { Injectable, Logger } from '@nestjs/common';

interface SearchResult {
  items: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    restaurantName: string;
    restaurantSlug: string;
    cuisine: string[];
    category: string;
    isVegetarian: boolean;
    isVegan: boolean;
    isHalal: boolean;
    score: number;
  }>;
  total: number;
  took: number;
}

interface SearchQuery {
  query: string;
  cuisine?: string;
  maxPrice?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class OpenSearchService {
  private readonly logger = new Logger(OpenSearchService.name);

  private readonly endpoint: string =
    process.env['LMG_OPENSEARCH_ENDPOINT'] || 'http://localhost:9200';
  private readonly indexName = 'menus';

  /**
   * Search menu items across all restaurants.
   *
   * Uses multi_match query with boosting on name and description.
   * Applies filters for dietary preferences and price range.
   */
  async searchMenuItems(params: SearchQuery): Promise<SearchResult> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const from = (page - 1) * limit;

    // Build OpenSearch query
    const must: Array<Record<string, unknown>> = [
      {
        multi_match: {
          query: params.query,
          fields: ['name^3', 'description^1.5', 'restaurant_name', 'cuisine'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      },
    ];

    const filter: Array<Record<string, unknown>> = [
      { term: { is_available: true } },
    ];

    if (params.maxPrice) {
      filter.push({ range: { price: { lte: params.maxPrice } } });
    }
    if (params.isVegetarian) {
      filter.push({ term: { is_vegetarian: true } });
    }
    if (params.isVegan) {
      filter.push({ term: { is_vegan: true } });
    }
    if (params.isHalal) {
      filter.push({ term: { is_halal: true } });
    }
    if (params.cuisine) {
      filter.push({ term: { cuisine: params.cuisine } });
    }

    const queryBody = {
      from,
      size: limit,
      query: {
        bool: { must, filter },
      },
      highlight: {
        fields: {
          name: {},
          description: {},
        },
      },
      sort: [
        { _score: { order: 'desc' } },
        { order_count: { order: 'desc' } },
      ],
    };

    this.logger.debug(
      `OpenSearch query: "${params.query}", filters: ${JSON.stringify(filter)}`,
    );

    // Placeholder: Execute OpenSearch query
    // const response = await this.client.search({
    //   index: this.indexName,
    //   body: queryBody,
    // });
    return { items: [], total: 0, took: 0 };
  }

  /**
   * Index a menu item document in OpenSearch.
   */
  async indexMenuItem(id: string, document: Record<string, unknown>): Promise<void> {
    this.logger.debug(`Indexing menu item: ${id}`);

    // PUT /menus/_doc/{id}
    // Placeholder: this.client.index({ index: this.indexName, id, body: document })
  }

  /**
   * Delete a menu item from the OpenSearch index.
   */
  async deleteMenuItem(id: string): Promise<void> {
    this.logger.debug(`Deleting menu item from index: ${id}`);

    // DELETE /menus/_doc/{id}
    // Placeholder: this.client.delete({ index: this.indexName, id })
  }

  /**
   * Bulk index menu items (used during full menu sync).
   */
  async bulkIndex(items: Array<{ id: string; document: Record<string, unknown> }>): Promise<void> {
    if (items.length === 0) return;

    this.logger.log(`Bulk indexing ${items.length} menu items`);

    // Build bulk request body
    // const body = items.flatMap(({ id, document }) => [
    //   { index: { _index: this.indexName, _id: id } },
    //   document,
    // ]);
    // Placeholder: this.client.bulk({ body })
  }

  /**
   * Create or update the menus index with proper mappings.
   */
  async ensureIndex(): Promise<void> {
    const mappings = {
      properties: {
        name: { type: 'text', analyzer: 'standard', boost: 3 },
        description: { type: 'text', analyzer: 'standard', boost: 1.5 },
        restaurant_name: { type: 'text', analyzer: 'standard' },
        restaurant_slug: { type: 'keyword' },
        cuisine: { type: 'keyword' },
        category: { type: 'keyword' },
        price: { type: 'float' },
        allergens: { type: 'keyword' },
        is_vegetarian: { type: 'boolean' },
        is_vegan: { type: 'boolean' },
        is_halal: { type: 'boolean' },
        is_available: { type: 'boolean' },
        order_count: { type: 'integer' },
        preparation_time: { type: 'integer' },
        updated_at: { type: 'date' },
      },
    };

    this.logger.log('Ensuring OpenSearch menus index exists');

    // Placeholder: Create index if not exists
    // this.client.indices.create({ index: this.indexName, body: { mappings } })
  }
}
