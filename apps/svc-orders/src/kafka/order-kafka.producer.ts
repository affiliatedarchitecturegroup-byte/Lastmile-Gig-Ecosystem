/**
 * Order Kafka Producer - Publishes order domain events to Kafka topics.
 *
 * All order lifecycle events are published through this producer:
 * - order.placed -> triggers dispatch engine
 * - order.confirmed -> notifies customer
 * - order.dispatched -> notifies customer + tracking service
 * - order.delivered -> triggers blockchain verification + payment
 * - order.cancelled -> triggers refund flow
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.4
 * @see libs/shared-types/src/kafka/kafka-events.types.ts
 * @module svc-orders
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, CompressionTypes } from 'kafkajs';
import { KAFKA_TOPICS } from '@lastmile-gig/shared-types';
import type {
  OrderPlacedEvent,
  OrderDispatchedEvent,
  OrderDeliveredEvent,
  OrderCancelledEvent,
} from '@lastmile-gig/shared-types';
import { randomUUID } from 'crypto';

@Injectable()
export class OrderKafkaProducer implements OnModuleDestroy {
  private readonly logger = new Logger(OrderKafkaProducer.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private connected = false;

  constructor(private readonly configService: ConfigService) {
    const brokers = this.configService
      .get<string>('LMG_KAFKA_BROKERS', 'localhost:9092')
      .split(',');

    this.kafka = new Kafka({
      clientId: 'svc-orders',
      brokers,
      retry: { initialRetryTime: 300, retries: 5 },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      idempotent: true,
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    }
  }

  /**
   * Ensure the producer is connected before sending messages.
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
      this.logger.log('Kafka producer connected');
    }
  }

  /**
   * Publish an order.placed event to trigger the dispatch engine.
   */
  async publishOrderPlaced(event: Omit<OrderPlacedEvent, 'eventId' | 'timestamp' | 'source' | 'traceId'>): Promise<void> {
    const fullEvent: OrderPlacedEvent = {
      eventId: randomUUID(),
      eventType: 'order.placed',
      timestamp: new Date().toISOString(),
      source: 'svc-orders',
      traceId: randomUUID(),
      payload: event.payload,
    };

    await this.send(KAFKA_TOPICS.ORDERS_PLACED, fullEvent.payload.orderId, fullEvent);
    this.logger.log(`Published order.placed event for orderId=${fullEvent.payload.orderId}`);
  }

  /**
   * Publish an order.dispatched event when a driver is assigned.
   */
  async publishOrderDispatched(event: Omit<OrderDispatchedEvent, 'eventId' | 'timestamp' | 'source' | 'traceId'>): Promise<void> {
    const fullEvent: OrderDispatchedEvent = {
      eventId: randomUUID(),
      eventType: 'order.dispatched',
      timestamp: new Date().toISOString(),
      source: 'svc-orders',
      traceId: randomUUID(),
      payload: event.payload,
    };

    await this.send(KAFKA_TOPICS.ORDERS_DISPATCHED, fullEvent.payload.orderId, fullEvent);
    this.logger.log(`Published order.dispatched event for orderId=${fullEvent.payload.orderId}`);
  }

  /**
   * Publish an order.delivered event to trigger blockchain verification and payment.
   */
  async publishOrderDelivered(event: Omit<OrderDeliveredEvent, 'eventId' | 'timestamp' | 'source' | 'traceId'>): Promise<void> {
    const fullEvent: OrderDeliveredEvent = {
      eventId: randomUUID(),
      eventType: 'order.delivered',
      timestamp: new Date().toISOString(),
      source: 'svc-orders',
      traceId: randomUUID(),
      payload: event.payload,
    };

    await this.send(KAFKA_TOPICS.ORDERS_DELIVERED, fullEvent.payload.orderId, fullEvent);
    this.logger.log(`Published order.delivered event for orderId=${fullEvent.payload.orderId}`);
  }

  /**
   * Publish an order.cancelled event to trigger refund processing.
   */
  async publishOrderCancelled(event: Omit<OrderCancelledEvent, 'eventId' | 'timestamp' | 'source' | 'traceId'>): Promise<void> {
    const fullEvent: OrderCancelledEvent = {
      eventId: randomUUID(),
      eventType: 'order.cancelled',
      timestamp: new Date().toISOString(),
      source: 'svc-orders',
      traceId: randomUUID(),
      payload: event.payload,
    };

    await this.send(KAFKA_TOPICS.ORDERS_CANCELLED, fullEvent.payload.orderId, fullEvent);
    this.logger.log(`Published order.cancelled event for orderId=${fullEvent.payload.orderId}`);
  }

  /**
   * Send a message to a Kafka topic with the given key for partitioning.
   */
  private async send(topic: string, key: string, value: unknown): Promise<void> {
    await this.ensureConnected();

    await this.producer.send({
      topic,
      compression: CompressionTypes.Snappy,
      messages: [
        {
          key,
          value: JSON.stringify(value),
          headers: {
            'content-type': 'application/json',
            source: 'svc-orders',
          },
        },
      ],
    });
  }
}
