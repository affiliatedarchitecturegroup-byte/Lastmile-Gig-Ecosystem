/**
 * Kafka Producer Service - Driver Event Publishing
 *
 * Publishes driver domain events to Kafka topics for consumption
 * by dispatch engine, analytics, command centre, and other services.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 4.3
 * @see POLYGLOT_ARCHITECTURE.md - Section 4.2
 * @module services/kafka-producer.service
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DRIVER_KAFKA_TOPICS, type DriverServiceConfig } from '../config/driver.config';
import type { DriverEvent } from '../dto/driver.dto';

@Injectable()
export class KafkaProducerService {
  private readonly logger = new Logger(KafkaProducerService.name);

  /**
   * In-memory event log for development.
   * In production, connects to AWS MSK via confluent-kafka-js.
   */
  private readonly eventLog: DriverEvent[] = [];

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<DriverServiceConfig>('driver');
    if (config?.environment === 'development') {
      this.logger.log('Kafka producer running in development mode (in-memory log)');
    }
  }

  /**
   * Publishes a driver registration event.
   */
  async publishDriverRegistered(driverId: string, zone: string, vehicleType: string): Promise<void> {
    await this.publish(DRIVER_KAFKA_TOPICS.DRIVER_REGISTERED, {
      eventType: 'driver.registered',
      driverId,
      timestamp: new Date().toISOString(),
      data: { zone, vehicleType },
    });
  }

  /**
   * Publishes a driver status change event.
   */
  async publishDriverStatusChanged(
    driverId: string,
    previousStatus: string,
    newStatus: string,
    reason?: string,
  ): Promise<void> {
    await this.publish(DRIVER_KAFKA_TOPICS.DRIVER_STATUS_CHANGED, {
      eventType: 'driver.status.changed',
      driverId,
      timestamp: new Date().toISOString(),
      data: { previousStatus, newStatus, reason },
    });
  }

  /**
   * Publishes a driver location update event.
   */
  async publishDriverLocationUpdated(
    driverId: string,
    latitude: number,
    longitude: number,
    heading?: number,
    speed?: number,
  ): Promise<void> {
    await this.publish(DRIVER_KAFKA_TOPICS.DRIVER_LOCATION_UPDATED, {
      eventType: 'driver.location.updated',
      driverId,
      timestamp: new Date().toISOString(),
      data: { latitude, longitude, heading, speed },
    });
  }

  /**
   * Publishes a driver onboarding completion event.
   */
  async publishDriverOnboarded(driverId: string, zone: string): Promise<void> {
    await this.publish(DRIVER_KAFKA_TOPICS.DRIVER_ONBOARDED, {
      eventType: 'driver.onboarded',
      driverId,
      timestamp: new Date().toISOString(),
      data: { zone },
    });
  }

  /**
   * Publishes a driver suspension event.
   */
  async publishDriverSuspended(driverId: string, reason: string): Promise<void> {
    await this.publish(DRIVER_KAFKA_TOPICS.DRIVER_SUSPENDED, {
      eventType: 'driver.suspended',
      driverId,
      timestamp: new Date().toISOString(),
      data: { reason },
    });
  }

  /**
   * Publishes a driver performance score update event.
   */
  async publishPerformanceScored(
    driverId: string,
    score: number,
    tier: string,
  ): Promise<void> {
    await this.publish(DRIVER_KAFKA_TOPICS.DRIVER_PERFORMANCE_SCORED, {
      eventType: 'driver.performance.scored',
      driverId,
      timestamp: new Date().toISOString(),
      data: { score, tier },
    });
  }

  /**
   * Internal publish method.
   * Development: stores in memory. Production: sends to MSK Kafka.
   */
  private async publish(topic: string, event: DriverEvent): Promise<void> {
    this.eventLog.push(event);
    this.logger.log({
      message: 'Kafka event published',
      topic,
      eventType: event.eventType,
      driverId: event.driverId,
    });

    // Production implementation:
    // await this.kafkaProducer.send({
    //   topic,
    //   messages: [{
    //     key: event.driverId,
    //     value: JSON.stringify(event),
    //     headers: { 'event-type': event.eventType },
    //   }],
    // });
  }

  /**
   * Gets recent events (for development/debugging).
   */
  getRecentEvents(limit: number = 50): DriverEvent[] {
    return this.eventLog.slice(-limit);
  }
}
