/**
 * Webhook Controller (P179, P182)
 *
 * Receives webhook events from Sanity CMS when restaurant content
 * is created, updated, or deleted. Syncs changes to MongoDB and
 * updates OpenSearch index.
 *
 * Sanity webhook configuration:
 * - URL: POST /v1/webhooks/sanity
 * - Secret: HMAC-SHA256 signature verification
 * - Events: create, update, delete on restaurant, menuCategory, menuItem
 *
 * Flow:
 * 1. Sanity publishes content change
 * 2. Webhook hits this endpoint
 * 3. HMAC signature verified
 * 4. Document synced to MongoDB
 * 5. OpenSearch index updated (menus)
 *
 * @module svc-storefronts/webhook/webhook.controller
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

import { WebhookService } from './webhook.service';

interface SanityWebhookBody {
  _id: string;
  _type: string;
  _rev: string;
  _createdAt: string;
  _updatedAt: string;
  [key: string]: unknown;
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('sanity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Sanity CMS webhook events' })
  @ApiHeader({ name: 'sanity-webhook-signature', description: 'HMAC-SHA256 signature' })
  async handleSanityWebhook(
    @Headers('sanity-webhook-signature') signature: string,
    @Body() body: SanityWebhookBody,
  ): Promise<{ status: string; documentId: string; type: string }> {
    // 1. Verify HMAC signature
    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const isValid = this.webhookService.verifySignature(
      JSON.stringify(body),
      signature,
    );

    if (!isValid) {
      this.logger.warning('Invalid Sanity webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // 2. Validate document type
    const validTypes = ['restaurant', 'menuCategory', 'menuItem', 'partnerSettings', 'deliveryZone'];
    if (!validTypes.includes(body._type)) {
      throw new BadRequestException(`Unsupported document type: ${body._type}`);
    }

    // 3. Process the webhook
    this.logger.log(
      `Sanity webhook received: ${body._type} (${body._id})`,
    );

    await this.webhookService.processWebhook(body._id, body._type, body);

    return {
      status: 'processed',
      documentId: body._id,
      type: body._type,
    };
  }

  @Post('sanity/menu-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manual menu sync trigger for a partner' })
  async triggerMenuSync(
    @Body() body: { partnerId: string },
  ): Promise<{ status: string }> {
    this.logger.log(`Manual menu sync for partner: ${body.partnerId}`);
    await this.webhookService.fullMenuSync(body.partnerId);
    return { status: 'sync_triggered' };
  }
}
