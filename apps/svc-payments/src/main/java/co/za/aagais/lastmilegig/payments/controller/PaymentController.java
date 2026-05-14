package co.za.aagais.lastmilegig.payments.controller;

import co.za.aagais.lastmilegig.payments.model.PaymentRequest;
import co.za.aagais.lastmilegig.payments.model.PaymentResponse;
import co.za.aagais.lastmilegig.payments.service.PaymentService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * REST controller for payment operations.
 *
 * <p>Handles charge initiation, status queries, and refund processing.
 * All endpoints require JWT authentication via the API Gateway.</p>
 *
 * @since 1.0.0
 */
@RestController
@RequestMapping("/v1/payments")
@Tag(name = "Payments", description = "Payment processing endpoints")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Initiate a new payment charge.
     *
     * <p>Creates a payment transaction and initializes it with the selected
     * (or auto-selected) payment gateway. Returns an authorization URL for
     * redirect-based flows.</p>
     */
    @PostMapping
    @Operation(summary = "Initiate payment", description = "Create and initiate a payment charge")
    public ResponseEntity<PaymentResponse> initiatePayment(
            @Valid @RequestBody PaymentRequest request) {
        log.info("Payment initiation request for order {}", request.orderId());
        PaymentResponse response = paymentService.initiatePayment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get payment status by payment ID.
     */
    @GetMapping("/{paymentId}")
    @Operation(summary = "Get payment status", description = "Retrieve payment details by ID")
    public ResponseEntity<PaymentResponse> getPayment(@PathVariable String paymentId) {
        PaymentResponse response = paymentService.getPayment(paymentId);
        return ResponseEntity.ok(response);
    }

    /**
     * Get payment status by order ID.
     */
    @GetMapping("/order/{orderId}")
    @Operation(summary = "Get payment by order", description = "Retrieve payment by order ID")
    public ResponseEntity<PaymentResponse> getPaymentByOrder(@PathVariable String orderId) {
        PaymentResponse response = paymentService.getPaymentByOrderId(orderId);
        return ResponseEntity.ok(response);
    }

    /**
     * Initiate a refund for a completed payment.
     */
    @PostMapping("/{paymentId}/refund")
    @Operation(summary = "Refund payment", description = "Initiate a full refund for a payment")
    public ResponseEntity<PaymentResponse> refundPayment(@PathVariable String paymentId) {
        log.info("Refund request for payment {}", paymentId);
        PaymentResponse response = paymentService.refundPayment(paymentId);
        return ResponseEntity.ok(response);
    }

    /**
     * Health check endpoint.
     */
    @GetMapping("/health")
    @Operation(summary = "Health check", description = "Service health status")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "svc-payments",
            "version", "1.0.0"
        ));
    }
}
