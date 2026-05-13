/**
 * Order Event Repository - MongoDB event log for order lifecycle events.
 *
 * All order state transitions are logged as immutable events in MongoDB
 * for audit trail, analytics, and event sourcing capabilities.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 3.1
 * @module svc-orders
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Collection, Db } from 'mongodb';
import { randomUUID } from 'crypto';

/** Shape of an order event document in MongoDB */
export interface OrderEventDocument {
  _id: string;
  orderId: string;
  eventType: string;
  previousStatus: string | null;
  newStatus: string;
  triggeredBy: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  traceId: string;
}

@Injectable()
export class OrderEventRepository implements OnModuleDestroy {
  private readonly logger = new Logger(OrderEventRepository.name);
  private readonly client: MongoClient;
  private readonly db: Db;
  private readonly collection: Collection<OrderEventDocument>;

  constructor(private readonly configService: ConfigService) {
    const mongoUri = this.configService.get<string>(
      'LMG_MONGODB_URI',
      'mongodb://localhost:27017',
    );
    const dbName = this.configService.get<string>('LMG_MONGODB_DB', 'lastmilegig');

    this.client = new MongoClient(mongoUri);
    this.db = this.client.db(dbName);
    this.collection = this.db.collection<OrderEventDocument>('delivery_events');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
    this.logger.log('MongoDB connection closed');
  }

  /**
   * Log an order lifecycle event to MongoDB.
   * Events are immutable and form the complete audit trail for each order.
   */
  async logEvent(params: {
    orderId: string;
    eventType: string;
    previousStatus: string | null;
    newStatus: string;
    triggeredBy: string;
    metadata?: Record<string, unknown>;
    traceId?: string;
  }): Promise<OrderEventDocument> {
    const event: OrderEventDocument = {
      _id: randomUUID(),
      orderId: params.orderId,
      eventType: params.eventType,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      triggeredBy: params.triggeredBy,
      metadata: params.metadata ?? {},
      timestamp: new Date().toISOString(),
      traceId: params.traceId ?? randomUUID(),
    };

    await this.collection.insertOne(event);
    this.logger.log(`Logged event ${params.eventType} for order ${params.orderId}`);

    return event;
  }

  /**
   * Retrieve the full event history for an order.
   * Returns events in chronological order.
   */
  async getEventHistory(orderId: string): Promise<OrderEventDocument[]> {
    return this.collection
      .find({ orderId })
      .sort({ timestamp: 1 })
      .toArray();
  }

  /**
   * Count events of a specific type within a time range.
   * Used for analytics and monitoring.
   */
  async countEventsByType(
    eventType: string,
    fromDate: string,
    toDate: string,
  ): Promise<number> {
    return this.collection.countDocuments({
      eventType,
      timestamp: { $gte: fromDate, $lte: toDate },
    });
  }
}
