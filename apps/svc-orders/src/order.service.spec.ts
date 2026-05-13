/**
 * Order Service - Unit Tests
 *
 * Tests for order placement, status transitions, delivery verification,
 * and Kafka event publishing. Coverage target: 80%+.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.4
 * @module svc-orders
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderRepository } from './repositories/order.repository';
import { OrderEventRepository } from './repositories/order-event.repository';
import { OrderKafkaProducer } from './kafka/order-kafka.producer';
import { PlaceOrderRequestDto, PaymentMethodDto } from './dto/place-order.dto';
import { OrderStatusDto } from './dto/update-order-status.dto';
import type { Order } from '@lastmile-gig/shared-types';

const mockOrder: Order = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  customerId: 'cust-001',
  partnerId: 'partner-001',
  driverId: null,
  status: 'placed' as Order['status'],
  items: [{ itemId: 'item-1', name: 'Bunny Chow', quantity: 2, unitPrice: 45.0 }],
  subtotal: 90.0,
  deliveryFee: 40.0,
  total: 130.0,
  paymentMethod: 'card' as Order['paymentMethod'],
  paymentRef: null,
  deliveryAddress: {
    street: '123 Florida Road, Durban',
    latitude: -29.8587,
    longitude: 31.0218,
    instructions: 'Gate code: 1234',
  },
  placedAt: '2026-05-13T10:00:00.000Z',
  dispatchedAt: null,
  deliveredAt: null,
  deliveryPhotoHash: null,
  blockchainTx: null,
  cancelledAt: null,
  cancelReason: null,
};

const mockPlaceOrderDto: PlaceOrderRequestDto = {
  partnerId: 'partner-001',
  items: [{ itemId: 'item-1', name: 'Bunny Chow', quantity: 2, unitPrice: 45.0 }],
  deliveryAddress: {
    street: '123 Florida Road, Durban',
    latitude: -29.8587,
    longitude: 31.0218,
    instructions: 'Gate code: 1234',
  },
  paymentMethod: PaymentMethodDto.CARD,
};

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let eventRepository: jest.Mocked<OrderEventRepository>;
  let kafkaProducer: jest.Mocked<OrderKafkaProducer>;

  beforeEach(async () => {
    const mockOrderRepository = {
      insert: jest.fn(),
      findById: jest.fn(),
      findByCustomerId: jest.fn(),
      findByDriverId: jest.fn(),
      updateStatus: jest.fn(),
      updateDeliveryVerification: jest.fn(),
    };

    const mockEventRepository = {
      logEvent: jest.fn(),
      getEventHistory: jest.fn(),
      countEventsByType: jest.fn(),
    };

    const mockKafkaProducer = {
      publishOrderPlaced: jest.fn(),
      publishOrderDispatched: jest.fn(),
      publishOrderDelivered: jest.fn(),
      publishOrderCancelled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: OrderRepository, useValue: mockOrderRepository },
        { provide: OrderEventRepository, useValue: mockEventRepository },
        { provide: OrderKafkaProducer, useValue: mockKafkaProducer },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get(OrderRepository);
    eventRepository = module.get(OrderEventRepository);
    kafkaProducer = module.get(OrderKafkaProducer);
  });

  describe('placeOrder', () => {
    it('should create an order with calculated totals', async () => {
      orderRepository.insert.mockResolvedValue(mockOrder);
      eventRepository.logEvent.mockResolvedValue({} as never);
      kafkaProducer.publishOrderPlaced.mockResolvedValue(undefined);

      const result = await service.placeOrder('cust-001', mockPlaceOrderDto);

      expect(result).toEqual(mockOrder);
      expect(orderRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-001',
          partnerId: 'partner-001',
        }),
      );
    });

    it('should publish order.placed Kafka event', async () => {
      orderRepository.insert.mockResolvedValue(mockOrder);
      eventRepository.logEvent.mockResolvedValue({} as never);
      kafkaProducer.publishOrderPlaced.mockResolvedValue(undefined);

      await service.placeOrder('cust-001', mockPlaceOrderDto);

      expect(kafkaProducer.publishOrderPlaced).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.placed',
          payload: expect.objectContaining({
            orderId: mockOrder.id,
            customerId: 'cust-001',
          }),
        }),
      );
    });

    it('should log order.placed event to MongoDB', async () => {
      orderRepository.insert.mockResolvedValue(mockOrder);
      eventRepository.logEvent.mockResolvedValue({} as never);
      kafkaProducer.publishOrderPlaced.mockResolvedValue(undefined);

      await service.placeOrder('cust-001', mockPlaceOrderDto);

      expect(eventRepository.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: mockOrder.id,
          eventType: 'order.placed',
          newStatus: 'placed',
        }),
      );
    });

    it('should calculate correct subtotal from items', async () => {
      orderRepository.insert.mockResolvedValue(mockOrder);
      eventRepository.logEvent.mockResolvedValue({} as never);
      kafkaProducer.publishOrderPlaced.mockResolvedValue(undefined);

      await service.placeOrder('cust-001', mockPlaceOrderDto);

      expect(orderRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 90.0,
        }),
      );
    });
  });

  describe('getOrder', () => {
    it('should return an order by ID', async () => {
      orderRepository.findById.mockResolvedValue(mockOrder);
      const result = await service.getOrder(mockOrder.id);
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException for non-existent order', async () => {
      orderRepository.findById.mockRejectedValue(new NotFoundException());
      await expect(service.getOrder('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should allow valid status transition: placed -> confirmed', async () => {
      const placedOrder = { ...mockOrder, status: 'placed' as Order['status'] };
      const confirmedOrder = { ...mockOrder, status: 'confirmed' as Order['status'] };

      orderRepository.findById.mockResolvedValue(placedOrder);
      orderRepository.updateStatus.mockResolvedValue(confirmedOrder);
      eventRepository.logEvent.mockResolvedValue({} as never);

      const result = await service.updateStatus(mockOrder.id, {
        status: OrderStatusDto.CONFIRMED,
      });

      expect(result.status).toBe('confirmed');
    });

    it('should allow valid status transition: confirmed -> dispatched', async () => {
      const confirmedOrder = { ...mockOrder, status: 'confirmed' as Order['status'] };
      const dispatchedOrder = {
        ...mockOrder,
        status: 'dispatched' as Order['status'],
        driverId: 'driver-001',
      };

      orderRepository.findById.mockResolvedValue(confirmedOrder);
      orderRepository.updateStatus.mockResolvedValue(dispatchedOrder);
      eventRepository.logEvent.mockResolvedValue({} as never);
      kafkaProducer.publishOrderDispatched.mockResolvedValue(undefined);

      const result = await service.updateStatus(mockOrder.id, {
        status: OrderStatusDto.DISPATCHED,
        driverId: 'driver-001',
      });

      expect(result.status).toBe('dispatched');
      expect(kafkaProducer.publishOrderDispatched).toHaveBeenCalled();
    });

    it('should reject invalid status transition: placed -> delivered', async () => {
      const placedOrder = { ...mockOrder, status: 'placed' as Order['status'] };
      orderRepository.findById.mockResolvedValue(placedOrder);

      await expect(
        service.updateStatus(mockOrder.id, { status: OrderStatusDto.DELIVERED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid status transition: delivered -> placed', async () => {
      const deliveredOrder = { ...mockOrder, status: 'delivered' as Order['status'] };
      orderRepository.findById.mockResolvedValue(deliveredOrder);

      await expect(
        service.updateStatus(mockOrder.id, { status: OrderStatusDto.PLACED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow cancellation from any active status', async () => {
      const confirmedOrder = { ...mockOrder, status: 'confirmed' as Order['status'] };
      const cancelledOrder = {
        ...mockOrder,
        status: 'cancelled' as Order['status'],
        cancelReason: 'Customer requested',
      };

      orderRepository.findById.mockResolvedValue(confirmedOrder);
      orderRepository.updateStatus.mockResolvedValue(cancelledOrder);
      eventRepository.logEvent.mockResolvedValue({} as never);
      kafkaProducer.publishOrderCancelled.mockResolvedValue(undefined);

      const result = await service.updateStatus(mockOrder.id, {
        status: OrderStatusDto.CANCELLED,
        reason: 'Customer requested',
      });

      expect(result.status).toBe('cancelled');
      expect(kafkaProducer.publishOrderCancelled).toHaveBeenCalled();
    });

    it('should reject cancellation of already cancelled order', async () => {
      const cancelledOrder = { ...mockOrder, status: 'cancelled' as Order['status'] };
      orderRepository.findById.mockResolvedValue(cancelledOrder);

      await expect(
        service.updateStatus(mockOrder.id, { status: OrderStatusDto.CANCELLED }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyDelivery', () => {
    it('should verify delivery when GPS is within 100m', async () => {
      const inTransitOrder = {
        ...mockOrder,
        status: 'in_transit' as Order['status'],
        driverId: 'driver-001',
      };
      orderRepository.findById.mockResolvedValue(inTransitOrder);
      orderRepository.updateDeliveryVerification.mockResolvedValue(inTransitOrder);
      orderRepository.updateStatus.mockResolvedValue({
        ...inTransitOrder,
        status: 'delivered' as Order['status'],
      });
      eventRepository.logEvent.mockResolvedValue({} as never);
      kafkaProducer.publishOrderDelivered.mockResolvedValue(undefined);

      const result = await service.verifyDelivery(mockOrder.id, 'driver-001', {
        latitude: -29.8587,
        longitude: 31.0218,
        photoHash: 'abc123hash',
      });

      expect(result.verified).toBe(true);
      expect(result.distanceMeters).toBeLessThanOrEqual(100);
    });

    it('should reject delivery when GPS exceeds 100m radius', async () => {
      const inTransitOrder = {
        ...mockOrder,
        status: 'in_transit' as Order['status'],
        driverId: 'driver-001',
      };
      orderRepository.findById.mockResolvedValue(inTransitOrder);

      const result = await service.verifyDelivery(mockOrder.id, 'driver-001', {
        latitude: -29.87,
        longitude: 31.04,
        photoHash: 'abc123hash',
      });

      expect(result.verified).toBe(false);
      expect(result.distanceMeters).toBeGreaterThan(100);
    });

    it('should reject verification for order not in transit', async () => {
      const placedOrder = { ...mockOrder, status: 'placed' as Order['status'] };
      orderRepository.findById.mockResolvedValue(placedOrder);

      await expect(
        service.verifyDelivery(mockOrder.id, 'driver-001', {
          latitude: -29.8587,
          longitude: 31.0218,
          photoHash: 'abc123hash',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should publish order.delivered Kafka event on success', async () => {
      const inTransitOrder = {
        ...mockOrder,
        status: 'in_transit' as Order['status'],
        driverId: 'driver-001',
      };
      orderRepository.findById.mockResolvedValue(inTransitOrder);
      orderRepository.updateDeliveryVerification.mockResolvedValue(inTransitOrder);
      orderRepository.updateStatus.mockResolvedValue({
        ...inTransitOrder,
        status: 'delivered' as Order['status'],
      });
      eventRepository.logEvent.mockResolvedValue({} as never);
      kafkaProducer.publishOrderDelivered.mockResolvedValue(undefined);

      await service.verifyDelivery(mockOrder.id, 'driver-001', {
        latitude: -29.8587,
        longitude: 31.0218,
        photoHash: 'abc123hash',
      });

      expect(kafkaProducer.publishOrderDelivered).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.delivered',
          payload: expect.objectContaining({
            orderId: mockOrder.id,
            driverId: 'driver-001',
            photoHash: 'abc123hash',
          }),
        }),
      );
    });
  });

  describe('getCustomerOrders', () => {
    it('should return paginated customer orders', async () => {
      orderRepository.findByCustomerId.mockResolvedValue({
        orders: [mockOrder],
        total: 1,
      });

      const result = await service.getCustomerOrders('cust-001', 1, 20);

      expect(result.orders).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getDriverOrders', () => {
    it('should return paginated driver orders', async () => {
      orderRepository.findByDriverId.mockResolvedValue({
        orders: [mockOrder],
        total: 1,
      });

      const result = await service.getDriverOrders('driver-001', 1, 20);

      expect(result.orders).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
