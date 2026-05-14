package co.za.aagais.lastmilegig.payments.service;

import co.za.aagais.lastmilegig.payments.gateway.PaymentGatewayAdapter;
import co.za.aagais.lastmilegig.payments.model.PaymentEntity;
import co.za.aagais.lastmilegig.payments.model.PaymentGateway;
import co.za.aagais.lastmilegig.payments.model.PaymentRequest;
import co.za.aagais.lastmilegig.payments.model.PaymentResponse;
import co.za.aagais.lastmilegig.payments.model.PaymentStatus;
import co.za.aagais.lastmilegig.payments.repository.PaymentRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Core payment processing service.
 *
 * <p>Orchestrates payment lifecycle: initiation, verification,
 * refunds, and status management. Delegates to gateway-specific
 * adapters for actual charge processing.</p>
 *
 * @since 1.0.0
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final GatewayRouter gatewayRouter;

    public PaymentService(PaymentRepository paymentRepository, GatewayRouter gatewayRouter) {
        this.paymentRepository = paymentRepository;
        this.gatewayRouter = gatewayRouter;
    }

    /**
     * Initiate a new payment.
     *
     * <p>Creates a payment entity, selects the appropriate gateway,
     * and initiates the charge. Returns the payment response with
     * authorization URL for redirect-based flows.</p>
     */
    @Transactional
    public PaymentResponse initiatePayment(PaymentRequest request) {
        log.info("Processing payment for order {} amount {} {}",
            request.orderId(), request.amount(), request.currency());

        // Select gateway
        PaymentGateway selectedGateway = gatewayRouter.selectGateway(
            request.preferredGateway(), request.currency(), request.amount()
        );

        // Create entity
        PaymentEntity entity = new PaymentEntity();
        entity.setOrderId(request.orderId());
        entity.setCustomerId(request.customerId());
        entity.setPartnerId(request.partnerId());
        entity.setAmount(request.amount());
        entity.setCurrency(request.currency());
        entity.setGateway(selectedGateway);
        entity.setCustomerEmail(request.customerEmail());
        entity.setCustomerName(request.customerName());
        entity.setCallbackUrl(request.callbackUrl());
        entity.setMetadata(request.metadata());
        entity.setStatus(PaymentStatus.PENDING);

        entity = paymentRepository.save(entity);

        // Initiate charge via gateway adapter
        PaymentGatewayAdapter adapter = gatewayRouter.getAdapter(selectedGateway);
        entity = adapter.initiateCharge(request, entity);

        entity = paymentRepository.save(entity);

        log.info("Payment {} created for order {} via {} - status: {}",
            entity.getId(), request.orderId(), selectedGateway, entity.getStatus());

        return entity.toResponse();
    }

    /**
     * Get payment by ID.
     */
    public PaymentResponse getPayment(String paymentId) {
        PaymentEntity entity = paymentRepository.findById(UUID.fromString(paymentId))
            .orElseThrow(() -> new PaymentNotFoundException(
                "Payment not found: " + paymentId));
        return entity.toResponse();
    }

    /**
     * Get payment by order ID.
     */
    public PaymentResponse getPaymentByOrderId(String orderId) {
        PaymentEntity entity = paymentRepository.findByOrderId(orderId)
            .orElseThrow(() -> new PaymentNotFoundException(
                "Payment not found for order: " + orderId));
        return entity.toResponse();
    }

    /**
     * Process a full refund for a completed payment.
     */
    @Transactional
    public PaymentResponse refundPayment(String paymentId) {
        PaymentEntity entity = paymentRepository.findById(UUID.fromString(paymentId))
            .orElseThrow(() -> new PaymentNotFoundException(
                "Payment not found: " + paymentId));

        if (entity.getStatus() != PaymentStatus.COMPLETED) {
            throw new IllegalStateException(
                "Cannot refund payment in status: " + entity.getStatus());
        }

        entity.setStatus(PaymentStatus.REFUNDED);
        entity.setRefundedAmount(entity.getAmount());
        entity.setRefundedAt(java.time.Instant.now());

        entity = paymentRepository.save(entity);

        log.info("Payment {} refunded: {} {}", paymentId, entity.getAmount(), entity.getCurrency());

        return entity.toResponse();
    }

    /**
     * Update payment status after webhook verification.
     */
    @Transactional
    public void updatePaymentFromWebhook(String gatewayReference, PaymentStatus newStatus) {
        PaymentEntity entity = paymentRepository.findByGatewayReference(gatewayReference)
            .orElseThrow(() -> new PaymentNotFoundException(
                "Payment not found for reference: " + gatewayReference));

        PaymentStatus oldStatus = entity.getStatus();
        entity.setStatus(newStatus);

        if (newStatus == PaymentStatus.COMPLETED) {
            entity.setCompletedAt(java.time.Instant.now());
        }

        paymentRepository.save(entity);

        log.info("Payment {} status updated: {} -> {} (ref: {})",
            entity.getId(), oldStatus, newStatus, gatewayReference);
    }

    /**
     * Custom exception for payment not found scenarios.
     */
    public static class PaymentNotFoundException extends RuntimeException {
        public PaymentNotFoundException(String message) {
            super(message);
        }
    }
}
