package co.za.aagais.lastmilegig.payments.service;

import co.za.aagais.lastmilegig.payments.gateway.PaymentGatewayAdapter;
import co.za.aagais.lastmilegig.payments.model.PaymentGateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Gateway selection router.
 *
 * <p>Selects the optimal payment gateway based on:
 * <ul>
 *   <li>Preferred gateway (if specified by the caller)</li>
 *   <li>Currency support</li>
 *   <li>Transaction amount thresholds</li>
 *   <li>Gateway availability</li>
 * </ul>
 *
 * <p>Default routing rules:
 * <ul>
 *   <li>ZAR transactions under R50,000: Paystack</li>
 *   <li>ZAR transactions R50,000+: Peach Payments</li>
 *   <li>NGN/KES/GHS transactions: Flutterwave</li>
 *   <li>USD/EUR/GBP transactions: Stripe</li>
 *   <li>Driver payouts (ZAR): Ozow</li>
 * </ul>
 *
 * @since 1.0.0
 */
@Service
public class GatewayRouter {

    private static final Logger log = LoggerFactory.getLogger(GatewayRouter.class);

    /** Threshold for high-value ZAR transactions (R50,000) */
    private static final BigDecimal HIGH_VALUE_THRESHOLD = new BigDecimal("50000.00");

    private final Map<PaymentGateway, PaymentGatewayAdapter> adapters;

    public GatewayRouter(List<PaymentGatewayAdapter> adapterList) {
        this.adapters = adapterList.stream()
            .collect(Collectors.toMap(
                PaymentGatewayAdapter::getGatewayType,
                adapter -> adapter
            ));
        log.info("Gateway router initialized with {} adapters: {}",
            adapters.size(), adapters.keySet());
    }

    /**
     * Select the optimal gateway for a payment.
     *
     * @param preferred Preferred gateway (may be null)
     * @param currency ISO 4217 currency code
     * @param amount Transaction amount
     * @return Selected payment gateway
     */
    public PaymentGateway selectGateway(
            PaymentGateway preferred, String currency, BigDecimal amount) {

        // If preferred gateway is specified and supports the currency, use it
        if (preferred != null && preferred.supportsCurrency(currency)
                && adapters.containsKey(preferred)) {
            log.debug("Using preferred gateway: {}", preferred);
            return preferred;
        }

        // Auto-select based on currency and amount
        PaymentGateway selected = autoSelectGateway(currency, amount);
        log.info("Auto-selected gateway {} for {} {} payment",
            selected, amount, currency);
        return selected;
    }

    /**
     * Get the adapter for a specific gateway.
     */
    public PaymentGatewayAdapter getAdapter(PaymentGateway gateway) {
        PaymentGatewayAdapter adapter = adapters.get(gateway);
        if (adapter == null) {
            throw new IllegalStateException(
                "No adapter registered for gateway: " + gateway);
        }
        return adapter;
    }

    /**
     * Auto-select gateway based on business rules.
     */
    private PaymentGateway autoSelectGateway(String currency, BigDecimal amount) {
        return switch (currency) {
            case "ZAR" -> {
                if (amount.compareTo(HIGH_VALUE_THRESHOLD) >= 0
                        && adapters.containsKey(PaymentGateway.PEACH_PAYMENTS)) {
                    yield PaymentGateway.PEACH_PAYMENTS;
                }
                yield PaymentGateway.PAYSTACK;
            }
            case "NGN", "KES", "GHS" -> PaymentGateway.FLUTTERWAVE;
            case "USD", "EUR", "GBP" -> PaymentGateway.STRIPE;
            default -> {
                log.warn("No optimal gateway for currency {}, defaulting to Stripe", currency);
                yield PaymentGateway.STRIPE;
            }
        };
    }
}
