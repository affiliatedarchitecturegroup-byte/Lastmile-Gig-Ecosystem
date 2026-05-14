package co.za.aagais.lastmilegig.payments.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity representing a payment transaction in the database.
 *
 * <p>Maps to the {@code payments} table in Supabase PostgreSQL.
 * Includes full audit trail with created/updated timestamps.</p>
 *
 * @since 1.0.0
 */
@Entity
@Table(
    name = "payments",
    indexes = {
        @Index(name = "idx_payments_order_id", columnList = "orderId"),
        @Index(name = "idx_payments_customer_id", columnList = "customerId"),
        @Index(name = "idx_payments_partner_id", columnList = "partnerId"),
        @Index(name = "idx_payments_gateway_ref", columnList = "gatewayReference"),
        @Index(name = "idx_payments_status", columnList = "status"),
        @Index(name = "idx_payments_created", columnList = "createdAt")
    }
)
public class PaymentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String orderId;

    @Column(nullable = false)
    private String customerId;

    @Column(nullable = false)
    private String partnerId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentGateway gateway;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentStatus status;

    @Column(unique = true)
    private String gatewayReference;

    private String authorizationUrl;

    private String accessCode;

    @Column(length = 255)
    private String customerEmail;

    @Column(length = 255)
    private String customerName;

    private String callbackUrl;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(columnDefinition = "TEXT")
    private String gatewayResponse;

    private String failureReason;

    private BigDecimal refundedAmount;

    private String payoutReference;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private PaymentStatus payoutStatus;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    private Instant completedAt;

    private Instant refundedAt;

    private Instant payoutAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) {
            this.status = PaymentStatus.PENDING;
        }
        if (this.currency == null) {
            this.currency = "ZAR";
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // Getters and setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getPartnerId() { return partnerId; }
    public void setPartnerId(String partnerId) { this.partnerId = partnerId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public PaymentGateway getGateway() { return gateway; }
    public void setGateway(PaymentGateway gateway) { this.gateway = gateway; }

    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }

    public String getGatewayReference() { return gatewayReference; }
    public void setGatewayReference(String ref) { this.gatewayReference = ref; }

    public String getAuthorizationUrl() { return authorizationUrl; }
    public void setAuthorizationUrl(String url) { this.authorizationUrl = url; }

    public String getAccessCode() { return accessCode; }
    public void setAccessCode(String code) { this.accessCode = code; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String email) { this.customerEmail = email; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String name) { this.customerName = name; }

    public String getCallbackUrl() { return callbackUrl; }
    public void setCallbackUrl(String url) { this.callbackUrl = url; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }

    public String getGatewayResponse() { return gatewayResponse; }
    public void setGatewayResponse(String resp) { this.gatewayResponse = resp; }

    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String reason) { this.failureReason = reason; }

    public BigDecimal getRefundedAmount() { return refundedAmount; }
    public void setRefundedAmount(BigDecimal amt) { this.refundedAmount = amt; }

    public String getPayoutReference() { return payoutReference; }
    public void setPayoutReference(String ref) { this.payoutReference = ref; }

    public PaymentStatus getPayoutStatus() { return payoutStatus; }
    public void setPayoutStatus(PaymentStatus status) { this.payoutStatus = status; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant at) { this.completedAt = at; }
    public Instant getRefundedAt() { return refundedAt; }
    public void setRefundedAt(Instant at) { this.refundedAt = at; }
    public Instant getPayoutAt() { return payoutAt; }
    public void setPayoutAt(Instant at) { this.payoutAt = at; }

    /**
     * Convert entity to response DTO.
     */
    public PaymentResponse toResponse() {
        return new PaymentResponse(
            id.toString(),
            orderId,
            gatewayReference,
            gateway,
            status,
            amount,
            currency,
            authorizationUrl,
            accessCode,
            createdAt,
            updatedAt
        );
    }
}
