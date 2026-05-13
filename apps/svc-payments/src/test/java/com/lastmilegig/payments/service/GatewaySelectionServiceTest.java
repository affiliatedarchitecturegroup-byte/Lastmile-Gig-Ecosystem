/**
 * Gateway Selection Service - Unit Tests.
 *
 * Tests context-based gateway routing logic.
 */
package com.lastmilegig.payments.service;

import com.lastmilegig.payments.gateway.*;
import com.lastmilegig.payments.model.PaymentGateway;
import com.lastmilegig.payments.model.PayoutType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GatewaySelectionServiceTest {

    private GatewaySelectionService service;

    @BeforeEach
    void setUp() {
        List<PaymentGatewayAdapter> adapters = List.of(
            new PaystackAdapter(),
            new OzowAdapter(),
            new StripeAdapter()
        );
        service = new GatewaySelectionService(adapters);
    }

    @Test
    @DisplayName("Customer ZAR charge routes to Paystack")
    void customerCharge_ZAR_paystack() {
        PaymentGateway result = service.selectGateway(
            PayoutType.CUSTOMER_CHARGE, "ZAR", new BigDecimal("100.00")
        );
        assertEquals(PaymentGateway.PAYSTACK, result);
    }

    @Test
    @DisplayName("Driver payout always routes to Ozow")
    void driverPayout_ozow() {
        PaymentGateway result = service.selectGateway(
            PayoutType.DRIVER_PAYOUT, "ZAR", new BigDecimal("85.00")
        );
        assertEquals(PaymentGateway.OZOW, result);
    }

    @Test
    @DisplayName("SLA settlement routes to Polygon CDK")
    void slaSettlement_polygon() {
        PaymentGateway result = service.selectGateway(
            PayoutType.SLA_SETTLEMENT, "ZAR", new BigDecimal("5000.00")
        );
        assertEquals(PaymentGateway.POLYGON_CDK, result);
    }

    @Test
    @DisplayName("High-value partner settlement routes to Peach")
    void partnerSettlement_highValue_peach() {
        PaymentGateway result = service.selectGateway(
            PayoutType.PARTNER_SETTLEMENT, "ZAR", new BigDecimal("15000.00")
        );
        assertEquals(PaymentGateway.PEACH, result);
    }

    @Test
    @DisplayName("Low-value partner settlement routes to Stripe")
    void partnerSettlement_lowValue_stripe() {
        PaymentGateway result = service.selectGateway(
            PayoutType.PARTNER_SETTLEMENT, "ZAR", new BigDecimal("5000.00")
        );
        assertEquals(PaymentGateway.STRIPE, result);
    }

    @Test
    @DisplayName("Non-ZAR customer charge routes to Flutterwave")
    void customerCharge_USD_flutterwave() {
        PaymentGateway result = service.selectGateway(
            PayoutType.CUSTOMER_CHARGE, "USD", new BigDecimal("50.00")
        );
        assertEquals(PaymentGateway.FLUTTERWAVE, result);
    }
}
