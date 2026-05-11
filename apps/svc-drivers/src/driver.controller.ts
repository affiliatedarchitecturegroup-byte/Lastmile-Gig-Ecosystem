/**
 * Driver Controller - Full Phase F Implementation
 *
 * Handles all driver endpoints: registration, profile CRUD, status management,
 * location updates, zone availability queries, and admin operations.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.3
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 * @module driver.controller
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';

import { DriverService } from './driver.service';
import {
  RegisterDriverDto,
  UpdateDriverDto,
  UpdateDriverStatusDto,
  UpdateLocationDto,
  AvailableDriversQueryDto,
  DeliveryZoneDto,
} from './dto/driver.dto';

/**
 * Authenticated request with user context from JWT middleware.
 */
interface AuthenticatedRequest {
  user: {
    userId: string;
    role: string;
    email: string;
  };
  ip: string;
}

@Controller('drivers')
export class DriverController {
  private readonly logger = new Logger(DriverController.name);

  constructor(private readonly driverService: DriverService) {}

  // --- Driver Self-Service Endpoints ---

  /**
   * POST /v1/drivers/register
   * Registers a new driver (requires authenticated user with driver role intent).
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDriverDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    success: boolean;
    data: {
      driverId: string;
      userId: string;
      email: string;
      status: string;
      zone: string;
      nextSteps: string[];
    };
  }> {
    const result = await this.driverService.register(dto, req.user.userId);
    return { success: true, data: result };
  }

  /**
   * GET /v1/drivers/me
   * Gets the authenticated driver's own profile.
   */
  @Get('me')
  async getMyProfile(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; data: unknown }> {
    const profile = await this.driverService.getProfileByUserId(req.user.userId);
    if (!profile) {
      return {
        success: false,
        data: { message: 'No driver profile found. Please register first.' },
      };
    }
    return { success: true, data: profile };
  }

  /**
   * PATCH /v1/drivers/me
   * Updates the authenticated driver's own profile.
   */
  @Patch('me')
  async updateMyProfile(
    @Body() dto: UpdateDriverDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; data: unknown }> {
    const existing = await this.driverService.getProfileByUserId(req.user.userId);
    if (!existing) {
      return { success: false, data: { message: 'No driver profile found.' } };
    }
    const updated = await this.driverService.updateProfile(existing.id, dto);
    return { success: true, data: updated };
  }

  /**
   * POST /v1/drivers/me/location
   * Updates the authenticated driver's GPS location.
   */
  @Post('me/location')
  @HttpCode(HttpStatus.OK)
  async updateMyLocation(
    @Body() dto: UpdateLocationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.driverService.getProfileByUserId(req.user.userId);
    if (!existing) {
      return { success: false, message: 'No driver profile found.' };
    }
    await this.driverService.updateLocation(existing.id, dto);
    return { success: true, message: 'Location updated.' };
  }

  // --- Public/Authenticated Query Endpoints ---

  /**
   * GET /v1/drivers/available
   * Queries available drivers in a zone (used by dispatch engine).
   */
  @Get('available')
  async getAvailable(
    @Query() query: AvailableDriversQueryDto,
  ): Promise<{
    success: boolean;
    data: { drivers: unknown[]; zone: string; total: number };
  }> {
    const result = await this.driverService.getAvailableDrivers(
      query.zone,
      query.vehicleType,
      query.minScore,
      query.limit,
    );
    return { success: true, data: result };
  }

  /**
   * GET /v1/drivers/zones/stats
   * Gets driver count per zone (ops dashboard).
   */
  @Get('zones/stats')
  async getZoneStats(): Promise<{
    success: boolean;
    data: Record<string, number>;
  }> {
    const stats = await this.driverService.getZoneStats();
    return { success: true, data: stats };
  }

  // --- Admin/Ops Endpoints ---

  /**
   * GET /v1/drivers
   * Lists all drivers with pagination (admin/ops).
   */
  @Get()
  async listDrivers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('zone') zone?: string,
    @Query('status') status?: string,
  ): Promise<{ success: boolean; data: unknown; meta: unknown }> {
    const result = await this.driverService.listDrivers(page, pageSize, zone, status);
    return {
      success: true,
      data: result.drivers,
      meta: { pagination: result.pagination },
    };
  }

  /**
   * GET /v1/drivers/:id
   * Gets a specific driver's profile.
   */
  @Get(':id')
  async getDriver(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const profile = await this.driverService.getProfile(id);
    return { success: true, data: profile };
  }

  /**
   * PATCH /v1/drivers/:id
   * Updates a driver's profile (admin/ops or self).
   */
  @Patch(':id')
  async updateDriver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverDto,
  ): Promise<{ success: boolean; data: unknown }> {
    const updated = await this.driverService.updateProfile(id, dto);
    return { success: true, data: updated };
  }

  /**
   * PATCH /v1/drivers/:id/status
   * Updates a driver's operational status.
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverStatusDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; data: unknown }> {
    const updated = await this.driverService.updateStatus(
      id,
      dto,
      req.user.userId,
      req.user.role,
    );
    return { success: true, data: updated };
  }

  /**
   * POST /v1/drivers/:id/location
   * Updates a driver's location (admin override or driver self).
   */
  @Post(':id/location')
  @HttpCode(HttpStatus.OK)
  async updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.driverService.updateLocation(id, dto);
    return { success: true, message: 'Location updated.' };
  }

  /**
   * GET /v1/drivers/:id/location
   * Gets a driver's current location (ops/dispatch use).
   */
  @Get(':id/location')
  async getLocation(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const location = await this.driverService.getLocation(id);
    return { success: true, data: location };
  }
}
