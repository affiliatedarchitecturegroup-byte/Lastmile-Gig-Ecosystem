package co.za.aagais.lastmilegig.payments.model;

/**
 * Payment lifecycle status enum.
 *
 * <p>Represents all possible states of a payment transaction from
 * initiation through to settlement or failure.</p>
 *
 * @since 1.0.0
 */
public enum PaymentStatus {
    /** Payment has been created but not yet submitted to gateway */
    PENDING,

    /** Payment has been submitted to gateway, awaiting processing */
    PROCESSING,

    /** Payment successfully completed by the gateway */
    COMPLETED,

    /** Payment failed at the gateway level */
    FAILED,

    /** Payment was cancelled before completion */
    CANCELLED,

    /** Full refund has been processed */
    REFUNDED,

    /** Partial refund has been processed */
    PARTIALLY_REFUNDED,

    /** Payment is under dispute/chargeback review */
    DISPUTED,

    /** Payout to driver/partner has been initiated */
    PAYOUT_PENDING,

    /** Payout to driver/partner completed successfully */
    PAYOUT_COMPLETED,

    /** Payout to driver/partner failed */
    PAYOUT_FAILED
}
