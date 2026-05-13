/**
 * List Restaurants Query DTO (P181)
 *
 * Validates query parameters for GET /v1/restaurants.
 * Supports filtering by cuisine, city, search, and open status.
 *
 * @module svc-storefronts/restaurant/dto/list-restaurants-query
 */

import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListRestaurantsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'indian' })
  @IsOptional()
  @IsString()
  cuisine?: string;

  @ApiPropertyOptional({ example: 'Durban' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'pizza' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @ApiPropertyOptional({ example: 'rating', description: 'Sort by: rating, name, distance, newest' })
  @IsOptional()
  @IsString()
  sortBy?: string;
}
