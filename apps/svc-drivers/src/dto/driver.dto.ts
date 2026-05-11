/**
 * Driver Service DTOs (Data Transfer Objects)
 *
 * Validation-enforced DTOs for all driver endpoints using class-validator.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 * @module dto/driver.dto
 */

import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsBoolean,
  Length,
  Matches,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Supported vehicle types for registration.
 */
export enum VehicleTypeDto {
  SCOOTER = 'scooter',
  BICYCLE = 'bicycle',
  CAR = 'car',
  VAN = 'van',
}

/**
 * Delivery zones for SA operations.
 */
export enum DeliveryZoneDto {
  KZN_NORTH = 'KZN-North',
  KZN_SOUTH = 'KZN-South',
  KZN_CBD = 'KZN-CBD',
  GAUTENG_NORTH = 'Gauteng-North',
  GAUTENG_SOUTH = 'Gauteng-South',
  WESTERN_CAPE = 'Western-Cape',
}

/**
 * Driver status values.
 */
export enum DriverStatusDto {
  ACTIVE = 'active',
  IDLE = 'idle',
  OFFLINE = 'offline',
  SUSPENDED = 'suspended',
  ONBOARDING = 'onboarding',
}

/**
 * POST /v1/drivers/register
 * Registers a new driver in the platform.
 */
export class RegisterDriverDto {
  @IsEmail({}, { message: 'Valid email address is required' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @Matches(/^\+27[0-9]{9}$/, { message: 'Phone must be a valid SA number (+27XXXXXXXXX)' })
  phone!: string;

  @IsString()
  @Length(2, 100, { message: 'Full name must be between 2 and 100 characters' })
  fullName!: string;

  @IsString()
  @Matches(/^[0-9]{13}$/, { message: 'SA ID number must be 13 digits' })
  idNumber!: string;

  @IsEnum(VehicleTypeDto, { message: 'Invalid vehicle type' })
  vehicleType!: VehicleTypeDto;

  @IsEnum(DeliveryZoneDto, { message: 'Invalid delivery zone' })
  zone!: DeliveryZoneDto;

  @IsBoolean({ message: 'POPIA consent acknowledgement is required' })
  popiaConsent!: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}

/**
 * PATCH /v1/drivers/:id
 * Updates a driver's profile.
 */
export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  @Matches(/^\+27[0-9]{9}$/, { message: 'Phone must be a valid SA number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  fullName?: string;

  @IsOptional()
  @IsEnum(VehicleTypeDto)
  vehicleType?: VehicleTypeDto;

  @IsOptional()
  @IsEnum(DeliveryZoneDto)
  zone?: DeliveryZoneDto;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

/**
 * PATCH /v1/drivers/:id/status
 * Updates a driver's operational status.
 */
export class UpdateDriverStatusDto {
  @IsEnum(DriverStatusDto, { message: 'Invalid driver status' })
  status!: DriverStatusDto;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;
}

/**
 * POST /v1/drivers/:id/location
 * Updates driver's current GPS location.
 */
export class UpdateLocationDto {
  @IsLatitude({ message: 'Valid latitude is required' })
  latitude!: number;

  @IsLongitude({ message: 'Valid longitude is required' })
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  speed?: number;
}

/**
 * GET /v1/drivers/available query parameters.
 */
export class AvailableDriversQueryDto {
  @IsEnum(DeliveryZoneDto, { message: 'Invalid delivery zone' })
  zone!: DeliveryZoneDto;

  @IsOptional()
  @IsEnum(VehicleTypeDto)
  vehicleType?: VehicleTypeDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  minScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;
}

/**
 * Driver record as stored in Supabase.
 */
export interface DriverRecord {
  id: string;
  user_id: string;
  email: string;
  phone: string;
  full_name: string;
  id_number_hash: string;
  licence_number: string | null;
  licence_expiry: string | null;
  biometric_ref: string | null;
  vehicle_type: string;
  status: string;
  performance_score: number | null;
  zone: string;
  wallet_address: string | null;
  insurance_tier: string;
  avatar_url: string | null;
  onboarded_at: string | null;
  bank_verified: boolean;
  popia_consent: boolean;
  popia_consent_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Driver location record for Redis geo storage.
 */
export interface DriverLocationRecord {
  driverId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  updatedAt: string;
}

/**
 * Kafka event payload for driver events.
 */
export interface DriverEvent {
  eventType: string;
  driverId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Driver registration result.
 */
export interface DriverRegistrationResult {
  driverId: string;
  userId: string;
  email: string;
  status: string;
  zone: string;
  nextSteps: string[];
}

/**
 * Driver profile response.
 */
export interface DriverProfileResponse {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  vehicleType: string;
  status: string;
  zone: string;
  performanceScore: number | null;
  insuranceTier: string;
  avatarUrl: string | null;
  onboardedAt: string | null;
  bankVerified: boolean;
  createdAt: string;
}
