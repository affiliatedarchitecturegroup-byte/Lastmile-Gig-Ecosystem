package co.za.aagais.lastmilegig.payments.model;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Payment response DTO returned after charge initiation or status query.
 *
 * @since 1.0.0
 */
public record PaymentResponse(
    /** Internal payment transaction ID (UUID) */
    String paymentId,

    /** Associated order ID */
    String orderId,

    /** Gateway-specific transaction reference */
    String gatewayReference,

    /** Payment gateway used */
    PaymentGateway gateway,

    /** Current payment status */
    PaymentStatus status,

    /** Payment amount in currency units (e.g. ZAR) */
    BigDecimal amount,

    /** ISO 4217 currency code */
    String currency,

    /** Authorization URL for redirect-based flows (Paystack, Stripe) */
    String authorizationUrl,

    /** Access code for client-side SDK initialization */
    String accessCode,

    /** Timestamp when the payment was created */
    Instant createdAt,

    /** Timestamp of last status update */
    Instant updatedAt
) {}
