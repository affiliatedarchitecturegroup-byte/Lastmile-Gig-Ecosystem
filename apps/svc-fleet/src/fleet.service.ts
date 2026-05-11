/**
 * Fleet Service - Vehicle Inventory & Rental Management
 *
 * Manages scooter/vehicle inventory, rental bookings, IoT device
 * registration, and maintenance scheduling via Bosch and Supa Quick APIs.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md - P141-P145
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.5
 * @module fleet.service
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Vehicle record in the fleet inventory.
 */
export interface VehicleRecord {
  id: string;
  registrationNumber: string;
  vehicleType: string;
  make: string;
  model: string;
  year: number;
  status: 'available' | 'rented' | 'maintenance' | 'retired';
  currentDriverId: string | null;
  iotDeviceId: string | null;
  mileage: number;
  lastServiceDate: string | null;
  nextServiceDue: string | null;
  insuranceExpiry: string;
  zone: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Rental booking record.
 */
export interface RentalBooking {
  id: string;
  vehicleId: string;
  driverId: string;
  startDate: string;
  endDate: string | null;
  dailyRate: number;
  totalCharged: number;
  status: 'active' | 'completed' | 'cancelled';
  depositPaid: boolean;
  createdAt: string;
}

/**
 * IoT device registration record.
 */
export interface IoTDevice {
  id: string;
  vehicleId: string;
  deviceType: string;
  firmwareVersion: string;
  lastHeartbeat: string | null;
  status: 'online' | 'offline' | 'error';
  registeredAt: string;
}

/**
 * Maintenance appointment.
 */
export interface MaintenanceAppointment {
  id: string;
  vehicleId: string;
  provider: 'bosch' | 'supa_quick' | 'internal';
  type: 'scheduled' | 'emergency' | 'tyre' | 'battery';
  description: string;
  scheduledDate: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  cost: number | null;
  externalReference: string | null;
  createdAt: string;
}

@Injectable()
export class FleetService {
  private readonly logger = new Logger(FleetService.name);

  /** In-memory stores for development. */
  private readonly vehicles = new Map<string, VehicleRecord>();
  private readonly rentals = new Map<string, RentalBooking>();
  private readonly iotDevices = new Map<string, IoTDevice>();
  private readonly appointments = new Map<string, MaintenanceAppointment>();

  // --- Vehicle Inventory (P141) ---

