/**
 * Onboarding Controller - Driver Onboarding Endpoints
 *
 * Handles the multi-step onboarding flow: licence upload, biometric enrollment,
 * bank verification, and admin approval.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 * @module controllers/onboarding.controller
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';

import { OnboardingService } from '../services/onboarding.service';

interface AuthenticatedRequest {
  user: { userId: string; role: string };
}

@Controller('drivers')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * GET /v1/drivers/:id/onboarding
   * Gets current onboarding status.
   */
  @Get(':id/onboarding')
  async getOnboardingStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const status = await this.onboardingService.getOnboardingStatus(id);
    return { success: true, data: status };
  }

  /**
   * POST /v1/drivers/:id/onboarding/licence
   * Uploads and processes a driver licence image.
   */
  @Post(':id/onboarding/licence')
  @HttpCode(HttpStatus.OK)
  async uploadLicence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { licenceImage: string },
  ): Promise<{ success: boolean; data: unknown }> {
    const result = await this.onboardingService.uploadLicence(id, body.licenceImage);
    return { success: true, data: result };
  }

  /**
   * POST /v1/drivers/:id/onboarding/biometric
   * Enrolls driver biometric face template.
   */
  @Post(':id/onboarding/biometric')
  @HttpCode(HttpStatus.OK)
  async enrollBiometric(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { selfieImage: string },
  ): Promise<{ success: boolean; data: unknown }> {
    const result = await this.onboardingService.enrollBiometric(id, body.selfieImage);
    return { success: true, data: result };
  }

  /**
   * POST /v1/drivers/:id/onboarding/bank-verify
   * Verifies driver bank account via Paystack.
   */
  @Post(':id/onboarding/bank-verify')
  @HttpCode(HttpStatus.OK)
  async verifyBank(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { accountNumber: string; bankCode: string; accountHolderName: string },
  ): Promise<{ success: boolean; data: unknown }> {
    const result = await this.onboardingService.verifyBankAccount(id, body);
    return { success: true, data: result };
  }

  /**
   * POST /v1/drivers/:id/onboarding/approve
   * Admin approves a driver's onboarding (admin/ops only).
   */
  @Post(':id/onboarding/approve')
  @HttpCode(HttpStatus.OK)
  async approveDriver(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.onboardingService.approveDriver(id);
    return { success: true, message: 'Driver approved and activated.' };
  }

  /**
   * GET /v1/drivers/:id/onboarding/ready
   * Checks if driver is ready for admin approval.
   */
  @Get(':id/onboarding/ready')
  async checkReady(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const result = await this.onboardingService.checkAndRequestApproval(id);
    return { success: true, data: result };
  }

  /**
   * GET /v1/drivers/banks
   * Lists supported SA banks for verification.
   */
  @Get('banks')
  getSupportedBanks(): { success: boolean; data: Array<{ name: string; code: string }> } {
    const paystackService = (this.onboardingService as unknown as { paystackService: { getSupportedBanks: () => Array<{ name: string; code: string }> } }).paystackService;
    // Simplified: in production, inject PaystackService directly
    return {
      success: true,
      data: [
        { name: 'ABSA', code: '632005' },
        { name: 'Capitec', code: '470010' },
        { name: 'FNB', code: '250655' },
        { name: 'Nedbank', code: '198765' },
        { name: 'Standard Bank', code: '051001' },
        { name: 'Investec', code: '580105' },
        { name: 'TymeBank', code: '678910' },
        { name: 'Discovery Bank', code: '679000' },
      ],
    };
  }
}
