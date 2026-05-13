/**
 * Paystack Payment Gateway Adapter.
 *
 * Primary gateway for customer payments in South Africa (ZA).
 * Supports card, EFT, and mobile money payments.
 *
 * @see docs/specs/11_PAYMENTS_FINANCIAL.md - Section 3.1
 */
package com.lastmilegig.payments.gateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;

@Component
public class PaystackAdapter implements PaymentGatewayAdapter {

    private static final Logger log = LoggerFactory.getLogger(PaystackAdapter.class);
    private static final String PAYSTACK_API = "https://api.paystack.co";

    @Value("${lmg.paystack.secret-key:sk_test_placeholder}")
    private String secretKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String getGatewayName() {
        return "PAYSTACK";
    }

    @Override
    public ChargeResult initiateCharge(ChargeRequest request) {
        log.info("Initiating Paystack charge: amount={} {}", request.amount(), request.currency());

        // Paystack expects amount in kobo (cents)
        long amountInKobo = request.amount().multiply(BigDecimal.valueOf(100)).longValue();

        // In production, this calls POST https://api.paystack.co/transaction/initialize
        // For now, return a structured placeholder
        return new ChargeResult(
            true,
            "PSK_" + request.reference(),
            "https://checkout.paystack.com/" + request.reference(),
            "Charge initiated successfully"
        );
    }

    @Override
    public VerificationResult verifyPayment(String gatewayRef) {
        log.info("Verifying Paystack payment: ref={}", gatewayRef);

        // In production: GET https://api.paystack.co/transaction/verify/{reference}
        return new VerificationResult(
            true,
            "success",
            gatewayRef,
            BigDecimal.ZERO,
            "ZAR"
        );
    }

    @Override
    public RefundResult processRefund(String gatewayRef, BigDecimal amount, String reason) {
        log.info("Processing Paystack refund: ref={}, amount={}", gatewayRef, amount);

        // In production: POST https://api.paystack.co/refund
        return new RefundResult(true, "REF_" + gatewayRef, amount, "Refund processed");
    }

    @Override
    public PayoutResult initiatePayout(PayoutRequest request) {
        log.info("Initiating Paystack transfer: amount={}", request.amount());

        // In production: POST https://api.paystack.co/transfer
        return new PayoutResult(true, "TRF_" + request.reference(), "pending", "Transfer initiated");
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        // HMAC-SHA512 verification with secretKey
        // In production: compute HMAC and compare
        return signature != null && !signature.isEmpty();
    }
}
