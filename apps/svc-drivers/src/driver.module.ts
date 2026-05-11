/**
 * Driver Module - Root Module (Phase F Implementation)
 *
 * Coordinates driver registration, onboarding, profile management,
 * fleet operations, and performance scoring.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { driverConfig } from './config/driver.config';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { DriverRepository } from './repositories/driver.repository';
import { KafkaProducerService } from './services/kafka-producer.service';
import { OnboardingService } from './services/onboarding.service';
import { BiometricService } from './services/biometric.service';
import { PaystackService } from './services/paystack.service';
import { OnboardingController } from './controllers/onboarding.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [driverConfig],
    }),
  ],
  controllers: [DriverController, OnboardingController],
  providers: [
    DriverService,
    DriverRepository,
    KafkaProducerService,
    OnboardingService,
    BiometricService,
    PaystackService,
  ],
  exports: [DriverService, DriverRepository],
})
export class DriverModule {}
