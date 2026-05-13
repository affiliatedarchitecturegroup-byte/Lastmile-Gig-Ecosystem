/**
 * Payment Gateway enum - All supported payment gateways.
 *
 * Gateway selection is context-based:
 * - customer payment (ZA) -> PAYSTACK
 * - corporate invoice -> STRIPE
 * - driver payout (instant) -> OZOW
 * - enterprise contract -> PEACH
 * - pan-African multi-currency -> FLUTTERWAVE
 * - SLA settlement -> POLYGON_CDK
 *
 * @see docs/specs/11_PAYMENTS_FINANCIAL.md
 */
package com.lastmilegig.payments.model;

public enum PaymentGateway {
    PAYSTACK,
    STRIPE,
    OZOW,
    PEACH,
    FLUTTERWAVE,
    SNAPSCAN,
    POLYGON_CDK
}
