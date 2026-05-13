/**
 * Webhook Service Tests (P182)
 *
 * Tests for Sanity webhook processing and HMAC verification.
 *
 * @module svc-storefronts/test/webhook/webhook.service.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'crypto';

import { WebhookService } from '../../src/webhook/webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookService],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifySignature', () => {
    const secret = 'dev-webhook-secret';

    it('should verify a valid HMAC-SHA256 signature', () => {
      const payload = JSON.stringify({ _id: 'test-123', _type: 'restaurant' });
      const validSignature = createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      expect(service.verifySignature(payload, validSignature)).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const payload = JSON.stringify({ _id: 'test-123' });
      expect(service.verifySignature(payload, 'invalid-signature')).toBe(false);
    });

    it('should reject empty signature', () => {
      const payload = JSON.stringify({ _id: 'test-123' });
      expect(service.verifySignature(payload, '')).toBe(false);
    });

    it('should reject tampered payload', () => {
      const originalPayload = JSON.stringify({ _id: 'test-123', _type: 'restaurant' });
      const signature = createHmac('sha256', secret)
        .update(originalPayload)
        .digest('hex');

      const tamperedPayload = JSON.stringify({ _id: 'test-123', _type: 'admin' });
      expect(service.verifySignature(tamperedPayload, signature)).toBe(false);
    });
  });

  describe('processWebhook', () => {
    it('should process restaurant document type', async () => {
      const data = {
        _id: 'restaurant-001',
        _type: 'restaurant',
        name: 'Test Restaurant',
        slug: { current: 'test-restaurant' },
        isActive: true,
      };

      await expect(
        service.processWebhook('restaurant-001', 'restaurant', data),
      ).resolves.not.toThrow();
    });

    it('should process menuItem document type', async () => {
      const data = {
        _id: 'item-001',
        _type: 'menuItem',
        name: 'Test Item',
        price: 50,
        isAvailable: true,
      };

      await expect(
        service.processWebhook('item-001', 'menuItem', data),
      ).resolves.not.toThrow();
    });

    it('should process menuCategory document type', async () => {
      const data = {
        _id: 'cat-001',
        _type: 'menuCategory',
        name: 'Starters',
        displayOrder: 0,
      };

      await expect(
        service.processWebhook('cat-001', 'menuCategory', data),
      ).resolves.not.toThrow();
    });

    it('should handle unknown document types gracefully', async () => {
      await expect(
        service.processWebhook('unknown-001', 'unknownType', {}),
      ).resolves.not.toThrow();
    });
  });

  describe('fullMenuSync', () => {
    it('should not throw for valid partner ID', async () => {
      await expect(
        service.fullMenuSync('partner-001'),
      ).resolves.not.toThrow();
    });
  });
});
