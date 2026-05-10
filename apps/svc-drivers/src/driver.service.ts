/**
 * Driver Service
 *
 * Core driver business logic. Placeholder - expanded in Phase F (P111-P145).
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  DriverRegistrationDto,
  Driver,
  DriverStatus,
  DriverPerformanceScore,
  DeliveryZone,
} from '@lastmile-gig/shared-types';

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);

  async register(_dto: DriverRegistrationDto): Promise<{ driverId: string }> {
    this.logger.log('Registering driver');
    // Phase F: Supabase insert + Kafka driver.registered
    return { driverId: 'placeholder-driver-uuid' };
  }

  async getDriver(_id: string): Promise<Driver | null> {
    return null;
  }

  async updateStatus(_id: string, _status: DriverStatus): Promise<{ success: boolean }> {
    // Phase F: Status update + Kafka driver.status.changed
    return { success: true };
  }

  async getPerformanceScore(_id: string): Promise<DriverPerformanceScore | null> {
    // Phase F: SageMaker inference call
    return null;
  }

  async getAvailableDrivers(_zone: DeliveryZone): Promise<Driver[]> {
    // Phase F: Redis geo query
    return [];
  }
}