  /**
   * Adds a vehicle to the fleet inventory.
   */
  async addVehicle(data: Omit<VehicleRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<VehicleRecord> {
    const now = new Date().toISOString();
    const vehicle: VehicleRecord = {
      id: randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.vehicles.set(vehicle.id, vehicle);
    this.logger.log(`Vehicle added: ${vehicle.id} (${vehicle.make} ${vehicle.model})`);
    return vehicle;
  }

  /**
   * Gets a vehicle by ID.
   */
  async getVehicle(id: string): Promise<VehicleRecord> {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  /**
   * Lists vehicles with optional filters.
   */
  async listVehicles(
    zone?: string,
    status?: string,
    vehicleType?: string,
  ): Promise<VehicleRecord[]> {
    let results = Array.from(this.vehicles.values());
    if (zone) results = results.filter((v) => v.zone === zone);
    if (status) results = results.filter((v) => v.status === status);
    if (vehicleType) results = results.filter((v) => v.vehicleType === vehicleType);
    return results;
  }

  /**
   * Updates vehicle status.
   */
  async updateVehicleStatus(id: string, status: VehicleRecord['status']): Promise<VehicleRecord> {
    const vehicle = await this.getVehicle(id);
    vehicle.status = status;
    vehicle.updatedAt = new Date().toISOString();
    this.vehicles.set(id, vehicle);
    return vehicle;
  }

  // --- Rental Booking (P142) ---

  /**
   * Creates a rental booking (assigns vehicle to driver).
   */
  async createRental(vehicleId: string, driverId: string, dailyRate: number): Promise<RentalBooking> {
    const vehicle = await this.getVehicle(vehicleId);
    if (vehicle.status !== 'available') {
      throw new BadRequestException('Vehicle is not available for rental');
    }

    const now = new Date().toISOString();
    const rental: RentalBooking = {
      id: randomUUID(),
      vehicleId,
      driverId,
      startDate: now,
      endDate: null,
      dailyRate,
      totalCharged: 0,
      status: 'active',
      depositPaid: false,
      createdAt: now,
    };

    this.rentals.set(rental.id, rental);
    vehicle.status = 'rented';
    vehicle.currentDriverId = driverId;
    vehicle.updatedAt = now;
    this.vehicles.set(vehicleId, vehicle);

    this.logger.log(`Rental created: ${rental.id} (vehicle ${vehicleId} -> driver ${driverId})`);
    return rental;
  }

  /**
   * Ends a rental booking.
   */
  async endRental(rentalId: string): Promise<RentalBooking> {
    const rental = this.rentals.get(rentalId);
    if (!rental) throw new NotFoundException('Rental not found');
    if (rental.status !== 'active') throw new BadRequestException('Rental is not active');

    const now = new Date();
    rental.endDate = now.toISOString();
    rental.status = 'completed';

    // Calculate total charges
    const startDate = new Date(rental.startDate);
    const days = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    rental.totalCharged = days * rental.dailyRate;

    this.rentals.set(rentalId, rental);

    // Release vehicle
    const vehicle = this.vehicles.get(rental.vehicleId);
    if (vehicle) {
      vehicle.status = 'available';
      vehicle.currentDriverId = null;
      vehicle.updatedAt = now.toISOString();
      this.vehicles.set(vehicle.id, vehicle);
    }

    this.logger.log(`Rental ended: ${rentalId} (${days} days, R${rental.totalCharged})`);
    return rental;
  }

  // --- IoT Device Registration (P143) ---

  /**
   * Registers an IoT device to a vehicle.
   */
  async registerIoTDevice(vehicleId: string, deviceType: string, firmwareVersion: string): Promise<IoTDevice> {
    await this.getVehicle(vehicleId);

    const device: IoTDevice = {
      id: randomUUID(),
      vehicleId,
      deviceType,
      firmwareVersion,
      lastHeartbeat: null,
      status: 'offline',
      registeredAt: new Date().toISOString(),
    };

    this.iotDevices.set(device.id, device);
    const vehicle = this.vehicles.get(vehicleId);
    if (vehicle) {
      vehicle.iotDeviceId = device.id;
      vehicle.updatedAt = new Date().toISOString();
      this.vehicles.set(vehicleId, vehicle);
    }

    this.logger.log(`IoT device registered: ${device.id} -> vehicle ${vehicleId}`);
    return device;
  }

  // --- Maintenance Scheduling (P144-P145) ---

  /**
   * Schedules a maintenance appointment with Bosch or Supa Quick.
   */
  async scheduleMaintenanceAppointment(
    vehicleId: string,
    provider: 'bosch' | 'supa_quick' | 'internal',
    type: MaintenanceAppointment['type'],
    description: string,
    scheduledDate: string,
  ): Promise<MaintenanceAppointment> {
    await this.getVehicle(vehicleId);

    const appointment: MaintenanceAppointment = {
      id: randomUUID(),
      vehicleId,
      provider,
      type,
      description,
      scheduledDate,
      status: 'scheduled',
      cost: null,
      externalReference: provider !== 'internal' ? `${provider.toUpperCase()}-${Date.now()}` : null,
      createdAt: new Date().toISOString(),
    };

    this.appointments.set(appointment.id, appointment);

    // Update vehicle status
    const vehicle = this.vehicles.get(vehicleId);
    if (vehicle && type === 'emergency') {
      vehicle.status = 'maintenance';
      vehicle.updatedAt = new Date().toISOString();
      this.vehicles.set(vehicleId, vehicle);
    }

    this.logger.log(`Maintenance scheduled: ${appointment.id} (${provider}, ${type})`);
    return appointment;
  }

  /**
   * Gets maintenance history for a vehicle.
   */
  async getMaintenanceHistory(vehicleId: string): Promise<MaintenanceAppointment[]> {
    return Array.from(this.appointments.values())
      .filter((a) => a.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
  }

  /**
   * Gets fleet summary statistics.
   */
  async getFleetSummary(): Promise<{
    totalVehicles: number;
    available: number;
    rented: number;
    maintenance: number;
    activeRentals: number;
    iotDevicesOnline: number;
  }> {
    const vehicles = Array.from(this.vehicles.values());
    const rentals = Array.from(this.rentals.values());
    const devices = Array.from(this.iotDevices.values());

    return {
      totalVehicles: vehicles.length,
      available: vehicles.filter((v) => v.status === 'available').length,
      rented: vehicles.filter((v) => v.status === 'rented').length,
      maintenance: vehicles.filter((v) => v.status === 'maintenance').length,
      activeRentals: rentals.filter((r) => r.status === 'active').length,
      iotDevicesOnline: devices.filter((d) => d.status === 'online').length,
    };
  }
}
