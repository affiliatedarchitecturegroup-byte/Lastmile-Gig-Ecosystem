/**
 * Order Module - Root module for the Order Service.
 *
 * Registers all providers: controller, service, repository, Kafka producer,
 * and MongoDB event repository.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.4
 * @module svc-orders
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderRepository } from './repositories/order.repository';
import { OrderEventRepository } from './repositories/order-event.repository';
import { OrderKafkaProducer } from './kafka/order-kafka.producer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderRepository,
    OrderEventRepository,
    OrderKafkaProducer,
  ],
  exports: [OrderService],
})
export class OrderModule {}
