/**
 * Gateway Selection Service - Context-based payment gateway routing.
 *
 * Routes payment requests to the appropriate gateway based on:
 * - Payment type (customer charge, driver payout, corporate invoice)
 * - Currency and country
 * - Amount thresholds
 *
 * @see docs/specs/11_PAYMENTS_FINANCIAL.md - Gateway Selection Logic
 */
package com.lastmilegig.payments.service;

import com.lastmilegig.payments.gateway.PaymentGatewayAdapter;
import com.lastmilegig.payments.model.PaymentGateway;
import com.lastmilegig.payments.model.PayoutType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class GatewaySelectionService {

    private static final Logger log = LoggerFactory.getLogger(GatewaySelectionService.class);
    private static final BigDecimal ENTERPRISE_THRESHOLD = new BigDecimal("10000.00");

    private final Map<String, PaymentGatewayAdapter> adapterMap;

    public GatewaySelectionService(List<PaymentGatewayAdapter> adapters) {
        this.adapterMap = adapters.stream()
            .collect(Collectors.toMap(PaymentGatewayAdapter::getGatewayName, Function.identity()));
        log.info("Initialised {} payment gateway adapters: {}", adapterMap.size(), adapterMap.keySet());
    }

    /**
     * Select the optimal gateway for a payment based on context.
     */
    public PaymentGateway selectGateway(PayoutType payoutType, String currency, BigDecimal amount) {
        PaymentGateway selected = switch (payoutType) {
            case CUSTOMER_CHARGE -> selectCustomerGateway(currency, amount);
            case DRIVER_PAYOUT -> PaymentGateway.OZOW;
            case PARTNER_SETTLEMENT -> selectPartnerGateway(amount);
            case REFUND -> PaymentGateway.PAYSTACK;
            case SLA_SETTLEMENT -> PaymentGateway.POLYGON_CDK;
        };

        log.info("Selected gateway {} for payoutType={}, currency={}, amount={}",
            selected, payoutType, currency, amount);
        return selected;
    }

    /**
     * Get the adapter for a specific gateway.
     */
    public PaymentGatewayAdapter getAdapter(PaymentGateway gateway) {
        PaymentGatewayAdapter adapter = adapterMap.get(gateway.name());
        if (adapter == null) {
            throw new IllegalArgumentException("No adapter found for gateway: " + gateway);
        }
        return adapter;
    }

    private PaymentGateway selectCustomerGateway(String currency, BigDecimal amount) {
        if ("ZAR".equals(currency)) {
            return PaymentGateway.PAYSTACK;
        }
        // Multi-currency support via Flutterwave
        return PaymentGateway.FLUTTERWAVE;
    }

    private PaymentGateway selectPartnerGateway(BigDecimal amount) {
        if (amount.compareTo(ENTERPRISE_THRESHOLD) > 0) {
            return PaymentGateway.PEACH;
        }
        return PaymentGateway.STRIPE;
    }
}
