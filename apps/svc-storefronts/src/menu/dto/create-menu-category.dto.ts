/**
 * Create Menu Category DTO (P183)
 *
 * @module svc-storefronts/menu/dto/create-menu-category
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuCategoryDto {
  @ApiProperty({ example: 'Starters' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @ApiProperty({ example: 'starters' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty({ example: 'restaurant-uuid-001' })
  @IsString()
  @IsNotEmpty()
  restaurantId!: string;

  @ApiPropertyOptional({ example: 'Light bites to start your meal' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiPropertyOptional({ example: '11:00' })
  @IsOptional()
  @IsString()
  availableFrom?: string;

  @ApiPropertyOptional({ example: '14:00' })
  @IsOptional()
  @IsString()
  availableUntil?: string;
}
