/**
 * Payment entity - Maps to the payments table in Supabase PostgreSQL.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2
 */
package com.lastmilegig.payments.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "partner_id", nullable = false)
    private UUID partnerId;

    @Column(name = "driver_id")
    private UUID driverId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "ZAR";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentGateway gateway;

    @Column(name = "gateway_ref", length = 100)
    private String gatewayRef;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payout_type", nullable = false, length = 30)
    private PayoutType payoutType;

    @Column(name = "commission_rate", precision = 5, scale = 4)
    private BigDecimal commissionRate;

    @Column(name = "commission_amount", precision = 12, scale = 2)
    private BigDecimal commissionAmount;

    @Column(name = "driver_payout_amount", precision = 12, scale = 2)
    private BigDecimal driverPayoutAmount;

    @Column(name = "partner_settlement_amount", precision = 12, scale = 2)
    private BigDecimal partnerSettlementAmount;

    @Column(name = "refund_amount", precision = 12, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "refund_reason", length = 500)
    private String refundReason;

    @Column(name = "blockchain_tx", length = 100)
    private String blockchainTx;

    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }

    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID customerId) { this.customerId = customerId; }

    public UUID getPartnerId() { return partnerId; }
    public void setPartnerId(UUID partnerId) { this.partnerId = partnerId; }

    public UUID getDriverId() { return driverId; }
    public void setDriverId(UUID driverId) { this.driverId = driverId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public PaymentGateway getGateway() { return gateway; }
    public void setGateway(PaymentGateway gateway) { this.gateway = gateway; }

    public String getGatewayRef() { return gatewayRef; }
    public void setGatewayRef(String gatewayRef) { this.gatewayRef = gatewayRef; }

    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }

    public PayoutType getPayoutType() { return payoutType; }
    public void setPayoutType(PayoutType payoutType) { this.payoutType = payoutType; }

    public BigDecimal getCommissionRate() { return commissionRate; }
    public void setCommissionRate(BigDecimal commissionRate) { this.commissionRate = commissionRate; }

    public BigDecimal getCommissionAmount() { return commissionAmount; }
    public void setCommissionAmount(BigDecimal commissionAmount) { this.commissionAmount = commissionAmount; }

    public BigDecimal getDriverPayoutAmount() { return driverPayoutAmount; }
    public void setDriverPayoutAmount(BigDecimal driverPayoutAmount) { this.driverPayoutAmount = driverPayoutAmount; }

    public BigDecimal getPartnerSettlementAmount() { return partnerSettlementAmount; }
    public void setPartnerSettlementAmount(BigDecimal partnerSettlementAmount) { this.partnerSettlementAmount = partnerSettlementAmount; }

    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }

    public String getRefundReason() { return refundReason; }
    public void setRefundReason(String refundReason) { this.refundReason = refundReason; }

    public String getBlockchainTx() { return blockchainTx; }
    public void setBlockchainTx(String blockchainTx) { this.blockchainTx = blockchainTx; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
