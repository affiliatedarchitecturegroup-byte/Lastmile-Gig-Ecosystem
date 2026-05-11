/**
 * Fleet Controller - Vehicle & Rental Management Endpoints
 *
 * Handles fleet inventory CRUD, rental bookings, IoT registration,
 * and maintenance scheduling.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md - P141-P145
 * @module fleet.controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';

import { FleetService } from './fleet.service';

@Controller('fleet')
export class FleetController {
  private readonly logger = new Logger(FleetController.name);

  constructor(private readonly fleetService: FleetService) {}

  // --- Vehicle Inventory ---

  @Get('vehicles')
  async listVehicles(
    @Query('zone') zone?: string,
    @Query('status') status?: string,
    @Query('vehicleType') vehicleType?: string,
  ): Promise<{ success: boolean; data: unknown[] }> {
    const vehicles = await this.fleetService.listVehicles(zone, status, vehicleType);
    return { success: true, data: vehicles };
  }

  @Get('vehicles/:id')
  async getVehicle(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const vehicle = await this.fleetService.getVehicle(id);
    return { success: true, data: vehicle };
  }

  @Post('vehicles')
  @HttpCode(HttpStatus.CREATED)
  async addVehicle(
    @Body() body: {
      registrationNumber: string;
      vehicleType: string;
      make: string;
      model: string;
      year: number;
      zone: string;
      insuranceExpiry: string;
    },
  ): Promise<{ success: boolean; data: unknown }> {
    const vehicle = await this.fleetService.addVehicle({
      ...body,
      status: 'available',
      currentDriverId: null,
      iotDeviceId: null,
      mileage: 0,
      lastServiceDate: null,
      nextServiceDue: null,
    });
    return { success: true, data: vehicle };
  }

  @Patch('vehicles/:id/status')
  async updateVehicleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: 'available' | 'rented' | 'maintenance' | 'retired' },
  ): Promise<{ success: boolean; data: unknown }> {
    const vehicle = await this.fleetService.updateVehicleStatus(id, body.status);
    return { success: true, data: vehicle };
  }

  // --- Rentals ---

  @Post('rentals')
  @HttpCode(HttpStatus.CREATED)
  async createRental(
    @Body() body: { vehicleId: string; driverId: string; dailyRate: number },
  ): Promise<{ success: boolean; data: unknown }> {
    const rental = await this.fleetService.createRental(body.vehicleId, body.driverId, body.dailyRate);
    return { success: true, data: rental };
  }

  @Post('rentals/:id/end')
  @HttpCode(HttpStatus.OK)
  async endRental(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const rental = await this.fleetService.endRental(id);
    return { success: true, data: rental };
  }

  // --- IoT Devices ---

  @Post('vehicles/:id/iot')
  @HttpCode(HttpStatus.CREATED)
  async registerIoTDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { deviceType: string; firmwareVersion: string },
  ): Promise<{ success: boolean; data: unknown }> {
    const device = await this.fleetService.registerIoTDevice(id, body.deviceType, body.firmwareVersion);
    return { success: true, data: device };
  }

  // --- Maintenance ---

  @Post('vehicles/:id/maintenance')
  @HttpCode(HttpStatus.CREATED)
  async scheduleMaintenance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: {
      provider: 'bosch' | 'supa_quick' | 'internal';
      type: 'scheduled' | 'emergency' | 'tyre' | 'battery';
      description: string;
      scheduledDate: string;
    },
  ): Promise<{ success: boolean; data: unknown }> {
    const appointment = await this.fleetService.scheduleMaintenanceAppointment(
      id, body.provider, body.type, body.description, body.scheduledDate,
    );
    return { success: true, data: appointment };
  }

  @Get('vehicles/:id/maintenance')
  async getMaintenanceHistory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: unknown[] }> {
    const history = await this.fleetService.getMaintenanceHistory(id);
    return { success: true, data: history };
  }

  // --- Fleet Summary ---

  @Get('summary')
  async getFleetSummary(): Promise<{ success: boolean; data: unknown }> {
    const summary = await this.fleetService.getFleetSummary();
    return { success: true, data: summary };
  }
}
