/**
 * Webhook Module
 * @module api-gateway/webhooks/webhook.module
 * @description NestJS module for payment webhook handling
 * @phase P213 - Payment Service Webhook Receiver
 */

import { Module } from '@nestjs/common';

import { WebhookController } from './webhook.controller';

@Module({
  controllers: [WebhookController],
  providers: [],
})
export class WebhookModule {}
