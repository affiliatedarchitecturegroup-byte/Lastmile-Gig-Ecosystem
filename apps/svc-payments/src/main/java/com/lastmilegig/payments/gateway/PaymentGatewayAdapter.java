/**
 * Payment Gateway Adapter - Interface for all payment gateway implementations.
 *
 * Each gateway (Paystack, Stripe, Ozow, Peach, Flutterwave) implements
 * this interface to provide a unified payment abstraction.
 *
 * @see docs/specs/11_PAYMENTS_FINANCIAL.md
 */
package com.lastmilegig.payments.gateway;

import java.math.BigDecimal;
import java.util.Map;

public interface PaymentGatewayAdapter {

    /** Gateway identifier matching PaymentGateway enum */
    String getGatewayName();

    /**
     * Initiate a payment charge.
     * @return Gateway-specific charge reference
     */
    ChargeResult initiateCharge(ChargeRequest request);

    /**
     * Verify a payment using the gateway reference.
     * @return Verification result with status
     */
    VerificationResult verifyPayment(String gatewayRef);

    /**
     * Process a refund for a completed payment.
     * @return Refund reference
     */
    RefundResult processRefund(String gatewayRef, BigDecimal amount, String reason);

    /**
     * Initiate a payout/transfer to a bank account.
     * @return Payout reference
     */
    PayoutResult initiatePayout(PayoutRequest request);

    /**
     * Verify a webhook signature from the gateway.
     */
    boolean verifyWebhookSignature(String payload, String signature);

    // --- Inner DTOs ---

    record ChargeRequest(
        BigDecimal amount,
        String currency,
        String email,
        String reference,
        String callbackUrl,
        Map<String, String> metadata
    ) {}

    record ChargeResult(
        boolean success,
        String gatewayRef,
        String authorizationUrl,
        String message
    ) {}

    record VerificationResult(
        boolean success,
        String status,
        String gatewayRef,
        BigDecimal amount,
        String currency
    ) {}

    record RefundResult(
        boolean success,
        String refundRef,
        BigDecimal amount,
        String message
    ) {}

    record PayoutRequest(
        BigDecimal amount,
        String currency,
        String bankCode,
        String accountNumber,
        String accountName,
        String reference,
        String narration
    ) {}

    record PayoutResult(
        boolean success,
        String payoutRef,
        String status,
        String message
    ) {}
}
