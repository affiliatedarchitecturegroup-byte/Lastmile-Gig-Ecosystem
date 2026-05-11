/**
 * Onboarding Service - Driver Onboarding Workflow
 *
 * Orchestrates the multi-step driver onboarding process:
 * 1. Registration (handled by DriverService)
 * 2. Licence upload & extraction
 * 3. Biometric face enrollment
 * 4. Bank account verification (Paystack)
 * 5. POPIA consent recording
 * 6. Admin approval -> activation
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 * @module services/onboarding.service
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import { DriverRepository } from '../repositories/driver.repository';
import { BiometricService } from './biometric.service';
import { PaystackService } from './paystack.service';
import { KafkaProducerService } from './kafka-producer.service';
import type { DriverRecord } from '../dto/driver.dto';

/**
 * Onboarding step status.
 */
export interface OnboardingStatus {
  driverId: string;
  steps: {
    registration: StepStatus;
    licenceUpload: StepStatus;
    biometricEnrollment: StepStatus;
    bankVerification: StepStatus;
    popiaConsent: StepStatus;
    adminApproval: StepStatus;
  };
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
  canActivate: boolean;
}

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * Licence upload result.
 */
export interface LicenceUploadResult {
  success: boolean;
  licenceNumber: string;
  expiryDate: string;
  extractionConfidence: number;
}

/**
 * Bank verification request.
 */
export interface BankVerifyRequest {
  accountNumber: string;
  bankCode: string;
  accountHolderName: string;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  /** In-memory onboarding progress tracker for dev. */
  private readonly onboardingProgress = new Map<string, Record<string, StepStatus>>();

  constructor(
    private readonly driverRepo: DriverRepository,
    private readonly biometricService: BiometricService,
    private readonly paystackService: PaystackService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /**
   * Gets the current onboarding status for a driver.
   */
  async getOnboardingStatus(driverId: string): Promise<OnboardingStatus> {
    const driver = await this.driverRepo.findById(driverId);
    const progress = this.onboardingProgress.get(driverId) ?? {};

    const steps = {
      registration: 'completed' as StepStatus,
      licenceUpload: progress['licence'] ?? (driver.licence_number ? 'completed' : 'pending'),
      biometricEnrollment: progress['biometric'] ?? (driver.biometric_ref ? 'completed' : 'pending'),
      bankVerification: progress['bank'] ?? (driver.bank_verified ? 'completed' : 'pending'),
      popiaConsent: driver.popia_consent ? 'completed' as StepStatus : 'pending' as StepStatus,
      adminApproval: driver.status === 'active' ? 'completed' as StepStatus : 'pending' as StepStatus,
    };

    const completedSteps = Object.values(steps).filter((s) => s === 'completed').length;
    const totalSteps = 6;

    return {
      driverId,
      steps,
      completedSteps,
      totalSteps,
      percentComplete: Math.round((completedSteps / totalSteps) * 100),
      canActivate: completedSteps >= 5, // all steps except admin approval
    };
  }

  /**
   * Processes a licence upload.
   * In production, uses LangChain + Textract for PDF/image extraction.
   */
  async uploadLicence(
    driverId: string,
    licenceImageBase64: string,
  ): Promise<LicenceUploadResult> {
    this.logger.log(`Processing licence upload for driver ${driverId}`);
    const driver = await this.driverRepo.findById(driverId);

    // Dev mode: simulate licence extraction
    const extractedData = await this.extractLicenceData(licenceImageBase64);

    // Update driver record with licence info
    await this.driverRepo.update(driverId, {
      licence_number: extractedData.licenceNumber,
      licence_expiry: extractedData.expiryDate,
    });

    this.updateProgress(driverId, 'licence', 'completed');
    this.logger.log(`Licence processed for driver ${driverId}`);

    return {
      success: true,
      licenceNumber: this.maskLicenceNumber(extractedData.licenceNumber),
      expiryDate: extractedData.expiryDate,
      extractionConfidence: extractedData.confidence,
    };
  }

  /**
   * Enrolls biometric face template.
   */
  async enrollBiometric(
    driverId: string,
    selfieImageBase64: string,
  ): Promise<{ success: boolean; enrolledAt: string }> {
    const result = await this.biometricService.enrollFace(driverId, selfieImageBase64);

    if (result.success) {
      await this.driverRepo.update(driverId, { biometric_ref: result.biometricRef });
      this.updateProgress(driverId, 'biometric', 'completed');
    }

    return { success: result.success, enrolledAt: result.enrolledAt };
  }

  /**
   * Verifies bank account via Paystack.
   */
  async verifyBankAccount(
    driverId: string,
    request: BankVerifyRequest,
  ): Promise<{ verified: boolean; bankName: string; maskedAccount: string }> {
    const driver = await this.driverRepo.findById(driverId);

    const result = await this.paystackService.verifyBankAccount(
      request.accountNumber,
      request.bankCode,
      request.accountHolderName,
    );

    if (result.verified) {
      await this.driverRepo.update(driverId, { bank_verified: true });
      this.updateProgress(driverId, 'bank', 'completed');
    }

    return {
      verified: result.verified,
      bankName: result.bankName,
      maskedAccount: result.accountNumber,
    };
  }

  /**
   * Checks if onboarding is complete and notifies admin for approval.
   */
  async checkAndRequestApproval(driverId: string): Promise<{
    ready: boolean;
    status: OnboardingStatus;
  }> {
    const status = await this.getOnboardingStatus(driverId);

    if (status.canActivate) {
      this.logger.log(`Driver ${driverId} ready for admin approval`);
      // In production: publish event for Command Centre notification
    }

    return { ready: status.canActivate, status };
  }

  /**
   * Admin approves driver -> activates account.
   */
  async approveDriver(driverId: string): Promise<void> {
    const driver = await this.driverRepo.findById(driverId);

    if (driver.status !== 'onboarding') {
      throw new BadRequestException('Driver is not in onboarding status');
    }

    const status = await this.getOnboardingStatus(driverId);
    if (!status.canActivate) {
      throw new BadRequestException(
        `Driver has only completed ${status.completedSteps}/${status.totalSteps - 1} onboarding steps`,
      );
    }

    await this.driverRepo.update(driverId, {
      status: 'active',
      onboarded_at: new Date().toISOString(),
    });

    this.updateProgress(driverId, 'admin', 'completed');
    await this.kafkaProducer.publishDriverOnboarded(driverId, driver.zone);

    this.logger.log(`Driver ${driverId} approved and activated`);
  }

  // --- Private helpers ---

  private async extractLicenceData(_imageBase64: string): Promise<{
    licenceNumber: string;
    expiryDate: string;
    confidence: number;
  }> {
    // Dev mode: simulate LangChain + Textract extraction
    return {
      licenceNumber: `DL${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      expiryDate: '2028-12-31',
      confidence: 0.94,
    };
  }

  private maskLicenceNumber(licence: string): string {
    if (licence.length <= 4) return '****';
    return licence.substring(0, 2) + '****' + licence.slice(-2);
  }

  private updateProgress(driverId: string, step: string, status: StepStatus): void {
    const progress = this.onboardingProgress.get(driverId) ?? {};
    progress[step] = status;
    this.onboardingProgress.set(driverId, progress);
  }
}
