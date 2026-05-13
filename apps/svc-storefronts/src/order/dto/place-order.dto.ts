/**
 * Place Order DTO (P184)
 *
 * Validates the order placement request from the storefront checkout.
 *
 * @module svc-storefronts/order/dto/place-order
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SelectedOptionDto {
  @ApiProperty({ example: 'Size' })
  @IsString()
  optionName!: string;

  @ApiProperty({ example: 'Large' })
  @IsString()
  choiceLabel!: string;

  @ApiProperty({ example: 15.0 })
  @IsNumber()
  priceAdjustment!: number;
}

class DeliveryAddressDto {
  @ApiProperty({ example: '45 Umhlanga Rocks Drive, Umhlanga, KZN' })
  @IsString()
  @IsNotEmpty()
  formattedAddress!: string;

  @ApiProperty({ example: -29.723 })
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: 31.084 })
  @IsNumber()
  lng!: number;
}

export class OrderItemDto {
  @ApiProperty({ example: 'item-uuid-001' })
  @IsString()
  @IsNotEmpty()
  menuItemId!: string;

  @ApiProperty({ example: 'Bunny Chow' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 65.0 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ type: [SelectedOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedOptionDto)
  selectedOptions?: SelectedOptionDto[];

  @ApiPropertyOptional({ example: 'Extra spicy please' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class PlaceOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ type: DeliveryAddressDto })
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress!: DeliveryAddressDto;

  @ApiProperty({ example: 'paystack', enum: ['paystack', 'ozow', 'cash'] })
  @IsString()
  @IsNotEmpty()
  paymentMethod!: string;

  @ApiPropertyOptional({ example: 'Extra napkins' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ example: 'WELCOME20' })
  @IsOptional()
  @IsString()
  promoCode?: string;
}
