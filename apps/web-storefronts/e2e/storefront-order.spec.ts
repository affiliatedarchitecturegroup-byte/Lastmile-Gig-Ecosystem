/**
 * Storefront Order Flow E2E Tests
 * @module web-storefronts/e2e/storefront-order.spec
 * @description Playwright E2E tests for the customer ordering flow
 * @phase P203 - Storefront Playwright E2E Tests
 */

import { expect, test } from '@playwright/test';

/** Base URL for the storefront */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('Restaurant Storefront - Customer Ordering Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the store directory
    await page.goto(`${BASE_URL}/store`);
  });

  test('should display the restaurant directory', async ({ page }) => {
    // Verify directory page loads
    await expect(page).toHaveTitle(/Restaurants|Store/);

    // Check for search functionality
    const searchInput = page.locator('[aria-label="Search restaurants"]');
    await expect(searchInput).toBeVisible();
  });

  test('should navigate to a restaurant storefront', async ({ page }) => {
    // Click on the first restaurant card
    const restaurantCard = page.locator('.lmg-restaurant-card').first();
    await restaurantCard.click();

    // Verify storefront page loads with hero section
    await expect(page.locator('.lmg-storefront-hero')).toBeVisible();

    // Verify menu categories are visible
    await expect(page.locator('.lmg-menu-category-nav')).toBeVisible();
  });

  test('should display menu items with prices', async ({ page }) => {
    // Navigate to a restaurant storefront
    await page.goto(`${BASE_URL}/store/test-restaurant`);

    // Verify menu items are displayed
    const menuItems = page.locator('.lmg-menu-item-card');
    await expect(menuItems.first()).toBeVisible();

    // Check that prices are displayed in ZAR format
    const price = menuItems.first().locator('.lmg-menu-item-card__price');
    await expect(price).toContainText('R');
  });

  test('should add items to cart', async ({ page }) => {
    await page.goto(`${BASE_URL}/store/test-restaurant`);

    // Add first menu item to cart
    const addToCartButton = page
      .locator('.lmg-menu-item-card')
      .first()
      .locator('button', { hasText: /Add|Cart/ });
    await addToCartButton.click();

    // Verify cart drawer appears or cart count updates
    const cartIndicator = page.locator(
      '.lmg-cart-indicator, .lmg-cart-drawer',
    );
    await expect(cartIndicator).toBeVisible();
  });

  test('should open and display cart drawer', async ({ page }) => {
    await page.goto(`${BASE_URL}/store/test-restaurant`);

    // Add an item to cart first
    const addButton = page
      .locator('.lmg-menu-item-card')
      .first()
      .locator('button', { hasText: /Add|Cart/ });
    await addButton.click();

    // Open cart drawer
    const cartToggle = page.locator(
      '[aria-label="Open cart"], .lmg-cart-toggle',
    );
    await cartToggle.click();

    // Verify cart drawer content
    const cartDrawer = page.locator('.lmg-cart-drawer');
    await expect(cartDrawer).toBeVisible();

    // Verify item is in cart
    const cartItem = cartDrawer.locator('.lmg-cart-item');
    await expect(cartItem).toHaveCount(1);

    // Verify total is displayed
    const total = cartDrawer.locator('.lmg-cart-total');
    await expect(total).toContainText('R');
  });

  test('should update item quantity in cart', async ({ page }) => {
    await page.goto(`${BASE_URL}/store/test-restaurant`);

    // Add item
    await page
      .locator('.lmg-menu-item-card')
      .first()
      .locator('button', { hasText: /Add|Cart/ })
      .click();

    // Open cart
    await page
      .locator('[aria-label="Open cart"], .lmg-cart-toggle')
      .click();

    // Increase quantity
    const increaseButton = page.locator(
      '.lmg-cart-item .lmg-qty-increase, [aria-label="Increase quantity"]',
    );
    await increaseButton.click();

    // Verify quantity updated
    const quantity = page.locator('.lmg-cart-item .lmg-qty-value');
    await expect(quantity).toContainText('2');
  });

  test('should navigate through checkout flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/store/test-restaurant`);

    // Add item to cart
    await page
      .locator('.lmg-menu-item-card')
      .first()
      .locator('button', { hasText: /Add|Cart/ })
      .click();

    // Proceed to checkout
    const checkoutButton = page.locator(
      'button, a',
      { hasText: /Checkout|Proceed/ },
    );
    await checkoutButton.click();

    // Verify checkout page loads
    await expect(page).toHaveURL(/order|checkout/);

    // Verify checkout steps are visible
    const checkoutSteps = page.locator(
      '.lmg-checkout-steps, .lmg-checkout-flow',
    );
    await expect(checkoutSteps).toBeVisible();
  });

  test('should display delivery address step', async ({ page }) => {
    await page.goto(`${BASE_URL}/store/test-restaurant/order`);

    // Verify address input fields
    const addressField = page.locator(
      'input[name="address"], input[placeholder*="address" i]',
    );
    await expect(addressField).toBeVisible();
  });
});

test.describe('Restaurant Storefront - SEO & Accessibility', () => {
  test('should have correct meta tags on storefront page', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/store/test-restaurant`);

    // Check OG tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /.+/);

    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toHaveAttribute('content', /.+/);

    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveAttribute('content', 'restaurant');
  });

  test('should have JSON-LD structured data', async ({ page }) => {
    await page.goto(`${BASE_URL}/store/test-restaurant`);

    // Check for JSON-LD script tag
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd.first()).toBeAttached();

    // Parse and validate JSON-LD content
    const content = await jsonLd.first().textContent();
    if (content) {
      const data = JSON.parse(content);
      expect(data['@context']).toBe('https://schema.org');
      expect(data['@type']).toBe('Restaurant');
    }
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/store/test-restaurant`);

    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();

    // Check for navigation landmark
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeVisible();
  });

  test('should have alt text on all images', async ({ page }) => {
    await page.goto(`${BASE_URL}/store/test-restaurant`);

    // Get all images and verify they have alt text
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });
});
