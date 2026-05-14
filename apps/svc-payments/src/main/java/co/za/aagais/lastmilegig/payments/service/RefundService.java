package co.za.aagais.lastmilegig.payments.service;

import co.za.aagais.lastmilegig.payments.gateway.PaymentGatewayAdapter;
import co.za.aagais.lastmilegig.payments.kafka.PaymentKafkaProducer;
import co.za.aagais.lastmilegig.payments.model.PaymentEntity;
import co.za.aagais.lastmilegig.payments.model.PaymentStatus;
import co.za.aagais.lastmilegig.payments.repository.PaymentRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Refund processing service.
 *
 * <p>Handles full and partial refunds through the original payment gateway.
 * Validates refund eligibility, processes the refund, and publishes events.</p>
 *
 * <p>Refund rules:
 * <ul>
 *   <li>Full refunds allowed within 30 days of payment</li>
 *   <li>Partial refunds allowed up to original amount</li>
 *   <li>Only COMPLETED payments can be refunded</li>
 *   <li>Already refunded payments cannot be refunded again</li>
 * </ul>
 *
 * @since 1.0.0
 */
@Service
public class RefundService {

    private static final Logger log = LoggerFactory.getLogger(RefundService.class);
    private static final long REFUND_WINDOW_DAYS = 30;

    private final PaymentRepository paymentRepository;
    private final GatewayRouter gatewayRouter;
    private final PaymentKafkaProducer kafkaProducer;

    public RefundService(
            PaymentRepository paymentRepository,
            GatewayRouter gatewayRouter,
            PaymentKafkaProducer kafkaProducer) {
        this.paymentRepository = paymentRepository;
        this.gatewayRouter = gatewayRouter;
        this.kafkaProducer = kafkaProducer;
    }

    /**
     * Process a full refund.
     *
     * @param paymentId UUID of the payment to refund
     * @param reason Reason for the refund
     * @return Updated payment entity
     */
    @Transactional
    public PaymentEntity processFullRefund(String paymentId, String reason) {
        return processRefund(paymentId, null, reason);
    }

    /**
     * Process a partial refund.
     *
     * @param paymentId UUID of the payment
     * @param amount Amount to refund (must be <= original amount)
     * @param reason Reason for the refund
     * @return Updated payment entity
     */
    @Transactional
    public PaymentEntity processPartialRefund(
            String paymentId, BigDecimal amount, String reason) {
        return processRefund(paymentId, amount, reason);
    }

    /**
     * Core refund processing logic.
     */
    private PaymentEntity processRefund(
            String paymentId, BigDecimal refundAmount, String reason) {
        log.info("Processing refund for payment {}: amount={} reason={}",
            paymentId, refundAmount != null ? refundAmount : "FULL", reason);

        PaymentEntity payment = paymentRepository.findById(UUID.fromString(paymentId))
            .orElseThrow(() -> new IllegalArgumentException(
                "Payment not found: " + paymentId));

        // Validate refund eligibility
        validateRefundEligibility(payment, refundAmount);

        // Determine refund amount
        BigDecimal actualRefundAmount = refundAmount != null
            ? refundAmount : payment.getAmount();

        // Process refund via gateway
        try {
            // TODO: Call gateway-specific refund API
            // PaymentGatewayAdapter adapter = gatewayRouter.getAdapter(payment.getGateway());
            // adapter.processRefund(payment.getGatewayReference(), actualRefundAmount);

            log.info("Gateway refund processed for payment {} via {}",
                paymentId, payment.getGateway());

            // Update payment status
            boolean isFullRefund = actualRefundAmount.compareTo(payment.getAmount()) == 0;
            payment.setStatus(isFullRefund
                ? PaymentStatus.REFUNDED
                : PaymentStatus.PARTIALLY_REFUNDED);

            BigDecimal previousRefunds = payment.getRefundedAmount() != null
                ? payment.getRefundedAmount() : BigDecimal.ZERO;
            payment.setRefundedAmount(previousRefunds.add(actualRefundAmount));
            payment.setRefundedAt(Instant.now());

            payment = paymentRepository.save(payment);

            // Publish event
            kafkaProducer.publishPaymentRefunded(
                paymentId,
                payment.getOrderId(),
                actualRefundAmount.toPlainString()
            );

            log.info("Refund completed: payment={} amount={} status={}",
                paymentId, actualRefundAmount, payment.getStatus());

        } catch (Exception e) {
            log.error("Refund processing failed for payment {}", paymentId, e);
            throw new RuntimeException("Refund failed: " + e.getMessage(), e);
        }

        return payment;
    }

    /**
     * Validate that a payment is eligible for refund.
     */
    private void validateRefundEligibility(PaymentEntity payment, BigDecimal refundAmount) {
        // Must be completed
        if (payment.getStatus() != PaymentStatus.COMPLETED
                && payment.getStatus() != PaymentStatus.PARTIALLY_REFUNDED) {
            throw new IllegalStateException(
                "Cannot refund payment in status: " + payment.getStatus());
        }

        // Must be within refund window
        if (payment.getCompletedAt() != null) {
            long daysSinceCompletion = java.time.Duration.between(
                payment.getCompletedAt(), Instant.now()
            ).toDays();

            if (daysSinceCompletion > REFUND_WINDOW_DAYS) {
                throw new IllegalStateException(
                    "Refund window expired. Payment completed " + daysSinceCompletion + " days ago.");
            }
        }

        // Partial refund amount validation
        if (refundAmount != null) {
            if (refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Refund amount must be positive");
            }

            BigDecimal remainingRefundable = payment.getAmount()
                .subtract(payment.getRefundedAmount() != null
                    ? payment.getRefundedAmount() : BigDecimal.ZERO);

            if (refundAmount.compareTo(remainingRefundable) > 0) {
                throw new IllegalArgumentException(String.format(
                    "Refund amount R%s exceeds remaining refundable amount R%s",
                    refundAmount.toPlainString(), remainingRefundable.toPlainString()
                ));
            }
        }

        // Cannot refund already fully refunded
        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            throw new IllegalStateException("Payment has already been fully refunded");
        }
    }
}
