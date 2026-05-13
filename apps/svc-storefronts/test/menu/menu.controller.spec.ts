/**
 * Menu Controller Tests (P183)
 *
 * Tests for menu CRUD and search endpoints.
 *
 * @module svc-storefronts/test/menu/menu.controller.spec
 */

import { Test, TestingModule } from '@nestjs/testing';

import { MenuController } from '../../src/menu/menu.controller';
import { MenuService } from '../../src/menu/menu.service';

describe('MenuController', () => {
  let controller: MenuController;
  let service: MenuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [MenuService],
    }).compile();

    controller = module.get<MenuController>(MenuController);
    service = module.get<MenuService>(MenuService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFullMenu', () => {
    it('should return full menu for a restaurant slug', async () => {
      const result = await controller.getFullMenu('spice-route-kitchen');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('restaurant');
      expect(result).toHaveProperty('categories');
    });
  });

  describe('searchMenuItems', () => {
    it('should return search results for a query', async () => {
      const result = await controller.searchMenuItems('bunny chow');
      expect(result).toBeDefined();
    });

    it('should accept dietary filters', async () => {
      const result = await controller.searchMenuItems(
        'burger',
        undefined,
        undefined,
        true,  // isVegetarian
        false, // isVegan
        true,  // isHalal
      );
      expect(result).toBeDefined();
    });
  });

  describe('createCategory', () => {
    it('should create a menu category', async () => {
      const dto = {
        name: 'Starters',
        slug: 'starters',
        restaurantId: 'restaurant-001',
        description: 'Light bites to start',
        displayOrder: 0,
      };

      const result = await controller.createCategory(dto);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('name', 'Starters');
    });
  });

  describe('createMenuItem', () => {
    it('should create a menu item', async () => {
      const dto = {
        name: 'Bunny Chow',
        restaurantId: 'restaurant-001',
        categoryId: 'category-001',
        price: 65,
        description: 'Traditional Durban bunny chow with lamb curry',
        allergens: ['gluten'],
        isHalal: true,
        isSpicy: true,
        spiceLevel: 3,
        preparationTime: 20,
      };

      const result = await controller.createMenuItem(dto);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('name', 'Bunny Chow');
      expect(result).toHaveProperty('price', 65);
    });
  });

  describe('toggleAvailability', () => {
    it('should throw NotFoundException for non-existent item', async () => {
      await expect(
        controller.toggleAvailability('non-existent', { isAvailable: false }),
      ).rejects.toThrow();
    });
  });
});
