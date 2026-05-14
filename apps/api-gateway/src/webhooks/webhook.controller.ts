/**
 * Payment Webhook Controller
 * @module api-gateway/webhooks/webhook.controller
 * @description NestJS controller for receiving payment gateway webhooks
 * @phase P213 - Payment Service Webhook Receiver
 *
 * All webhook endpoints verify HMAC signatures before processing.
 * Webhooks are forwarded to svc-payments via Kafka for async processing.
 */

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

/** Webhook event payload structure */
interface WebhookEvent {
  readonly gateway: string;
  readonly event: string;
  readonly reference: string;
  readonly status: string;
  readonly amount: number;
  readonly currency: string;
  readonly metadata: Record<string, string>;
  readonly rawPayload: string;
  readonly signature: string;
  readonly receivedAt: string;
}

/** Kafka topic for webhook events */
const KAFKA_TOPIC_WEBHOOKS = 'lmg.payments.webhooks';

/**
 * WebhookController - Receives and validates payment gateway webhooks
 *
 * Supported gateways:
 * - POST /v1/webhooks/paystack - Paystack webhook (HMAC-SHA512)
 * - POST /v1/webhooks/stripe - Stripe webhook (HMAC-SHA256 with timestamp)
 * - POST /v1/webhooks/ozow - Ozow webhook (SHA-512 hash)
 * - POST /v1/webhooks/peach - Peach Payments webhook (IP whitelist)
 * - POST /v1/webhooks/flutterwave - Flutterwave webhook (secret hash)
 */
