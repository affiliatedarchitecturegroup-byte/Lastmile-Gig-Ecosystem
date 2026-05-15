/**
 * IoT Telemetry type definitions for the Lastmile Gig platform.
 *
 * Shared types for vehicle telemetry, GPS tracking, diagnostics,
 * and maintenance alert data.
 *
 * @see POLYGLOT_ARCHITECTURE.md - Section 2.4
 * @see infrastructure/database/migrations/011_create_iot_tables.sql
 */

// --- Telemetry ---

export interface VehicleTelemetry {
  vehicleId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  altitudeM: number;
  engineTempC: number;
  batteryPct: number | null;
  fuelLevelPct: number | null;
  odometerKm: number;
  rpm: number;
  errorCodes: string[];
}

export interface TelemetryRecord extends VehicleTelemetry {
  id: string;
  recordedAt: string;
  hasErrors: boolean;
}

// --- GPS Tracking ---

export interface GpsPosition {
  vehicleId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  accuracyM: number;
}

export interface GpsTrackingHistory {
  vehicleId: string;
  positions: GpsPosition[];
  totalDistanceKm: number;
  periodStart: string;
  periodEnd: string;
}

// --- Diagnostics ---

export interface VehicleDiagnostics {
  vehicleId: string;
  timestamp: string;
  dtcCodes: string[];
  milStatus: boolean;
  coolantTempC: number;
  intakeTempC: number;
  fuelPressureKpa: number;
  engineLoadPct: number;
  throttlePositionPct: number;
  voltage: number;
}

// --- Maintenance Alerts ---

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

export enum AlertType {
  ENGINE_OVERHEATING = 'engine_overheating',
  LOW_BATTERY = 'low_battery',
  EXCESSIVE_SPEED = 'excessive_speed',
  DTC_ERROR = 'dtc_error',
  LOW_FUEL = 'low_fuel',
  GEOFENCE_VIOLATION = 'geofence_violation',
  MAINTENANCE_DUE = 'maintenance_due',
}

export interface MaintenanceAlert {
  id: string;
  vehicleId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
}

// --- Fleet Summary ---

export interface VehicleSummary {
  vehicleId: string;
  lastSeen: string;
  lastLatitude: number;
  lastLongitude: number;
  lastSpeedKmh: number;
  engineTempC: number;
  batteryPct: number | null;
  totalDistanceKm: number;
  activeAlerts: number;
  status: VehicleOperationalStatus;
}

export enum VehicleOperationalStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  IDLE = 'idle',
  MOVING = 'moving',
  ALERT = 'alert',
}

// --- Geofence ---

export interface Geofence {
  id: string;
  name: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  vehicleIds: string[];
  active: boolean;
}
