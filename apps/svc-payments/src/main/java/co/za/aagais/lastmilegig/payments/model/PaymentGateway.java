package co.za.aagais.lastmilegig.payments.model;

/**
 * Supported payment gateways in the Lastmile Gig ecosystem.
 *
 * <p>Each gateway serves a specific purpose:
 * <ul>
 *   <li>PAYSTACK - Primary ZAR payment gateway for customer charges</li>
 *   <li>STRIPE - International payments and invoice processing</li>
 *   <li>OZOW - Instant EFT for driver payouts (South Africa)</li>
 *   <li>PEACH_PAYMENTS - High-value enterprise payment processing</li>
 *   <li>FLUTTERWAVE - Pan-African multi-currency support</li>
 * </ul>
 *
 * @since 1.0.0
 */
public enum PaymentGateway {
    PAYSTACK("paystack", "ZAR", true),
    STRIPE("stripe", "USD,EUR,GBP,ZAR", true),
    OZOW("ozow", "ZAR", true),
    PEACH_PAYMENTS("peach", "ZAR", true),
    FLUTTERWAVE("flutterwave", "NGN,KES,GHS,ZAR,USD", false);

    private final String code;
    private final String supportedCurrencies;
    private final boolean activeInSouthAfrica;

    PaymentGateway(String code, String supportedCurrencies, boolean activeInSouthAfrica) {
        this.code = code;
        this.supportedCurrencies = supportedCurrencies;
        this.activeInSouthAfrica = activeInSouthAfrica;
    }

    public String getCode() {
        return code;
    }

    public String getSupportedCurrencies() {
        return supportedCurrencies;
    }

    public boolean isActiveInSouthAfrica() {
        return activeInSouthAfrica;
    }

    /**
     * Check if this gateway supports the given currency.
     */
    public boolean supportsCurrency(String currency) {
        return supportedCurrencies.contains(currency);
    }
}
