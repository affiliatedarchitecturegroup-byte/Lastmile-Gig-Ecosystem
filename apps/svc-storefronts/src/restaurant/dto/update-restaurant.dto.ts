/**
 * Update Restaurant DTO (P181)
 *
 * Validates incoming PATCH /v1/restaurants/:id request body.
 * All fields are optional (partial update).
 *
 * @module svc-storefronts/restaurant/dto/update-restaurant
 */

import { PartialType } from '@nestjs/swagger';

import { CreateRestaurantDto } from './create-restaurant.dto';

export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {}
