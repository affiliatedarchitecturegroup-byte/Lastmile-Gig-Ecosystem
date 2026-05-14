package co.za.aagais.lastmilegig.payments.service;

import co.za.aagais.lastmilegig.payments.gateway.FlutterwaveGateway;
import co.za.aagais.lastmilegig.payments.gateway.OzowGateway;
import co.za.aagais.lastmilegig.payments.gateway.PaymentGatewayAdapter;
import co.za.aagais.lastmilegig.payments.gateway.PaystackGateway;
import co.za.aagais.lastmilegig.payments.gateway.PeachPaymentsGateway;
import co.za.aagais.lastmilegig.payments.gateway.StripeGateway;
import co.za.aagais.lastmilegig.payments.model.PaymentGateway;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Unit tests for GatewayRouter.
 * @phase P219 - Payment Service Unit Tests
 */
class GatewayRouterTest {

    private GatewayRouter gatewayRouter;

    @BeforeEach
    void setUp() {
        RestTemplate restTemplate = new RestTemplate();
        ObjectMapper objectMapper = new ObjectMapper();

        List<PaymentGatewayAdapter> adapters = List.of(
            new PaystackGateway(restTemplate, objectMapper, "test-key"),
            new StripeGateway(restTemplate, objectMapper, "test-key", "test-wh"),
            new OzowGateway(restTemplate, objectMapper, "test-key", "test-pk", "test-sc"),
            new PeachPaymentsGateway(restTemplate, objectMapper, "test-key", "test-eid"),
            new FlutterwaveGateway(restTemplate, objectMapper, "test-key", "test-wh")
        );

        gatewayRouter = new GatewayRouter(adapters);
    }

    @Nested
    @DisplayName("ZAR Payments")
    class ZarPayments {

        @Test
        @DisplayName("should select Paystack for standard ZAR payments")
        void selectPaystackForStandardZar() {
            PaymentGateway selected = gatewayRouter.selectGateway(
                null, "ZAR", new BigDecimal("250.00")
            );
            assertEquals(PaymentGateway.PAYSTACK, selected);
        }

        @Test
        @DisplayName("should select Peach Payments for high-value ZAR (R50k+)")
        void selectPeachForHighValueZar() {
            PaymentGateway selected = gatewayRouter.selectGateway(
                null, "ZAR", new BigDecimal("75000.00")
            );
            assertEquals(PaymentGateway.PEACH_PAYMENTS, selected);
        }

        @Test
        @DisplayName("should select Paystack at R49,999 threshold")
        void selectPaystackBelowThreshold() {
            PaymentGateway selected = gatewayRouter.selectGateway(
                null, "ZAR", new BigDecimal("49999.99")
            );
            assertEquals(PaymentGateway.PAYSTACK, selected);
        }

        @Test
        @DisplayName("should select Peach at exactly R50,000")
        void selectPeachAtExactThreshold() {
            PaymentGateway selected = gatewayRouter.selectGateway(
                null, "ZAR", new BigDecimal("50000.00")
            );
            assertEquals(PaymentGateway.PEACH_PAYMENTS, selected);
        }
    }

    @Nested
    @DisplayName("International Payments")
    class InternationalPayments {

        @Test
        @DisplayName("should select Stripe for USD")
        void selectStripeForUsd() {
            PaymentGateway selected = gatewayRouter.selectGateway(
                null, "USD", new BigDecimal("100.00")
            );
            assertEquals(PaymentGateway.STRIPE, selected);
        }

        @Test
        @DisplayName("should select Stripe for EUR")
        void selectStripeForEur() {
            PaymentGateway selected = gatewayRouter.selectGateway(
                null, "EUR", new BigDecimal("100.00")
            );
            assertEquals(PaymentGateway.STRIPE, selected);
        }

        @Test
        @DisplayName("should select Stripe for GBP")
        void selectStripeForGbp() {
            PaymentGateway selected = gatewayRouter.selectGateway(
                null, "GBP", new BigDecimal("100.00")
            );
            assertEquals(PaymentGateway.STRIPE, selected);
        }
    }

    @Nested
    @DisplayName("Pan-African Payments")
    class PanAfricanPayments {

        @Test
        @DisplayName("should select Flutterwave for NGN")
        void selectFlutterwaveForNgn() {
            PaymentGateway selected = gatewayRouter.selectGateway(
                null, "NGN", new BigDecimal("50000.00")
            );
            assertEquals(PaymentGateway.FLUTTERWAVE, selected);
        }

        @Test
        @DisplayName("should select Flutterwave for KES")
        void selectFlutterwaveForKes() {
            PaymentGateway selected = gatewayRouter.selectGateway(
                null, "KES", new BigDecimal("10000.00")
            );
            assertEquals(PaymentGateway.FLUTTERWAVE, selected);
        }

        @Test
        @DisplayName("should select Flutterwave for GHS")
        void selectFlutterwaveForGhs() {
            PaymentGateway selected = gatewayRouter.selectGateway(
                null, "GHS", new BigDecimal("500.00")
            );
            assertEquals(PaymentGateway.FLUTTERWAVE, selected);
        }
    }

    @Nested
    @DisplayName("Preferred Gateway Override")
    class PreferredGateway {

        @Test
        @DisplayName("should use preferred gateway if it supports currency")
        void usePreferredIfSupported() {
            PaymentGateway selected = gatewayRouter.selectGateway(
                PaymentGateway.OZOW, "ZAR", new BigDecimal("200.00")
            );
            assertEquals(PaymentGateway.OZOW, selected);
        }

        @Test
        @DisplayName("should fallback to auto-select if preferred does not support currency")
        void fallbackIfPreferredUnsupported() {
            PaymentGateway selected = gatewayRouter.selectGateway(
                PaymentGateway.PAYSTACK, "USD", new BigDecimal("100.00")
            );
            assertEquals(PaymentGateway.STRIPE, selected);
        }
    }

    @Nested
    @DisplayName("Adapter Lookup")
    class AdapterLookup {

        @Test
        @DisplayName("should return adapter for registered gateway")
        void returnRegisteredAdapter() {
            PaymentGatewayAdapter adapter = gatewayRouter.getAdapter(PaymentGateway.PAYSTACK);
            assertNotNull(adapter);
            assertEquals(PaymentGateway.PAYSTACK, adapter.getGatewayType());
        }
    }
}
