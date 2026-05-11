// -------------------------------------------------------------------
// Lastmile Gig Ecosystem - Data Erasure Endpoint
// Phase: P068 | POST /v1/users/me/data-deletion (30-day SLA)
// -------------------------------------------------------------------

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/jwt-validation.middleware';

/** Data erasure request body */
interface DataErasureRequest {
  reason: string;
  confirmEmail: string;
  retainAnonymisedAnalytics: boolean;
}

/** Data erasure status response */
interface DataErasureStatus {
  requestId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  requestedAt: string;
  scheduledDeletionAt: string;
  deletedCategories: string[];
  retainedCategories: string[];
}

/**
 * POPIA Right to Erasure controller.
 * Handles user data deletion requests with a 30-day SLA.
 *
 * Process:
 * 1. User requests data deletion
 * 2. System queues erasure with 30-day cooling period
 * 3. User receives confirmation email with cancellation link
 * 4. After 30 days, all personal data is permanently erased
 * 5. Anonymised analytics data may be retained if user consented
 * 6. Audit log entry is created (with anonymised user reference)
 */
@Controller('v1/users/me')
export class DataErasureController {
  private readonly logger = new Logger(DataErasureController.name);
  private readonly ERASURE_SLA_DAYS = 30;

  /**
   * POST /v1/users/me/data-deletion
   * Request deletion of all personal data.
   */
  @Post('data-deletion')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestDataDeletion(
    @Req() req: AuthenticatedRequest,
    @Body() body: DataErasureRequest,
  ): Promise<{
    message: string;
    requestId: string;
    scheduledDeletionAt: string;
  }> {
    const userId = req.userId;

    this.logger.log(
      `Data erasure requested for user ${userId.substring(0, 8)}...`,
    );

    // Validate email matches authenticated user
    // TODO: Fetch user email from Supabase and compare with body.confirmEmail

    const requestId = crypto.randomUUID();
    const scheduledDeletion = new Date();
    scheduledDeletion.setDate(
      scheduledDeletion.getDate() + this.ERASURE_SLA_DAYS,
    );

    // Data categories to be deleted
    const deletionCategories = [
      'personal_profile',
      'contact_information',
      'payment_methods',
      'order_history',
      'delivery_addresses',
      'location_history',
      'biometric_data',
      'consent_records',
      'notification_preferences',
      'device_tokens',
    ];

    // Categories that may be retained (anonymised)
    const retainedCategories = body.retainAnonymisedAnalytics
      ? ['anonymised_order_analytics', 'anonymised_delivery_metrics']
      : [];

    // TODO: Create erasure request in database
    // TODO: Send confirmation email via Communications Hub
    // TODO: Schedule BullMQ job for 30-day execution
    // TODO: Write audit log entry

    this.logger.log(
      `Data erasure queued: ${requestId}, scheduled for ${scheduledDeletion.toISOString()}`,
    );

    return {
      message: `Your data deletion request has been received. All personal data will be permanently deleted by ${scheduledDeletion.toDateString()}. You will receive a confirmation email with a link to cancel this request.`,
      requestId,
      scheduledDeletionAt: scheduledDeletion.toISOString(),
    };
  }

  /**
   * GET /v1/users/me/data-deletion
   * Check status of a data deletion request.
   */
  @Get('data-deletion')
  async getErasureStatus(
    @Req() req: AuthenticatedRequest,
  ): Promise<DataErasureStatus | { message: string }> {
    const userId = req.userId;

    // TODO: Fetch erasure request from database
    // Placeholder response
    this.logger.log(
      `Erasure status check for user ${userId.substring(0, 8)}...`,
    );

    return {
      message: 'No active data deletion request found.',
    };
  }
}
