/**
 * Driver type definitions.
 * Maps to the `drivers` table in Supabase PostgreSQL.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 */

import { DeliveryZone, DriverStatus, DriverTier, InsuranceTier, VehicleType } from '../enums';

export interface Driver {
  id: string;
  licenceNumber: string | null;
  licenceExpiry: string | null;
  biometricRef: string | null;
  vehicleType: VehicleType;
  status: DriverStatus;
  performanceScore: number | null;
  zone: DeliveryZone;
  walletAddress: string | null;
  onboardedAt: string | null;
  insuranceTier: InsuranceTier;
}

export interface DriverRegistrationDto {
  email: string;
  phone: string;
  fullName: string;
  idNumber: string;
  vehicleType: VehicleType;
  zone: DeliveryZone;
  popiaConsent: boolean;
}

export interface DriverPerformanceScore {
  score: number;
  tier: DriverTier;
  trend: 'improving' | 'stable' | 'declining';
  strengths: string[];
  improvementAreas: string[];
  recommendations: string[];
  calculatedAt: string;
}

export interface DriverWallet {
  currentBalance: number;
  pendingEarnings: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  lifetimeEarnings: number;
  commissionRate: number;
  payoutPreference: 'ozow' | 'polygon';
  nextScheduledPayout: string;
}

export interface DriverAvailability {
  driverId: string;
  zone: DeliveryZone;
  status: DriverStatus;
  vehicleType: VehicleType;
  performanceScore: number;
  currentLocation: GeoPoint;
  lastUpdated: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}
