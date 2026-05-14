package co.za.aagais.lastmilegig.payments.repository;

import co.za.aagais.lastmilegig.payments.model.PaymentEntity;
import co.za.aagais.lastmilegig.payments.model.PaymentGateway;
import co.za.aagais.lastmilegig.payments.model.PaymentStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for payment transactions.
 *
 * @since 1.0.0
 */
@Repository
public interface PaymentRepository extends JpaRepository<PaymentEntity, UUID> {

    /**
     * Find payment by order ID.
     */
    Optional<PaymentEntity> findByOrderId(String orderId);

    /**
     * Find payment by gateway reference (used for webhook verification).
     */
    Optional<PaymentEntity> findByGatewayReference(String gatewayReference);

    /**
     * Find all payments for a customer.
     */
    Page<PaymentEntity> findByCustomerIdOrderByCreatedAtDesc(
        String customerId, Pageable pageable
    );

    /**
     * Find all payments for a partner.
     */
    Page<PaymentEntity> findByPartnerIdOrderByCreatedAtDesc(
        String partnerId, Pageable pageable
    );

    /**
     * Find payments by status.
     */
    List<PaymentEntity> findByStatus(PaymentStatus status);

    /**
     * Find payments by gateway and status.
     */
    List<PaymentEntity> findByGatewayAndStatus(
        PaymentGateway gateway, PaymentStatus status
    );

    /**
     * Find completed payments within a date range (for reconciliation).
     */
    @Query("SELECT p FROM PaymentEntity p WHERE p.status = :status " +
           "AND p.completedAt BETWEEN :start AND :end " +
           "ORDER BY p.completedAt ASC")
    List<PaymentEntity> findCompletedInRange(
        @Param("status") PaymentStatus status,
        @Param("start") Instant start,
        @Param("end") Instant end
    );

    /**
     * Find payments awaiting payout.
     */
    @Query("SELECT p FROM PaymentEntity p WHERE p.status = 'COMPLETED' " +
           "AND (p.payoutStatus IS NULL OR p.payoutStatus = 'PAYOUT_PENDING') " +
           "ORDER BY p.completedAt ASC")
    List<PaymentEntity> findAwaitingPayout();

    /**
     * Count payments by status for dashboard metrics.
     */
    long countByStatus(PaymentStatus status);

    /**
     * Sum of completed payment amounts for a partner in a date range.
     */
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PaymentEntity p " +
           "WHERE p.partnerId = :partnerId AND p.status = 'COMPLETED' " +
           "AND p.completedAt BETWEEN :start AND :end")
    java.math.BigDecimal sumCompletedAmountByPartner(
        @Param("partnerId") String partnerId,
        @Param("start") Instant start,
        @Param("end") Instant end
    );
}
