/**
 * Place Order DTO - Request validation for order placement.
 *
 * Uses class-validator for input validation per CODING_STANDARDS.md.
 * Maps to POST /v1/orders endpoint.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.4
 * @module svc-orders
 */

import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethodDto {
  CARD = 'card',
  EFT = 'eft',
  MOBILE_MONEY = 'mobile_money',
  QR_CODE = 'qr_code',
  CRYPTO = 'crypto',
}

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class DeliveryAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  street!: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  instructions?: string | null;
}

export class PlaceOrderRequestDto {
  @IsString()
  @IsNotEmpty()
  partnerId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress!: DeliveryAddressDto;

  @IsEnum(PaymentMethodDto)
  paymentMethod!: PaymentMethodDto;
}
