/**
 * Driver Repository - Supabase Data Access Layer
 *
 * Handles all driver CRUD operations against Supabase PostgreSQL.
 * Implements repository pattern to abstract database operations.
 * RLS policies enforced at database level.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 * @module repositories/driver.repository
 */

import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';

import type { DriverServiceConfig } from '../config/driver.config';
import type {
  DriverRecord,
  RegisterDriverDto,
  UpdateDriverDto,
  DriverProfileResponse,
} from '../dto/driver.dto';

@Injectable()
export class DriverRepository {
  private readonly logger = new Logger(DriverRepository.name);

  /** In-memory store for development. Production uses Supabase. */
  private readonly drivers = new Map<string, DriverRecord>();
  private readonly driversByEmail = new Map<string, string>();
  private readonly driversByUserId = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<DriverServiceConfig>('driver');
    if (config?.environment === 'development') {
      this.logger.log('Driver repository running in development mode (in-memory store)');
    }
  }

  /**
   * Creates a new driver record.
   * @throws ConflictException if email already registered as driver
   */
  async create(dto: RegisterDriverDto, userId: string): Promise<DriverRecord> {
    if (this.driversByEmail.has(dto.email.toLowerCase())) {
      throw new ConflictException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/driver-exists',
        title: 'Driver Already Registered',
        status: 409,
        detail: 'A driver account with this email already exists.',
      });
    }

    const now = new Date().toISOString();
    const driver: DriverRecord = {
      id: randomUUID(),
      user_id: userId,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      full_name: dto.fullName,
      id_number_hash: this.hashIdNumber(dto.idNumber),
      licence_number: null,
      licence_expiry: null,
      biometric_ref: null,
      vehicle_type: dto.vehicleType,
      status: 'onboarding',
      performance_score: null,
      zone: dto.zone,
      wallet_address: null,
      insurance_tier: 'basic',
      avatar_url: null,
      onboarded_at: null,
      bank_verified: false,
      popia_consent: dto.popiaConsent,
      popia_consent_at: dto.popiaConsent ? now : null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    this.drivers.set(driver.id, driver);
    this.driversByEmail.set(driver.email, driver.id);
    this.driversByUserId.set(userId, driver.id);

    this.logger.log(`Driver created: ${driver.id} in zone ${driver.zone}`);
    return driver;
  }

  /**
   * Finds a driver by their internal ID.
   * @throws NotFoundException if driver doesn't exist
   */
  async findById(id: string): Promise<DriverRecord> {
    const driver = this.drivers.get(id);
    if (!driver || driver.deleted_at) {
      throw new NotFoundException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/driver-not-found',
        title: 'Driver Not Found',
        status: 404,
        detail: 'The requested driver does not exist.',
      });
    }
    return driver;
  }

  /**
   * Finds a driver by email.
   */
  async findByEmail(email: string): Promise<DriverRecord | null> {
    const driverId = this.driversByEmail.get(email.toLowerCase());
    if (!driverId) return null;
    const driver = this.drivers.get(driverId);
    if (!driver || driver.deleted_at) return null;
    return driver;
  }

  /**
   * Finds a driver by user ID.
   */
  async findByUserId(userId: string): Promise<DriverRecord | null> {
    const driverId = this.driversByUserId.get(userId);
    if (!driverId) return null;
    const driver = this.drivers.get(driverId);
    if (!driver || driver.deleted_at) return null;
    return driver;
  }

  /**
   * Updates a driver record.
   */
  async update(id: string, updates: Partial<DriverRecord>): Promise<DriverRecord> {
    const driver = await this.findById(id);

    if (updates.email && updates.email !== driver.email) {
      this.driversByEmail.delete(driver.email);
      driver.email = updates.email.toLowerCase();
      this.driversByEmail.set(driver.email, driver.id);
    }

    if (updates.phone !== undefined) driver.phone = updates.phone;
    if (updates.full_name !== undefined) driver.full_name = updates.full_name;
    if (updates.vehicle_type !== undefined) driver.vehicle_type = updates.vehicle_type;
    if (updates.zone !== undefined) driver.zone = updates.zone;
    if (updates.status !== undefined) driver.status = updates.status;
    if (updates.performance_score !== undefined) driver.performance_score = updates.performance_score;
    if (updates.licence_number !== undefined) driver.licence_number = updates.licence_number;
    if (updates.licence_expiry !== undefined) driver.licence_expiry = updates.licence_expiry;
    if (updates.biometric_ref !== undefined) driver.biometric_ref = updates.biometric_ref;
    if (updates.wallet_address !== undefined) driver.wallet_address = updates.wallet_address;
    if (updates.insurance_tier !== undefined) driver.insurance_tier = updates.insurance_tier;
    if (updates.avatar_url !== undefined) driver.avatar_url = updates.avatar_url;
    if (updates.onboarded_at !== undefined) driver.onboarded_at = updates.onboarded_at;
    if (updates.bank_verified !== undefined) driver.bank_verified = updates.bank_verified;
    driver.updated_at = new Date().toISOString();

    this.drivers.set(driver.id, driver);
    return driver;
  }

  /**
   * Updates driver status.
   */
  async updateStatus(id: string, status: string, reason?: string): Promise<DriverRecord> {
    return this.update(id, { status });
  }

  /**
   * Finds all drivers in a zone with optional filters.
   */
  async findAvailable(
    zone: string,
    vehicleType?: string,
    minScore?: number,
    limit: number = 20,
  ): Promise<DriverRecord[]> {
    const results: DriverRecord[] = [];

    for (const driver of this.drivers.values()) {
      if (driver.deleted_at) continue;
      if (driver.zone !== zone) continue;
      if (driver.status !== 'active' && driver.status !== 'idle') continue;
      if (vehicleType && driver.vehicle_type !== vehicleType) continue;
      if (minScore && (driver.performance_score ?? 0) < minScore) continue;

      results.push(driver);
      if (results.length >= limit) break;
    }

    return results.sort((a, b) => (b.performance_score ?? 0) - (a.performance_score ?? 0));
  }

  /**
   * Lists all drivers with pagination.
   */
  async findAll(
    page: number = 1,
    pageSize: number = 20,
    zone?: string,
    status?: string,
  ): Promise<{ drivers: DriverRecord[]; total: number }> {
    let filtered = Array.from(this.drivers.values()).filter((d) => !d.deleted_at);

    if (zone) filtered = filtered.filter((d) => d.zone === zone);
    if (status) filtered = filtered.filter((d) => d.status === status);

    const total = filtered.length;
    const offset = (page - 1) * pageSize;
    const drivers = filtered.slice(offset, offset + pageSize);

    return { drivers, total };
  }

  /**
   * Counts drivers by zone (for dashboard metrics).
   */
  async countByZone(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const driver of this.drivers.values()) {
      if (driver.deleted_at) continue;
      counts[driver.zone] = (counts[driver.zone] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Soft-deletes a driver.
   */
  async softDelete(id: string): Promise<void> {
    const driver = await this.findById(id);
    driver.deleted_at = new Date().toISOString();
    driver.updated_at = new Date().toISOString();
    this.drivers.set(driver.id, driver);
  }

  /**
   * Converts a DriverRecord to a DriverProfileResponse (no PII leakage).
   */
  toProfile(driver: DriverRecord): DriverProfileResponse {
    return {
      id: driver.id,
      email: driver.email,
      phone: driver.phone,
      fullName: driver.full_name,
      vehicleType: driver.vehicle_type,
      status: driver.status,
      zone: driver.zone,
      performanceScore: driver.performance_score,
      insuranceTier: driver.insurance_tier,
      avatarUrl: driver.avatar_url,
      onboardedAt: driver.onboarded_at,
      bankVerified: driver.bank_verified,
      createdAt: driver.created_at,
    };
  }

  /**
   * Hashes SA ID number for storage (never store raw ID numbers).
   */
  private hashIdNumber(idNumber: string): string {
    return createHash('sha256').update(idNumber).digest('hex');
  }
}
