/**
 * Restaurant Controller Tests (P181)
 *
 * Tests for the restaurant CRUD REST API endpoints.
 *
 * @module svc-storefronts/test/restaurant/restaurant.controller.spec
 */

import { Test, TestingModule } from '@nestjs/testing';

import { RestaurantController } from '../../src/restaurant/restaurant.controller';
import { RestaurantService } from '../../src/restaurant/restaurant.service';

describe('RestaurantController', () => {
  let controller: RestaurantController;
  let service: RestaurantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RestaurantController],
      providers: [RestaurantService],
    }).compile();

    controller = module.get<RestaurantController>(RestaurantController);
    service = module.get<RestaurantService>(RestaurantService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listRestaurants', () => {
    it('should return paginated restaurant list', async () => {
      const query = { page: 1, limit: 20 };
      const result = await controller.listRestaurants(query);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
    });

    it('should accept cuisine filter', async () => {
      const query = { page: 1, limit: 20, cuisine: 'indian' };
      const result = await controller.listRestaurants(query);
      expect(result).toBeDefined();
    });

    it('should accept search query', async () => {
      const query = { page: 1, limit: 20, search: 'pizza' };
      const result = await controller.listRestaurants(query);
      expect(result).toBeDefined();
    });
  });

  describe('getFeatured', () => {
    it('should return featured restaurants', async () => {
      const result = await controller.getFeatured();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getNearby', () => {
    it('should return nearby restaurants by coordinates', async () => {
      const result = await controller.getNearby(-29.8587, 31.0218, 10);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('create', () => {
    it('should create a new restaurant', async () => {
      const dto = {
        name: 'Spice Route Kitchen',
        slug: 'spice-route-kitchen',
        partnerId: 'partner-001',
        description: 'Authentic KZN Indian cuisine',
        cuisine: ['indian', 'halal'],
        address: {
          street: '123 Florida Road',
          suburb: 'Morningside',
          city: 'Durban',
          province: 'KwaZulu-Natal',
          postalCode: '4001',
          lat: -29.8387,
          lng: 31.0218,
        },
      };

      const result = await controller.create(dto);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('name', 'Spice Route Kitchen');
      expect(result).toHaveProperty('slug', 'spice-route-kitchen');
    });
  });

  describe('getBySlug', () => {
    it('should throw NotFoundException for non-existent slug', async () => {
      await expect(controller.getBySlug('non-existent')).rejects.toThrow();
    });
  });
});
