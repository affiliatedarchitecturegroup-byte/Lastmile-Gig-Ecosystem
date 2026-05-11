/**
 * Driver Service - Core Business Logic (Phase F Implementation)
 *
 * Orchestrates driver registration, profile management, status transitions,
 * zone availability, and location tracking. Delegates to repository,
 * Kafka producer, and third-party integrations.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.3
 * @module driver.service
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DriverRepository } from './repositories/driver.repository';
import { KafkaProducerService } from './services/kafka-producer.service';
import type {
  RegisterDriverDto,
  UpdateDriverDto,
  UpdateDriverStatusDto,
  UpdateLocationDto,
  DriverRegistrationResult,
  DriverProfileResponse,
  DriverRecord,
  DriverLocationRecord,
} from './dto/driver.dto';

/**
 * Available drivers response with zone metadata.
 */
export interface AvailableDriversResult {
  drivers: DriverProfileResponse[];
  zone: string;
  total: number;
}

/**
 * Driver list with pagination metadata.
 */
export interface DriverListResult {
  drivers: DriverProfileResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);

  /** In-memory location store for development. Production uses Redis Geo. */
  private readonly locationStore = new Map<string, DriverLocationRecord>();

  constructor(
    private readonly configService: ConfigService,
    private readonly driverRepo: DriverRepository,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /**
   * Registers a new driver.
   * Creates the driver record and publishes a registration event.
   *
   * @param dto - Registration data (validated by class-validator)
   * @param userId - Authenticated user ID from JWT
   * @returns Registration result with next onboarding steps
   */
  async register(dto: RegisterDriverDto, userId: string): Promise<DriverRegistrationResult> {
    // Validate POPIA consent
    if (!dto.popiaConsent) {
      throw new BadRequestException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/popia-consent-required',
        title: 'POPIA Consent Required',
        status: 400,
        detail: 'You must consent to data processing to register as a driver.',
      });
    }

    // Check if user already has a driver account
    const existing = await this.driverRepo.findByUserId(userId);
    if (existing) {
      throw new BadRequestException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/driver-exists',
        title: 'Already Registered',
        status: 400,
        detail: 'You already have a driver account.',
      });
    }

    // Create driver record
    const driver = await this.driverRepo.create(dto, userId);

    // Publish Kafka event
    await this.kafkaProducer.publishDriverRegistered(
      driver.id,
      driver.zone,
      driver.vehicle_type,
    );

    this.logger.log(`Driver registered: ${driver.id} in zone ${driver.zone}`);

    return {
      driverId: driver.id,
      userId: driver.user_id,
      email: driver.email,
      status: driver.status,
      zone: driver.zone,
      nextSteps: [
        'Upload your driving licence',
        'Complete biometric verification',
        'Verify your bank account',
        'Review and accept terms of service',
      ],
    };
  }

  /**
   * Gets a driver's profile by ID.
   */
  async getProfile(driverId: string): Promise<DriverProfileResponse> {
    const driver = await this.driverRepo.findById(driverId);
    return this.driverRepo.toProfile(driver);
  }

  /**
   * Gets a driver's profile by their user ID (for /me endpoint).
   */
  async getProfileByUserId(userId: string): Promise<DriverProfileResponse | null> {
    const driver = await this.driverRepo.findByUserId(userId);
    if (!driver) return null;
    return this.driverRepo.toProfile(driver);
  }

  /**
   * Updates a driver's profile.
   */
  async updateProfile(driverId: string, dto: UpdateDriverDto): Promise<DriverProfileResponse> {
    const updates: Partial<DriverRecord> = {};
    if (dto.phone) updates.phone = dto.phone;
    if (dto.fullName) updates.full_name = dto.fullName;
    if (dto.vehicleType) updates.vehicle_type = dto.vehicleType;
    if (dto.zone) updates.zone = dto.zone;
    if (dto.avatarUrl) updates.avatar_url = dto.avatarUrl;

    const driver = await this.driverRepo.update(driverId, updates);
    return this.driverRepo.toProfile(driver);
  }

  /**
   * Updates a driver's operational status.
   * Validates state transitions (e.g., suspended drivers can't go active).
   */
  async updateStatus(
    driverId: string,
    dto: UpdateDriverStatusDto,
    requesterId: string,
    requesterRole: string,
  ): Promise<DriverProfileResponse> {
    const driver = await this.driverRepo.findById(driverId);
    const previousStatus = driver.status;

    // Validate state transitions
    this.validateStatusTransition(previousStatus, dto.status, requesterRole);

    const updated = await this.driverRepo.updateStatus(driverId, dto.status, dto.reason);

    // Publish Kafka event
    await this.kafkaProducer.publishDriverStatusChanged(
      driverId,
      previousStatus,
      dto.status,
      dto.reason,
    );

    // If suspended, also publish suspension event
    if (dto.status === 'suspended') {
      await this.kafkaProducer.publishDriverSuspended(driverId, dto.reason ?? 'Policy violation');
    }

    this.logger.log(`Driver ${driverId} status: ${previousStatus} -> ${dto.status}`);
    return this.driverRepo.toProfile(updated);
  }

  /**
   * Updates a driver's GPS location.
   * Stored in Redis for real-time availability queries.
   */
  async updateLocation(driverId: string, dto: UpdateLocationDto): Promise<void> {
    // Verify driver exists and is active
    const driver = await this.driverRepo.findById(driverId);
    if (driver.status !== 'active' && driver.status !== 'idle') {
      throw new BadRequestException('Only active or idle drivers can update location');
    }

    const location: DriverLocationRecord = {
      driverId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      heading: dto.heading ?? null,
      speed: dto.speed ?? null,
      updatedAt: new Date().toISOString(),
    };

    this.locationStore.set(driverId, location);

    // Publish location to Kafka for real-time tracking
    await this.kafkaProducer.publishDriverLocationUpdated(
      driverId,
      dto.latitude,
      dto.longitude,
      dto.heading,
      dto.speed,
    );
  }

  /**
   * Gets available drivers in a zone.
   */
  async getAvailableDrivers(
    zone: string,
    vehicleType?: string,
    minScore?: number,
    limit?: number,
  ): Promise<AvailableDriversResult> {
    const drivers = await this.driverRepo.findAvailable(
      zone,
      vehicleType,
      minScore,
      limit ?? 20,
    );

    return {
      drivers: drivers.map((d) => this.driverRepo.toProfile(d)),
      zone,
      total: drivers.length,
    };
  }

  /**
   * Lists all drivers with pagination (admin/ops use).
   */
  async listDrivers(
    page: number = 1,
    pageSize: number = 20,
    zone?: string,
    status?: string,
  ): Promise<DriverListResult> {
    const { drivers, total } = await this.driverRepo.findAll(page, pageSize, zone, status);
    const totalPages = Math.ceil(total / pageSize);

    return {
      drivers: drivers.map((d) => this.driverRepo.toProfile(d)),
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Gets zone statistics (driver counts per zone).
   */
  async getZoneStats(): Promise<Record<string, number>> {
    return this.driverRepo.countByZone();
  }

  /**
   * Gets a driver's current location.
   */
  async getLocation(driverId: string): Promise<DriverLocationRecord | null> {
    return this.locationStore.get(driverId) ?? null;
  }

  // --- Private helpers ---

  /**
   * Validates driver status transitions.
   * Only admins/ops can unsuspend or move from onboarding to active.
   */
  private validateStatusTransition(
    current: string,
    target: string,
    requesterRole: string,
  ): void {
    const adminRoles = ['admin', 'super_admin', 'ops_senior', 'ops_staff'];
    const isAdmin = adminRoles.includes(requesterRole);

    // Suspended drivers can only be reactivated by admin
    if (current === 'suspended' && !isAdmin) {
      throw new ForbiddenException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/insufficient-role',
        title: 'Cannot Change Status',
        status: 403,
        detail: 'Only administrators can reactivate suspended drivers.',
      });
    }

    // Onboarding -> active requires admin approval
    if (current === 'onboarding' && target === 'active' && !isAdmin) {
      throw new ForbiddenException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/onboarding-approval-required',
        title: 'Onboarding Approval Required',
        status: 403,
        detail: 'Admin approval is required to activate a driver from onboarding status.',
      });
    }

    // Cannot go back to onboarding
    if (target === 'onboarding' && current !== 'onboarding') {
      throw new BadRequestException('Cannot transition back to onboarding status');
    }
  }
}
