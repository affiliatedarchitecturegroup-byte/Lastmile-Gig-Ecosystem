/**
 * Payment Repository - JPA interface for the payments table.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md
 */
package com.lastmilegig.payments.repository;

import com.lastmilegig.payments.model.Payment;
import com.lastmilegig.payments.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByOrderId(UUID orderId);

    List<Payment> findByCustomerId(UUID customerId);

    List<Payment> findByDriverId(UUID driverId);

    List<Payment> findByPartnerId(UUID partnerId);

    List<Payment> findByStatus(PaymentStatus status);

    List<Payment> findByCreatedAtBetween(Instant start, Instant end);

    long countByStatusAndCreatedAtBetween(PaymentStatus status, Instant start, Instant end);
}
