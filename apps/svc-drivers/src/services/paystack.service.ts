/**
 * Paystack Service - Bank Account Verification
 *
 * Verifies driver bank accounts via the Paystack Resolve Account Number API
 * before activating the driver for payouts. Required during onboarding.
 *
 * @see docs/specs/11_PAYMENTS_FINANCIAL.md
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 * @module services/paystack.service
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { DriverServiceConfig } from '../config/driver.config';

/**
 * Paystack bank verification result.
 */
export interface BankVerificationResult {
  verified: boolean;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
}

/**
 * SA bank codes supported by Paystack.
 */
export const SA_BANK_CODES: Record<string, string> = {
  'ABSA': '632005',
  'Capitec': '470010',
  'FNB': '250655',
  'Nedbank': '198765',
  'Standard Bank': '051001',
  'Investec': '580105',
  'African Bank': '430000',
  'TymeBank': '678910',
  'Discovery Bank': '679000',
  'Bank Zero': '888000',
};

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly config: DriverServiceConfig;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<DriverServiceConfig>('driver');
    if (!config) {
      throw new Error('Driver configuration not loaded');
    }
    this.config = config;
  }

  /**
   * Verifies a bank account number via Paystack Resolve Account API.
   * Confirms that the account number belongs to the driver's name.
   *
   * @param accountNumber - SA bank account number
   * @param bankCode - Bank code (e.g., '632005' for ABSA)
   * @param expectedName - Driver's registered name for matching
   * @returns Verification result
   */
  async verifyBankAccount(
    accountNumber: string,
    bankCode: string,
    expectedName: string,
  ): Promise<BankVerificationResult> {
    this.logger.log(`Verifying bank account (bank code: ${bankCode})`);

    if (this.config.environment === 'development') {
      // Dev mode: simulate successful verification
      const bankName = Object.entries(SA_BANK_CODES).find(
        ([, code]) => code === bankCode,
      )?.[0] ?? 'Unknown Bank';

      return {
        verified: true,
        accountName: expectedName.toUpperCase(),
        accountNumber: this.maskAccountNumber(accountNumber),
        bankName,
        bankCode,
      };
    }

    try {
      // Production: Paystack Resolve Account Number API
      const response = await fetch(
        `${this.config.paystack.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.paystack.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.warn(`Paystack verification failed: ${errorBody}`);
        throw new BadRequestException({
          type: 'https://api.lastmilegig.aagais.co.za/errors/bank-verification-failed',
          title: 'Bank Verification Failed',
          status: 400,
          detail: 'Could not verify the bank account. Please check your details and try again.',
        });
      }

      const data = await response.json() as {
        status: boolean;
        data: { account_name: string; account_number: string; bank_id: number };
      };

      if (!data.status) {
        throw new BadRequestException('Bank verification returned unsuccessful status');
      }

      // Check name similarity (fuzzy match)
      const nameMatch = this.fuzzyNameMatch(data.data.account_name, expectedName);
      if (!nameMatch) {
        this.logger.warn('Bank account name does not match driver name');
        throw new BadRequestException({
          type: 'https://api.lastmilegig.aagais.co.za/errors/name-mismatch',
          title: 'Name Mismatch',
          status: 400,
          detail: 'The bank account name does not match your registered name.',
        });
      }

      const bankName = Object.entries(SA_BANK_CODES).find(
        ([, code]) => code === bankCode,
      )?.[0] ?? 'Unknown Bank';

      return {
        verified: true,
        accountName: data.data.account_name,
        accountNumber: this.maskAccountNumber(data.data.account_number),
        bankName,
        bankCode,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Paystack API error: ${message}`);
      throw new BadRequestException('Bank verification service temporarily unavailable');
    }
  }

  /**
   * Lists supported SA banks with their codes.
   */
  getSupportedBanks(): Array<{ name: string; code: string }> {
    return Object.entries(SA_BANK_CODES).map(([name, code]) => ({ name, code }));
  }

  // --- Private helpers ---

  /**
   * Masks account number for safe display/logging.
   */
  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return '****';
    return '****' + accountNumber.slice(-4);
  }

  /**
   * Fuzzy name matching (case-insensitive, ignores middle names).
   */
  private fuzzyNameMatch(bankName: string, driverName: string): boolean {
    const normalize = (name: string): string =>
      name.toLowerCase().replace(/[^a-z\s]/g, '').trim();

    const bankParts = normalize(bankName).split(/\s+/);
    const driverParts = normalize(driverName).split(/\s+/);

    // At least first and last name should match
    if (bankParts.length < 2 || driverParts.length < 2) return false;

    const firstMatch = bankParts[0] === driverParts[0];
    const lastMatch = bankParts[bankParts.length - 1] === driverParts[driverParts.length - 1];

    return firstMatch && lastMatch;
  }
}
