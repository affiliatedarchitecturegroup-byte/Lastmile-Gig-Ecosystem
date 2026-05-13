/**
 * Partner Analytics Service - Per-partner analytics aggregation.
 *
 * Provides revenue, order volume, popular items, and peak hours
 * analytics for restaurant partners.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.11
 * @module svc-storefronts
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db } from 'mongodb';

export interface PartnerAnalytics {
  partnerId: string;
  period: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
  peakHours: Array<{ hour: number; orderCount: number }>;
  customerRetentionRate: number;
  averageRating: number;
}

@Injectable()
export class PartnerAnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(PartnerAnalyticsService.name);
  private readonly client: MongoClient;
  private readonly db: Db;

  constructor(private readonly configService: ConfigService) {
    const mongoUri = this.configService.get<string>('LMG_MONGODB_URI', 'mongodb://localhost:27017');
    const dbName = this.configService.get<string>('LMG_MONGODB_DB', 'lastmilegig');

    this.client = new MongoClient(mongoUri);
    this.db = this.client.db(dbName);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  /**
   * Get analytics for a partner within a date range.
   */
  async getAnalytics(
    partnerId: string,
    fromDate: string,
    toDate: string,
  ): Promise<PartnerAnalytics> {
    this.logger.log(`Fetching analytics for partner ${partnerId}: ${fromDate} to ${toDate}`);

    const analytics = await this.db.collection('partner_analytics').findOne({
      partnerId,
      period: `${fromDate}/${toDate}`,
    });

    if (analytics) {
      return analytics as unknown as PartnerAnalytics;
    }

    // Return empty analytics if no pre-aggregated data exists
    return {
      partnerId,
      period: `${fromDate}/${toDate}`,
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      topItems: [],
      peakHours: [],
      customerRetentionRate: 0,
      averageRating: 0,
    };
  }

  /**
   * Get real-time order count for today.
   */
  async getTodayOrderCount(partnerId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    return this.db.collection('delivery_events').countDocuments({
      'metadata.partnerId': partnerId,
      eventType: 'order.placed',
      timestamp: { $gte: `${today}T00:00:00.000Z` },
    });
  }

  /**
   * Get the top-selling items for a partner.
   */
  async getTopItems(
    partnerId: string,
    limit: number = 10,
  ): Promise<Array<{ name: string; quantity: number; revenue: number }>> {
    const pipeline = [
      {
        $match: {
          'metadata.partnerId': partnerId,
          eventType: 'order.delivered',
        },
      },
      { $unwind: '$metadata.items' },
      {
        $group: {
          _id: '$metadata.items.name',
          quantity: { $sum: '$metadata.items.quantity' },
          revenue: {
            $sum: {
              $multiply: ['$metadata.items.quantity', '$metadata.items.unitPrice'],
            },
          },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: limit },
      {
        $project: {
          name: '$_id',
          quantity: 1,
          revenue: 1,
          _id: 0,
        },
      },
    ];

    const result = await this.db
      .collection('delivery_events')
      .aggregate(pipeline)
      .toArray();

    return result as Array<{ name: string; quantity: number; revenue: number }>;
  }
}
