/**
 * Payment Service - Unit Tests.
 *
 * Tests payment initiation, driver payouts, refund processing,
 * and gateway selection logic. Coverage target: 85%+.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.12
 */
package com.lastmilegig.payments.service;

import com.lastmilegig.payments.gateway.PaymentGatewayAdapter;
import com.lastmilegig.payments.gateway.PaystackAdapter;
import com.lastmilegig.payments.gateway.OzowAdapter;
import com.lastmilegig.payments.model.*;
import com.lastmilegig.payments.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    private PaymentService paymentService;
    private GatewaySelectionService gatewaySelection;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        List<PaymentGatewayAdapter> adapters = List.of(
            new PaystackAdapter(),
            new OzowAdapter()
        );
        gatewaySelection = new GatewaySelectionService(adapters);
        paymentService = new PaymentService(paymentRepository, gatewaySelection);
    }

    @Test
    @DisplayName("Should initiate customer payment via Paystack for ZAR")
    void initiatePayment_ZAR_usesPaystack() {
        UUID orderId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID partnerId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("150.00");

        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> {
            Payment p = i.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            return p;
        });

        Payment result = paymentService.initiatePayment(
            orderId, customerId, partnerId, amount, "ZAR", "test@example.com"
        );

        assertNotNull(result);
        assertEquals(PaymentGateway.PAYSTACK, result.getGateway());
        assertEquals(PaymentStatus.PROCESSING, result.getStatus());
        assertEquals(amount, result.getAmount());
        verify(paymentRepository, times(2)).save(any(Payment.class));
    }

    @Test
    @DisplayName("Should calculate 15% commission correctly")
    void initiatePayment_calculatesCommission() {
        UUID orderId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("200.00");

        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> {
            Payment p = i.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            return p;
        });

        Payment result = paymentService.initiatePayment(
            orderId, UUID.randomUUID(), UUID.randomUUID(), amount, "ZAR", "test@example.com"
        );

        assertEquals(new BigDecimal("0.15"), result.getCommissionRate());
        assertEquals(new BigDecimal("30.00"), result.getCommissionAmount());
        assertEquals(new BigDecimal("170.00"), result.getPartnerSettlementAmount());
    }

    @Test
    @DisplayName("Should process driver payout via Ozow with correct deductions")
    void processDriverPayout_usesOzow() {
        UUID orderId = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();
        BigDecimal orderAmount = new BigDecimal("100.00");

        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> {
            Payment p = i.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            return p;
        });

        Payment result = paymentService.processDriverPayout(orderId, driverId, orderAmount);

        assertEquals(PaymentGateway.OZOW, result.getGateway());
        assertEquals(PayoutType.DRIVER_PAYOUT, result.getPayoutType());
        assertEquals(new BigDecimal("85.00"), result.getDriverPayoutAmount());
        assertEquals(new BigDecimal("15.00"), result.getCommissionAmount());
    }

    @Test
    @DisplayName("Should process full refund and set status to REFUNDED")
    void processRefund_fullRefund() {
        UUID paymentId = UUID.randomUUID();
        Payment original = new Payment();
        original.setId(paymentId);
        original.setAmount(new BigDecimal("150.00"));
        original.setGateway(PaymentGateway.PAYSTACK);
        original.setGatewayRef("PSK_test123");
        original.setStatus(PaymentStatus.COMPLETED);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(original));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> i.getArgument(0));

        Payment result = paymentService.processRefund(
            paymentId, new BigDecimal("150.00"), "Customer requested"
        );

        assertEquals(PaymentStatus.REFUNDED, result.getStatus());
        assertEquals(new BigDecimal("150.00"), result.getRefundAmount());
        assertEquals("Customer requested", result.getRefundReason());
    }

    @Test
    @DisplayName("Should process partial refund and set status to PARTIALLY_REFUNDED")
    void processRefund_partialRefund() {
        UUID paymentId = UUID.randomUUID();
        Payment original = new Payment();
        original.setId(paymentId);
        original.setAmount(new BigDecimal("150.00"));
        original.setGateway(PaymentGateway.PAYSTACK);
        original.setGatewayRef("PSK_test123");
        original.setStatus(PaymentStatus.COMPLETED);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(original));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> i.getArgument(0));

        Payment result = paymentService.processRefund(
            paymentId, new BigDecimal("50.00"), "Partial refund"
        );

        assertEquals(PaymentStatus.PARTIALLY_REFUNDED, result.getStatus());
        assertEquals(new BigDecimal("50.00"), result.getRefundAmount());
    }

    @Test
    @DisplayName("Should throw when refunding non-existent payment")
    void processRefund_paymentNotFound() {
        UUID paymentId = UUID.randomUUID();
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
            paymentService.processRefund(paymentId, new BigDecimal("50.00"), "test")
        );
    }
}
