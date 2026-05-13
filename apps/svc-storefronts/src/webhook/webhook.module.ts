/**
 * Webhook Module (P179, P182)
 *
 * Handles incoming webhooks from Sanity CMS for real-time
 * content synchronization.
 *
 * @module svc-storefronts/webhook/webhook.module
 */

import { Module } from '@nestjs/common';

import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
