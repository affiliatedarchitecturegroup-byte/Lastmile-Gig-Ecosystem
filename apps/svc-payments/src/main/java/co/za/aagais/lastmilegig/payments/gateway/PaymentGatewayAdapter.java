package co.za.aagais.lastmilegig.payments.gateway;

import co.za.aagais.lastmilegig.payments.model.PaymentEntity;
import co.za.aagais.lastmilegig.payments.model.PaymentGateway;
import co.za.aagais.lastmilegig.payments.model.PaymentRequest;

/**
 * Common interface for all payment gateway adapters.
 *
 * <p>Each gateway implementation (Paystack, Stripe, Ozow, etc.) must
 * implement this interface. The {@link co.za.aagais.lastmilegig.payments.service.GatewayRouter}
 * selects the appropriate adapter based on context.</p>
 *
 * @since 1.0.0
 */
public interface PaymentGatewayAdapter {

    /**
     * Get the gateway type this adapter handles.
     */
    PaymentGateway getGatewayType();

    /**
     * Check if this gateway supports the given currency.
     */
    boolean supports(String currency);

    /**
     * Initiate a payment charge through this gateway.
     *
     * @param request Payment request with amount, customer, and order details
     * @param entity Pre-created payment entity to populate with gateway response
     * @return Updated payment entity
     */
    PaymentEntity initiateCharge(PaymentRequest request, PaymentEntity entity);

    /**
     * Verify a transaction status with the gateway.
     *
     * @param gatewayReference Gateway-specific transaction reference
     * @return true if the transaction was completed successfully
     */
    boolean verifyTransaction(String gatewayReference);

    /**
     * Verify webhook signature from the gateway.
     *
     * @param payload Raw webhook body
     * @param signature Signature from webhook headers
     * @return true if the signature is valid
     */
    boolean verifyWebhookSignature(String payload, String signature);
}
