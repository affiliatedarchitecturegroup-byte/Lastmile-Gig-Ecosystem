/**
 * Payment Controller - REST API for payment operations.
 *
 * Endpoints:
 * - POST   /v1/payments/initiate         Initiate a customer payment
 * - POST   /v1/payments/payout/driver    Process driver payout
 * - POST   /v1/payments/refund/:id       Process refund
 * - GET    /v1/payments/:id              Get payment by ID
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.12
 */
package com.lastmilegig.payments.controller;

import com.lastmilegig.payments.model.Payment;
import com.lastmilegig.payments.service.PaymentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/payments")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);
    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * POST /v1/payments/initiate - Initiate a customer payment.
     */
    @PostMapping("/initiate")
    public ResponseEntity<Map<String, Object>> initiatePayment(@Valid @RequestBody InitiateRequest request) {
        log.info("POST /v1/payments/initiate - orderId={}", request.orderId());
        Payment payment = paymentService.initiatePayment(
            request.orderId(), request.customerId(), request.partnerId(),
            request.amount(), request.currency(), request.email()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "success", true,
            "data", payment
        ));
    }

    /**
     * POST /v1/payments/payout/driver - Process instant driver payout.
     */
    @PostMapping("/payout/driver")
    public ResponseEntity<Map<String, Object>> driverPayout(@Valid @RequestBody DriverPayoutRequest request) {
        log.info("POST /v1/payments/payout/driver - orderId={}, driverId={}", request.orderId(), request.driverId());
        Payment payout = paymentService.processDriverPayout(
            request.orderId(), request.driverId(), request.orderAmount()
        );
        return ResponseEntity.ok(Map.of("success", true, "data", payout));
    }

    /**
     * POST /v1/payments/refund/:id - Process a refund.
     */
    @PostMapping("/refund/{id}")
    public ResponseEntity<Map<String, Object>> processRefund(
            @PathVariable UUID id,
            @Valid @RequestBody RefundRequest request) {
        log.info("POST /v1/payments/refund/{} - amount={}", id, request.amount());
        Payment refunded = paymentService.processRefund(id, request.amount(), request.reason());
        return ResponseEntity.ok(Map.of("success", true, "data", refunded));
    }

    /**
     * GET /v1/payments/:id - Get payment details.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getPayment(@PathVariable UUID id) {
        Payment payment = paymentService.findById(id);
        return ResponseEntity.ok(Map.of("success", true, "data", payment));
    }

    // --- Request DTOs ---

    record InitiateRequest(
        @NotNull UUID orderId,
        @NotNull UUID customerId,
        @NotNull UUID partnerId,
        @NotNull BigDecimal amount,
        String currency,
        String email
    ) {
        InitiateRequest {
            if (currency == null) currency = "ZAR";
        }
    }

    record DriverPayoutRequest(
        @NotNull UUID orderId,
        @NotNull UUID driverId,
        @NotNull BigDecimal orderAmount
    ) {}

    record RefundRequest(
        @NotNull BigDecimal amount,
        String reason
    ) {}
}
