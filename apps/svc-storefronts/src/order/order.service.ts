/**
 * Storefront Order Service (P184)
 *
 * Validates and processes orders from restaurant storefronts.
 * Publishes order.placed events to Kafka for downstream processing.
 *
 * Pricing calculation:
 * - Subtotal: Sum of item prices with selected options
 * - Delivery fee: Based on distance and restaurant delivery zones
 * - Service fee: Platform service charge (5% of subtotal)
 * - Discount: Promo code or loyalty discount
 * - Total: subtotal + deliveryFee + serviceFee - discount
 *
 * @module svc-storefronts/order/order.service
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';

import { PlaceOrderDto, OrderItemDto } from './dto/place-order.dto';

interface StorefrontOrderDoc {
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  customerId: string;
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    selectedOptions: Array<{ optionName: string; choiceLabel: string; priceAdjustment: number }>;
    subtotal: number;
  }>;
  deliveryAddress: {
    formattedAddress: string;
    lat: number;
    lng: number;
  };
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  estimatedDeliveryMinutes: number;
  placedAt: Date;
  trackingUrl: string;
}

const SERVICE_FEE_RATE = 0.05; // 5% service fee

@Injectable()
export class StorefrontOrderService {
  private readonly logger = new Logger(StorefrontOrderService.name);

  /**
   * Place a new order from a restaurant storefront.
   */
  async placeOrder(restaurantSlug: string, dto: PlaceOrderDto): Promise<StorefrontOrderDoc> {
    this.logger.log(`Processing order for restaurant: ${restaurantSlug}`);

    // 1. Validate restaurant exists and is open
    // Placeholder: Query restaurant by slug

    // 2. Validate all items exist and are available
    this.validateItems(dto.items);

    // 3. Calculate pricing
    const subtotal = this.calculateSubtotal(dto.items);
    const deliveryFee = await this.calculateDeliveryFee(restaurantSlug, dto.deliveryAddress);
    const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE * 100) / 100;
    const discount = await this.calculateDiscount(dto.promoCode, subtotal);
    const total = subtotal + deliveryFee + serviceFee - discount;

    if (total <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    // 4. Create order document
    const orderId = crypto.randomUUID();
    const order: StorefrontOrderDoc = {
      orderId,
      restaurantId: '', // Resolved from slug
      restaurantName: '',
      restaurantSlug,
      customerId: '', // From JWT claims
      items: dto.items.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions ?? [],
        subtotal: item.price * item.quantity +
          (item.selectedOptions ?? []).reduce((sum, opt) => sum + opt.priceAdjustment, 0) * item.quantity,
      })),
      deliveryAddress: dto.deliveryAddress,
      subtotal,
      deliveryFee,
      serviceFee,
      discount,
      total,
      paymentMethod: dto.paymentMethod,
      status: 'placed',
      estimatedDeliveryMinutes: 30, // From restaurant avgDeliveryTime + prep time
      placedAt: new Date(),
      trackingUrl: `https://lastmilegig.aagais.co.za/store/${restaurantSlug}/order/${orderId}/track`,
    };

    // 5. Publish order.placed event to Kafka
    // Placeholder: kafkaProducer.publish('lmg.orders.placed', order)
    this.logger.log(`Order placed: ${orderId}, total: R${total.toFixed(2)}`);

    return order;
  }

  /**
   * Get order status.
   */
  async getOrderStatus(orderId: string): Promise<StorefrontOrderDoc> {
    this.logger.debug(`Getting order status: ${orderId}`);

    const order = null as StorefrontOrderDoc | null;
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    return order;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private validateItems(items: OrderItemDto[]): void {
    if (!items || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    for (const item of items) {
      if (item.quantity < 1) {
        throw new BadRequestException(`Invalid quantity for item: ${item.name}`);
      }
      if (item.price < 0) {
        throw new BadRequestException(`Invalid price for item: ${item.name}`);
      }
    }
  }

  private calculateSubtotal(items: OrderItemDto[]): number {
    return items.reduce((total, item) => {
      const optionsExtra = (item.selectedOptions ?? [])
        .reduce((sum, opt) => sum + opt.priceAdjustment, 0);
      return total + (item.price + optionsExtra) * item.quantity;
    }, 0);
  }

  private async calculateDeliveryFee(
    _restaurantSlug: string,
    _deliveryAddress: { lat: number; lng: number },
  ): Promise<number> {
    // In production: Calculate distance, find matching delivery zone, return fee
    // Placeholder: flat fee
    return 25.0;
  }

  private async calculateDiscount(
    promoCode: string | null | undefined,
    _subtotal: number,
  ): Promise<number> {
    if (!promoCode) return 0;
    // In production: Validate promo code, calculate discount
    return 0;
  }
}
