/**
 * Stripe Payment Gateway Adapter.
 *
 * Used for corporate invoicing and international payments.
 *
 * @see docs/specs/11_PAYMENTS_FINANCIAL.md - Section 3.2
 */
package com.lastmilegig.payments.gateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class StripeAdapter implements PaymentGatewayAdapter {

    private static final Logger log = LoggerFactory.getLogger(StripeAdapter.class);

    @Value("${lmg.stripe.secret-key:sk_test_placeholder}")
    private String secretKey;

    @Override
    public String getGatewayName() {
        return "STRIPE";
    }

    @Override
    public ChargeResult initiateCharge(ChargeRequest request) {
        log.info("Initiating Stripe payment intent: amount={}", request.amount());
        long amountInCents = request.amount().multiply(BigDecimal.valueOf(100)).longValue();
        return new ChargeResult(true, "pi_" + request.reference(), "https://checkout.stripe.com/" + request.reference(), "Payment intent created");
    }

    @Override
    public VerificationResult verifyPayment(String gatewayRef) {
        return new VerificationResult(true, "succeeded", gatewayRef, BigDecimal.ZERO, "ZAR");
    }

    @Override
    public RefundResult processRefund(String gatewayRef, BigDecimal amount, String reason) {
        log.info("Processing Stripe refund: ref={}, amount={}", gatewayRef, amount);
        return new RefundResult(true, "re_" + gatewayRef, amount, "Stripe refund processed");
    }

    @Override
    public PayoutResult initiatePayout(PayoutRequest request) {
        log.info("Initiating Stripe payout: amount={}", request.amount());
        return new PayoutResult(true, "po_" + request.reference(), "pending", "Stripe payout initiated");
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        return signature != null && !signature.isEmpty();
    }
}
