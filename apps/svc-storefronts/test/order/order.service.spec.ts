/**
 * Storefront Order Service Tests (P184)
 *
 * Tests for order placement, pricing calculation, and validation.
 *
 * @module svc-storefronts/test/order/order.service.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { StorefrontOrderService } from '../../src/order/order.service';

describe('StorefrontOrderService', () => {
  let service: StorefrontOrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorefrontOrderService],
    }).compile();

    service = module.get<StorefrontOrderService>(StorefrontOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('placeOrder', () => {
    const validOrder = {
      items: [
        {
          menuItemId: 'item-001',
          name: 'Bunny Chow',
          price: 65,
          quantity: 2,
          selectedOptions: [],
        },
        {
          menuItemId: 'item-002',
          name: 'Roti',
          price: 15,
          quantity: 3,
        },
      ],
      deliveryAddress: {
        formattedAddress: '45 Umhlanga Rocks Drive',
        lat: -29.723,
        lng: 31.084,
      },
      paymentMethod: 'paystack',
      specialInstructions: 'Extra spicy bunny chow',
    };

    it('should create an order with correct pricing', async () => {
      const result = await service.placeOrder('spice-route-kitchen', validOrder);

      expect(result).toBeDefined();
      expect(result.orderId).toBeDefined();
      expect(result.status).toBe('placed');
      expect(result.trackingUrl).toContain('spice-route-kitchen');
      expect(result.trackingUrl).toContain(result.orderId);

      // Subtotal: (65 * 2) + (15 * 3) = 130 + 45 = 175
      expect(result.subtotal).toBe(175);

      // Delivery fee: flat 25 (placeholder)
      expect(result.deliveryFee).toBe(25);

      // Service fee: 5% of 175 = 8.75
      expect(result.serviceFee).toBe(8.75);

      // Total: 175 + 25 + 8.75 = 208.75
      expect(result.total).toBe(208.75);
    });

    it('should reject order with no items', async () => {
      const emptyOrder = { ...validOrder, items: [] };
      await expect(
        service.placeOrder('spice-route-kitchen', emptyOrder),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject order with invalid quantity', async () => {
      const badOrder = {
        ...validOrder,
        items: [{ menuItemId: 'item-001', name: 'Test', price: 10, quantity: 0 }],
      };
      await expect(
        service.placeOrder('spice-route-kitchen', badOrder),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate options price adjustments', async () => {
      const orderWithOptions = {
        ...validOrder,
        items: [
          {
            menuItemId: 'item-001',
            name: 'Burger',
            price: 80,
            quantity: 1,
            selectedOptions: [
              { optionName: 'Size', choiceLabel: 'Large', priceAdjustment: 20 },
              { optionName: 'Extra', choiceLabel: 'Cheese', priceAdjustment: 10 },
            ],
          },
        ],
      };

      const result = await service.placeOrder('burger-place', orderWithOptions);
      // Subtotal: (80 + 20 + 10) * 1 = 110
      expect(result.subtotal).toBe(110);
    });
  });

  describe('getOrderStatus', () => {
    it('should throw NotFoundException for non-existent order', async () => {
      await expect(service.getOrderStatus('non-existent')).rejects.toThrow();
    });
  });
});
