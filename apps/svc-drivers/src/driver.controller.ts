/**
 * Driver Controller
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.3
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 */

import { Controller, Post, Get, Patch, Param, Body, Query, Logger } from '@nestjs/common';
import { DriverService } from './driver.service';
import type {
  DriverRegistrationDto,
  Driver,
  DriverStatus,
  DriverPerformanceScore,
  DeliveryZone,
} from '@lastmile-gig/shared-types';

@Controller('drivers')
export class DriverController {
  private readonly logger = new Logger(DriverController.name);

  constructor(private readonly driverService: DriverService) {}

  @Post('register')
  async register(@Body() dto: DriverRegistrationDto): Promise<{ driverId: string }> {
    this.logger.log('New driver registration');
    return this.driverService.register(dto);
  }

  @Get(':id')
  async getDriver(@Param('id') id: string): Promise<Driver | null> {
    return this.driverService.getDriver(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: DriverStatus },
  ): Promise<{ success: boolean }> {
    return this.driverService.updateStatus(id, body.status);
  }

  @Get(':id/performance')
  async getPerformance(@Param('id') id: string): Promise<DriverPerformanceScore | null> {
    return this.driverService.getPerformanceScore(id);
  }

  @Get('available')
  async getAvailable(@Query('zone') zone: DeliveryZone): Promise<Driver[]> {
    return this.driverService.getAvailableDrivers(zone);
  }
}
