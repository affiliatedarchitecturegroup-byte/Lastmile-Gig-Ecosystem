/**
 * Payout Type enum - Classification of payment flows.
 */
package com.lastmilegig.payments.model;

public enum PayoutType {
    CUSTOMER_CHARGE,
    DRIVER_PAYOUT,
    PARTNER_SETTLEMENT,
    REFUND,
    SLA_SETTLEMENT
}
