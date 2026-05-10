/**
 * Vehicle and Fleet type definitions.
 * Maps to the `vehicles` table in Supabase PostgreSQL
 * and `vehicle_telemetry` hypertable in TimescaleDB.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Sections 2.2, 5
 */

import { VehicleStatus, VehicleType } from '../enums';

export interface Vehicle {
  id: string;
  registration: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  isEv: boolean;
  status: VehicleStatus;
  currentDriverId: string | null;
  odometerKm: number;
  lastServiceDate: string | null;
  nextServiceKm: number | null;
  iotDeviceId: string | null;
}

export interface VehicleTelemetry {
  time: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  batteryPct: number | null;
  engineTempC: number;
  fuelPct: number | null;
  odometerKm: number;
  errorCodes: string[];
}

export interface FleetSummary {
  totalVehicles: number;
  available: number;
  rented: number;
  maintenance: number;
  evPercentage: number;
  avgOdometerKm: number;
}

export interface MaintenanceAlert {
  vehicleId: string;
  alertType: 'scheduled_service' | 'anomaly_detected' | 'battery_low' | 'error_code';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  detectedAt: string;
  errorCodes: string[];
}
