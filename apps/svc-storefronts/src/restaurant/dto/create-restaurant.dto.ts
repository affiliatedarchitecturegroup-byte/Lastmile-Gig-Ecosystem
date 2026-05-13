/**
 * Create Restaurant DTO (P181)
 *
 * Validates incoming POST /v1/restaurants request body.
 * Uses class-validator decorators per CODING_STANDARDS.md.
 *
 * @module svc-storefronts/restaurant/dto/create-restaurant
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsEmail,
  IsUrl,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AddressDto {
  @ApiProperty({ example: '123 Florida Road' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty({ example: 'Morningside' })
  @IsString()
  @IsNotEmpty()
  suburb!: string;

  @ApiProperty({ example: 'Durban' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: 'KwaZulu-Natal' })
  @IsString()
  @IsNotEmpty()
  province!: string;

  @ApiProperty({ example: '4001' })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @ApiProperty({ example: -29.8387 })
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: 31.0218 })
  @IsNumber()
  lng!: number;
}

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Spice Route Kitchen' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'spice-route-kitchen' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  slug!: string;

  @ApiProperty({ example: 'partner-uuid-001' })
  @IsString()
  @IsNotEmpty()
  partnerId!: string;

  @ApiPropertyOptional({ example: 'Authentic KZN Indian cuisine' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: ['indian', 'halal'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisine?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  deliveryRadius?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrder?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  avgDeliveryTime?: number;

  @ApiPropertyOptional({ example: '+27312345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@spiceroute.co.za' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://spiceroute.co.za' })
  @IsOptional()
  @IsUrl()
  website?: string;
}
