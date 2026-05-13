/**
 * Storefront Service - Unit Tests
 *
 * Tests for restaurant listing, menu queries, and partner analytics.
 * Coverage target: 80%+.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.11
 * @module svc-storefronts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RestaurantService } from './services/restaurant.service';
import { MenuService } from './services/menu.service';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { MenuRepository } from './repositories/menu.repository';
import type { RestaurantDocument } from './repositories/restaurant.repository';

const mockRestaurant: RestaurantDocument = {
  _id: 'rest-001',
  partnerId: 'partner-001',
  name: 'Durban Bunny House',
  slug: 'durban-bunny-house',
  description: 'Best bunny chows in KZN',
  partnerType: 'restaurant',
  heroImageUrl: null,
  logoUrl: null,
  cuisine: ['Indian', 'South African'],
  address: {
    street: '45 Florida Road',
    city: 'Durban',
    province: 'KwaZulu-Natal',
    postalCode: '4001',
    latitude: -29.8587,
    longitude: 31.0218,
  },
  phone: '+27312345678',
  email: 'info@durbanbunny.co.za',
  operatingHours: [
    { day: 'monday', openTime: '08:00', closeTime: '22:00', isClosed: false },
  ],
  deliveryRadius: 10,
  minimumOrder: 50,
  averageDeliveryTime: 30,
  rating: 4.5,
  reviewCount: 120,
  isActive: true,
  isFeatured: true,
  createdAt: '2026-05-13T00:00:00.000Z',
  updatedAt: '2026-05-13T00:00:00.000Z',
};

describe('RestaurantService', () => {
  let service: RestaurantService;
  let repository: jest.Mocked<RestaurantRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      findBySlug: jest.fn(),
      findById: jest.fn(),
      findByPartnerId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      search: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantService,
        { provide: RestaurantRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<RestaurantService>(RestaurantService);
    repository = module.get(RestaurantRepository);
  });

  describe('listRestaurants', () => {
    it('should return all active restaurants', async () => {
      repository.findAll.mockResolvedValue([mockRestaurant]);
      const result = await service.listRestaurants({ isActive: true });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Durban Bunny House');
    });

    it('should filter by cuisine', async () => {
      repository.findAll.mockResolvedValue([mockRestaurant]);
      const result = await service.listRestaurants({ cuisine: 'Indian' });
      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ cuisine: 'Indian' }),
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by partner type', async () => {
      repository.findAll.mockResolvedValue([]);
      await service.listRestaurants({ partnerType: 'cafe' });
      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ partnerType: 'cafe' }),
      );
    });
  });

  describe('getBySlug', () => {
    it('should return restaurant by slug', async () => {
      repository.findBySlug.mockResolvedValue(mockRestaurant);
      const result = await service.getBySlug('durban-bunny-house');
      expect(result.slug).toBe('durban-bunny-house');
    });

    it('should throw NotFoundException for non-existent slug', async () => {
      repository.findBySlug.mockRejectedValue(new NotFoundException());
      await expect(service.getBySlug('not-a-restaurant')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new restaurant', async () => {
      repository.create.mockResolvedValue(mockRestaurant);

      const result = await service.create({
        partnerId: 'partner-001',
        name: 'Durban Bunny House',
        slug: 'durban-bunny-house',
        description: 'Best bunny chows in KZN',
        partnerType: 'restaurant',
        address: mockRestaurant.address,
      });

      expect(result.name).toBe('Durban Bunny House');
      expect(repository.create).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search restaurants by name', async () => {
      repository.search.mockResolvedValue([mockRestaurant]);
      const result = await service.search('bunny');
      expect(result).toHaveLength(1);
    });
  });
});

describe('MenuService', () => {
  let service: MenuService;
  let repository: jest.Mocked<MenuRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findCategoriesByRestaurant: jest.fn(),
      findItemsByRestaurant: jest.fn(),
      findItemsByCategory: jest.fn(),
      findPopularItems: jest.fn(),
      upsertCategory: jest.fn(),
      upsertItem: jest.fn(),
      searchItems: jest.fn(),
      bulkUpsertItems: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: MenuRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
    repository = module.get(MenuRepository);
  });

  describe('getFullMenu', () => {
    it('should return structured menu with categories and items', async () => {
      repository.findCategoriesByRestaurant.mockResolvedValue([
        { _id: 'cat-1', restaurantId: 'rest-001', name: 'Starters', slug: 'starters', description: null, sortOrder: 0, isActive: true },
      ]);
      repository.findItemsByRestaurant.mockResolvedValue([
        {
          _id: 'item-1', restaurantId: 'rest-001', categoryId: 'cat-1', categoryName: 'Starters',
          name: 'Samosas', slug: 'samosas', description: 'Crispy triangles', price: 35,
          discountPrice: null, imageUrl: null, cloudinaryUrl: null, tags: [], allergens: [],
          dietaryFlags: ['vegetarian'], preparationTime: 10, isAvailable: true, isPopular: true,
          sortOrder: 0, createdAt: '', updatedAt: '',
        },
      ]);
      repository.findPopularItems.mockResolvedValue([]);

      const result = await service.getFullMenu('rest-001');

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].items).toHaveLength(1);
      expect(result.categories[0].items[0].name).toBe('Samosas');
      expect(result.totalItems).toBe(1);
    });
  });

  describe('syncFromSanity', () => {
    it('should bulk upsert menu items from Sanity payload', async () => {
      repository.bulkUpsertItems.mockResolvedValue(2);

      const result = await service.syncFromSanity('rest-001', {
        items: [
          { _id: 'item-1', name: 'Samosas', price: 35, categoryId: 'cat-1', categoryName: 'Starters' },
          { _id: 'item-2', name: 'Paneer Tikka', price: 55, categoryId: 'cat-1', categoryName: 'Starters' },
        ],
      });

      expect(result.synced).toBe(2);
      expect(repository.bulkUpsertItems).toHaveBeenCalled();
    });

    it('should return 0 when no items in payload', async () => {
      const result = await service.syncFromSanity('rest-001', {});
      expect(result.synced).toBe(0);
    });
  });
});