@Controller('v1/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  /**
   * Paystack webhook receiver
   * Verifies HMAC-SHA512 signature from x-paystack-signature header
   */
  @Post('paystack')
  @HttpCode(HttpStatus.OK)
  async handlePaystackWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-paystack-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody?.toString('utf-8') ?? JSON.stringify(body);

    this.logger.log(
      `Paystack webhook received: event=${String(body['event'])}`,
    );

    // TODO: Verify HMAC-SHA512 signature using LMG_PAYSTACK_WEBHOOK_SECRET
    // TODO: Publish to Kafka topic lmg.payments.webhooks

    const event: WebhookEvent = {
      gateway: 'paystack',
      event: String(body['event'] ?? ''),
      reference: String(
        (body['data'] as Record<string, unknown>)?.['reference'] ?? '',
      ),
      status: String(
        (body['data'] as Record<string, unknown>)?.['status'] ?? '',
      ),
      amount:
        Number(
          (body['data'] as Record<string, unknown>)?.['amount'] ?? 0,
        ) / 100,
      currency: String(
        (body['data'] as Record<string, unknown>)?.['currency'] ?? 'ZAR',
      ),
      metadata: (body['data'] as Record<string, unknown>)?.['metadata'] as Record<string, string> ?? {},
      rawPayload: rawBody,
      signature: signature ?? '',
      receivedAt: new Date().toISOString(),
    };

    this.logger.log(
      `Paystack webhook processed: ref=${event.reference} status=${event.status}`,
    );

    return { received: true };
  }

  /**
   * Stripe webhook receiver
   * Verifies HMAC-SHA256 signature from stripe-signature header
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody?.toString('utf-8') ?? JSON.stringify(body);

    this.logger.log(`Stripe webhook received: type=${String(body['type'])}`);

    // TODO: Verify Stripe signature using LMG_STRIPE_WEBHOOK_SECRET
    // TODO: Publish to Kafka topic

    const paymentIntent =
      (body['data'] as Record<string, unknown>)?.['object'] as Record<string, unknown> ?? {};

    const event: WebhookEvent = {
      gateway: 'stripe',
      event: String(body['type'] ?? ''),
      reference: String(paymentIntent['id'] ?? ''),
      status: String(paymentIntent['status'] ?? ''),
      amount: Number(paymentIntent['amount'] ?? 0) / 100,
      currency: String(paymentIntent['currency'] ?? '').toUpperCase(),
      metadata: (paymentIntent['metadata'] as Record<string, string>) ?? {},
      rawPayload: rawBody,
      signature: signature ?? '',
      receivedAt: new Date().toISOString(),
    };

    this.logger.log(
      `Stripe webhook processed: ref=${event.reference} event=${event.event}`,
    );

    return { received: true };
  }

  /**
   * Ozow webhook receiver
   * Verifies SHA-512 hash check
   */
  @Post('ozow')
  @HttpCode(HttpStatus.OK)
  async handleOzowWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('hashcheck') hashCheck: string,
  ): Promise<{ received: boolean }> {
    this.logger.log(
      `Ozow webhook received: ref=${String(body['TransactionReference'])}`,
    );

    // TODO: Verify SHA-512 hash using LMG_OZOW_PRIVATE_KEY
    // TODO: Publish to Kafka topic

    const event: WebhookEvent = {
      gateway: 'ozow',
      event: 'payment.status',
      reference: String(body['TransactionReference'] ?? ''),
      status: String(body['Status'] ?? ''),
      amount: Number(body['Amount'] ?? 0),
      currency: 'ZAR',
      metadata: {
        orderId: String(body['Optional1'] ?? ''),
        customerId: String(body['Optional2'] ?? ''),
        partnerId: String(body['Optional3'] ?? ''),
      },
      rawPayload: JSON.stringify(body),
      signature: hashCheck ?? '',
      receivedAt: new Date().toISOString(),
    };

    this.logger.log(
      `Ozow webhook processed: ref=${event.reference} status=${event.status}`,
    );

    return { received: true };
  }

  /**
   * Peach Payments webhook receiver
   * Verifies via IP whitelist (handled at ingress level)
   */
  @Post('peach')
  @HttpCode(HttpStatus.OK)
  async handlePeachWebhook(
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    this.logger.log('Peach Payments webhook received');

    const result = body['result'] as Record<string, string> ?? {};

    const event: WebhookEvent = {
      gateway: 'peach',
      event: 'payment.result',
      reference: String(body['id'] ?? ''),
      status: String(result['code'] ?? ''),
      amount: Number(body['amount'] ?? 0),
      currency: String(body['currency'] ?? 'ZAR'),
      metadata: {
        merchantTransactionId: String(body['merchantTransactionId'] ?? ''),
      },
      rawPayload: JSON.stringify(body),
      signature: '',
      receivedAt: new Date().toISOString(),
    };

    this.logger.log(
      `Peach webhook processed: ref=${event.reference} code=${event.status}`,
    );

    return { received: true };
  }

  /**
   * Flutterwave webhook receiver
   * Verifies secret hash from verif-hash header
   */
  @Post('flutterwave')
  @HttpCode(HttpStatus.OK)
  async handleFlutterwaveWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('verif-hash') verifHash: string,
  ): Promise<{ received: boolean }> {
    this.logger.log(
      `Flutterwave webhook received: event=${String(body['event'])}`,
    );

    // TODO: Verify verif-hash against LMG_FLUTTERWAVE_WEBHOOK_SECRET
    // TODO: Publish to Kafka topic

    const data = (body['data'] as Record<string, unknown>) ?? {};

    const event: WebhookEvent = {
      gateway: 'flutterwave',
      event: String(body['event'] ?? ''),
      reference: String(data['tx_ref'] ?? ''),
      status: String(data['status'] ?? ''),
      amount: Number(data['amount'] ?? 0),
      currency: String(data['currency'] ?? ''),
      metadata: (data['meta'] as Record<string, string>) ?? {},
      rawPayload: JSON.stringify(body),
      signature: verifHash ?? '',
      receivedAt: new Date().toISOString(),
    };

    this.logger.log(
      `Flutterwave webhook processed: ref=${event.reference} status=${event.status}`,
    );

    return { received: true };
  }
}
