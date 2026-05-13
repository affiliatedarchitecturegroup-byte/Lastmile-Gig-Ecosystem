/**
 * Payment Service - Core business logic for payment processing.
 *
 * Handles payment initiation, verification, refunds, driver payouts,
 * and reconciliation across all supported gateways.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.12
 * @see docs/specs/11_PAYMENTS_FINANCIAL.md
 */
package com.lastmilegig.payments.service;

import com.lastmilegig.payments.gateway.PaymentGatewayAdapter;
import com.lastmilegig.payments.model.*;
import com.lastmilegig.payments.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    /** Platform commission rate (15%) */
    private static final BigDecimal COMMISSION_RATE = new BigDecimal("0.15");

    /** Driver share after commission (85%) */
    private static final BigDecimal DRIVER_SHARE = BigDecimal.ONE.subtract(COMMISSION_RATE);

    private final PaymentRepository paymentRepository;
    private final GatewaySelectionService gatewaySelection;

    public PaymentService(PaymentRepository paymentRepository, GatewaySelectionService gatewaySelection) {
        this.paymentRepository = paymentRepository;
        this.gatewaySelection = gatewaySelection;
    }

    /**
     * Initiate a customer payment for an order.
     */
    @Transactional
    public Payment initiatePayment(UUID orderId, UUID customerId, UUID partnerId,
                                    BigDecimal amount, String currency, String email) {
        log.info("Initiating payment: orderId={}, amount={} {}", orderId, amount, currency);

        PaymentGateway gateway = gatewaySelection.selectGateway(
            PayoutType.CUSTOMER_CHARGE, currency, amount
        );

        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setCustomerId(customerId);
        payment.setPartnerId(partnerId);
        payment.setAmount(amount);
        payment.setCurrency(currency);
        payment.setGateway(gateway);
        payment.setPayoutType(PayoutType.CUSTOMER_CHARGE);
        payment.setStatus(PaymentStatus.PROCESSING);

        BigDecimal commission = amount.multiply(COMMISSION_RATE).setScale(2, RoundingMode.HALF_UP);
        payment.setCommissionRate(COMMISSION_RATE);
        payment.setCommissionAmount(commission);
        payment.setPartnerSettlementAmount(amount.subtract(commission));

        Payment saved = paymentRepository.save(payment);

        // Initiate charge via gateway
        PaymentGatewayAdapter adapter = gatewaySelection.getAdapter(gateway);
        PaymentGatewayAdapter.ChargeResult result = adapter.initiateCharge(
            new PaymentGatewayAdapter.ChargeRequest(
                amount, currency, email, saved.getId().toString(), "", java.util.Map.of()
            )
        );

        if (result.success()) {
            saved.setGatewayRef(result.gatewayRef());
            paymentRepository.save(saved);
        } else {
            saved.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(saved);
        }

        log.info("Payment initiated: id={}, gateway={}, ref={}", saved.getId(), gateway, result.gatewayRef());
        return saved;
    }

    /**
     * Process driver payout after delivery confirmation.
     * Deducts platform commission and pays the driver's share.
     */
    @Transactional
    public Payment processDriverPayout(UUID orderId, UUID driverId, BigDecimal orderAmount) {
        log.info("Processing driver payout: orderId={}, driverId={}, orderAmount={}", orderId, driverId, orderAmount);

        BigDecimal commission = orderAmount.multiply(COMMISSION_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal driverAmount = orderAmount.multiply(DRIVER_SHARE).setScale(2, RoundingMode.HALF_UP);

        Payment payout = new Payment();
        payout.setOrderId(orderId);
        payout.setDriverId(driverId);
        payout.setAmount(driverAmount);
        payout.setCurrency("ZAR");
        payout.setGateway(PaymentGateway.OZOW);
        payout.setPayoutType(PayoutType.DRIVER_PAYOUT);
        payout.setStatus(PaymentStatus.PROCESSING);
        payout.setCommissionRate(COMMISSION_RATE);
        payout.setCommissionAmount(commission);
        payout.setDriverPayoutAmount(driverAmount);

        Payment saved = paymentRepository.save(payout);

        // Initiate Ozow instant EFT payout
        PaymentGatewayAdapter adapter = gatewaySelection.getAdapter(PaymentGateway.OZOW);
        PaymentGatewayAdapter.PayoutResult result = adapter.initiatePayout(
            new PaymentGatewayAdapter.PayoutRequest(
                driverAmount, "ZAR", "", "", "", saved.getId().toString(), "Driver payout for order " + orderId
            )
        );

        if (result.success()) {
            saved.setGatewayRef(result.payoutRef());
            saved.setStatus(PaymentStatus.COMPLETED);
        } else {
            saved.setStatus(PaymentStatus.FAILED);
        }

        paymentRepository.save(saved);
        log.info("Driver payout processed: id={}, amount=R{}", saved.getId(), driverAmount);
        return saved;
    }

    /**
     * Process a refund for a payment.
     */
    @Transactional
    public Payment processRefund(UUID paymentId, BigDecimal refundAmount, String reason) {
        Payment original = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));

        log.info("Processing refund: paymentId={}, amount={}", paymentId, refundAmount);

        PaymentGatewayAdapter adapter = gatewaySelection.getAdapter(original.getGateway());
        PaymentGatewayAdapter.RefundResult result = adapter.processRefund(
            original.getGatewayRef(), refundAmount, reason
        );

        if (result.success()) {
            original.setRefundAmount(refundAmount);
            original.setRefundReason(reason);
            original.setStatus(
                refundAmount.compareTo(original.getAmount()) >= 0
                    ? PaymentStatus.REFUNDED
                    : PaymentStatus.PARTIALLY_REFUNDED
            );
            paymentRepository.save(original);
        }

        return original;
    }

    /**
     * Find a payment by ID.
     */
    public Payment findById(UUID paymentId) {
        return paymentRepository.findById(paymentId)
            .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));
    }
}
