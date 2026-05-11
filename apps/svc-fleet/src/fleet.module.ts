/**
 * Fleet Module - Root Module (Phase F Implementation)
 *
 * Manages vehicle inventory, rentals, IoT devices, and maintenance.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md - P141-P145
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
  ],
  controllers: [FleetController],
  providers: [FleetService],
  exports: [FleetService],
})
export class FleetModule {}
