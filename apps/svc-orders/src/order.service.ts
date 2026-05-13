/**
 * Order Service - Core business logic for order lifecycle management.
 *
 * Handles order placement, status transitions, delivery verification,
 * and coordinates Kafka event publishing and MongoDB event logging.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.4
 * @module svc-orders
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Order } from '@lastmile-gig/shared-types';
import { OrderRepository } from './repositories/order.repository';
import { OrderEventRepository } from './repositories/order-event.repository';
import { OrderKafkaProducer } from './kafka/order-kafka.producer';
import { PlaceOrderRequestDto } from './dto/place-order.dto';
import {
  UpdateOrderStatusDto,
  OrderStatusDto,
  ORDER_STATUS_TRANSITIONS,
} from './dto/update-order-status.dto';

/** Delivery fee calculation constants */
const BASE_DELIVERY_FEE_ZAR = 25.0;
const PER_KM_RATE_ZAR = 5.0;
const DEFAULT_DELIVERY_DISTANCE_KM = 3.0;

/** GPS verification constants */
const DELIVERY_VERIFICATION_RADIUS_METERS = 100;
const EARTH_RADIUS_KM = 6371;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderEventRepository: OrderEventRepository,
    private readonly kafkaProducer: OrderKafkaProducer,
  ) {}

  /**
   * Place a new order.
   *
   * Calculates totals, persists to Supabase, logs event to MongoDB,
   * and publishes order.placed to Kafka to trigger dispatch.
   *
   * @param customerId - The authenticated customer's UUID
   * @param dto - Validated order placement request
   * @returns The created order
   */
  async placeOrder(customerId: string, dto: PlaceOrderRequestDto): Promise<Order> {
    this.logger.log(`Placing order for customer=${customerId}, partner=${dto.partnerId}`);

    const subtotal = this.calculateSubtotal(dto.items);
    const deliveryFee = this.calculateDeliveryFee(DEFAULT_DELIVERY_DISTANCE_KM);
    const total = subtotal + deliveryFee;

    const order = await this.orderRepository.insert({
      customerId,
      partnerId: dto.partnerId,
      items: dto.items.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      subtotal,
      deliveryFee,
      total,
      paymentMethod: dto.paymentMethod,
      deliveryAddress: {
        street: dto.deliveryAddress.street,
        latitude: dto.deliveryAddress.latitude,
        longitude: dto.deliveryAddress.longitude,
        instructions: dto.deliveryAddress.instructions ?? null,
      },
    });

    await this.orderEventRepository.logEvent({
      orderId: order.id,
      eventType: 'order.placed',
      previousStatus: null,
      newStatus: 'placed',
      triggeredBy: customerId,
      metadata: { partnerId: dto.partnerId, total, itemCount: dto.items.length },
    });

    await this.kafkaProducer.publishOrderPlaced({
      eventType: 'order.placed',
      payload: {
        orderId: order.id,
        customerId,
        partnerId: dto.partnerId,
        items: dto.items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        total,
        deliveryAddress: {
          latitude: dto.deliveryAddress.latitude,
          longitude: dto.deliveryAddress.longitude,
          street: dto.deliveryAddress.street,
        },
        zone: this.resolveDeliveryZone(
          dto.deliveryAddress.latitude,
          dto.deliveryAddress.longitude,
        ),
      },
    });

    this.logger.log(`Order ${order.id} placed successfully, total=R${total.toFixed(2)}`);
    return order;
  }

  /**
   * Retrieve a single order by ID.
   *
   * @throws NotFoundException if order does not exist
   */
  async getOrder(id: string): Promise<Order> {
    return this.orderRepository.findById(id);
  }

  /**
   * Update order status with state machine validation.
   *
   * Validates the status transition is legal according to ORDER_STATUS_TRANSITIONS.
   * Publishes the appropriate Kafka event and logs to MongoDB.
   *
   * @throws BadRequestException for invalid status transitions
   * @throws NotFoundException if order does not exist
   */
  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const currentOrder = await this.orderRepository.findById(id);
    const currentStatus = currentOrder.status as OrderStatusDto;
    const newStatus = dto.status;

    const validTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];
    if (!validTransitions || !validTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition: ${currentStatus} -> ${newStatus}. ` +
          `Valid transitions from ${currentStatus}: [${(validTransitions ?? []).join(', ')}]`,
      );
    }

    const updatedOrder = await this.orderRepository.updateStatus(id, {
      status: newStatus,
      driverId: dto.driverId,
      reason: dto.reason,
    });

    await this.orderEventRepository.logEvent({
      orderId: id,
      eventType: `order.${newStatus}`,
      previousStatus: currentStatus,
      newStatus,
      triggeredBy: dto.driverId ?? 'system',
      metadata: { reason: dto.reason },
    });

    await this.publishStatusEvent(updatedOrder, newStatus);

    this.logger.log(`Order ${id} status updated: ${currentStatus} -> ${newStatus}`);
    return updatedOrder;
  }

  /**
   * Retrieve paginated order history for a customer.
   */
  async getCustomerOrders(
    customerId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ orders: Order[]; total: number }> {
    return this.orderRepository.findByCustomerId(customerId, page, pageSize);
  }

  /**
   * Retrieve paginated order history for a driver.
   */
  async getDriverOrders(
    driverId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ orders: Order[]; total: number }> {
    return this.orderRepository.findByDriverId(driverId, page, pageSize);
  }

  /**
   * Verify a delivery with GPS coordinates and photo hash.
   *
   * Checks that the delivery GPS coordinates are within 100m of the
   * delivery address. If verified, publishes order.delivered to Kafka
   * which triggers blockchain proof-of-delivery recording.
   *
   * @returns Verification result with distance information
   */
  async verifyDelivery(
    orderId: string,
    driverId: string,
    verification: { latitude: number; longitude: number; photoHash: string },
  ): Promise<{ verified: boolean; distanceMeters: number }> {
    const order = await this.orderRepository.findById(orderId);

    if (order.status !== 'in_transit' && order.status !== 'delivered') {
      throw new BadRequestException(
        `Cannot verify delivery for order in status: ${order.status}`,
      );
    }

    const distanceMeters = this.calculateDistanceMeters(
      verification.latitude,
      verification.longitude,
      order.deliveryAddress.latitude,
      order.deliveryAddress.longitude,
    );

    const withinRange = distanceMeters <= DELIVERY_VERIFICATION_RADIUS_METERS;

    if (withinRange) {
      await this.orderRepository.updateDeliveryVerification(
        orderId,
        verification.photoHash,
        null,
      );

      if (order.status !== 'delivered') {
        await this.orderRepository.updateStatus(orderId, { status: 'delivered' });
      }

      await this.orderEventRepository.logEvent({
        orderId,
        eventType: 'order.delivery.verified',
        previousStatus: order.status,
        newStatus: 'delivered',
        triggeredBy: driverId,
        metadata: {
          distanceMeters: Math.round(distanceMeters),
          photoHash: verification.photoHash,
          gps: { lat: verification.latitude, lng: verification.longitude },
        },
      });

      await this.kafkaProducer.publishOrderDelivered({
        eventType: 'order.delivered',
        payload: {
          orderId,
          driverId,
          deliveryLatitude: verification.latitude,
          deliveryLongitude: verification.longitude,
          photoHash: verification.photoHash,
          deliveredAt: new Date().toISOString(),
        },
      });

      this.logger.log(
        `Delivery verified for order ${orderId}, distance=${Math.round(distanceMeters)}m`,
      );
    } else {
      this.logger.warn(
        `Delivery verification failed for order ${orderId}: ` +
          `distance=${Math.round(distanceMeters)}m exceeds ${DELIVERY_VERIFICATION_RADIUS_METERS}m threshold`,
      );
    }

    return { verified: withinRange, distanceMeters: Math.round(distanceMeters) };
  }

  /**
   * Get the full event history for an order (from MongoDB).
   */
  async getOrderEventHistory(orderId: string): Promise<unknown[]> {
    return this.orderEventRepository.getEventHistory(orderId);
  }

  /**
   * Calculate subtotal from order items.
   */
  private calculateSubtotal(items: Array<{ quantity: number; unitPrice: number }>): number {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }

  /**
   * Calculate delivery fee based on distance.
   * Base fee + per-km rate.
   */
  private calculateDeliveryFee(distanceKm: number): number {
    return BASE_DELIVERY_FEE_ZAR + distanceKm * PER_KM_RATE_ZAR;
  }

  /**
   * Resolve delivery zone from GPS coordinates.
   * Simplified zone resolution based on latitude/longitude ranges.
   */
  private resolveDeliveryZone(latitude: number, longitude: number): string {
    if (latitude >= -30.0 && latitude <= -29.0 && longitude >= 30.0 && longitude <= 31.5) {
      return 'KZN-North';
    }
    if (latitude >= -30.5 && latitude < -30.0 && longitude >= 30.0 && longitude <= 31.5) {
      return 'KZN-South';
    }
    if (latitude >= -26.5 && latitude <= -25.5 && longitude >= 27.5 && longitude <= 28.5) {
      return 'Gauteng-North';
    }
    if (latitude >= -27.0 && latitude < -26.5 && longitude >= 27.5 && longitude <= 28.5) {
      return 'Gauteng-South';
    }
    if (latitude >= -34.5 && latitude <= -33.5 && longitude >= 18.0 && longitude <= 19.0) {
      return 'Western-Cape';
    }
    return 'KZN-CBD';
  }

  /**
   * Calculate distance between two GPS coordinates using the Haversine formula.
   * Returns distance in meters.
   */
  private calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) *
        Math.cos(this.degreesToRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c * 1000;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Publish the appropriate Kafka event based on the new status.
   */
  private async publishStatusEvent(order: Order, newStatus: OrderStatusDto): Promise<void> {
    switch (newStatus) {
      case OrderStatusDto.DISPATCHED:
        await this.kafkaProducer.publishOrderDispatched({
          eventType: 'order.dispatched',
          payload: {
            orderId: order.id,
            driverId: order.driverId ?? '',
            estimatedMinutes: 0,
            routeDistanceKm: 0,
          },
        });
        break;

      case OrderStatusDto.CANCELLED:
        await this.kafkaProducer.publishOrderCancelled({
          eventType: 'order.cancelled',
          payload: {
            orderId: order.id,
            cancelledBy: order.driverId ?? 'system',
            reason: order.cancelReason ?? 'No reason provided',
          },
        });
        break;

      default:
        break;
    }
  }
}
