package co.za.aagais.lastmilegig.payments.gateway;

import co.za.aagais.lastmilegig.payments.model.PaymentEntity;
import co.za.aagais.lastmilegig.payments.model.PaymentGateway;
import co.za.aagais.lastmilegig.payments.model.PaymentRequest;
import co.za.aagais.lastmilegig.payments.model.PaymentStatus;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;

/**
 * Paystack payment gateway integration.
 *
 * <p>Paystack is the primary ZAR payment gateway for customer charges
 * in South Africa. Supports card payments, EFT, and mobile money.</p>
 *
 * <p>API Reference: <a href="https://paystack.com/docs/api">Paystack API Docs</a></p>
 *
 * @since 1.0.0
 */
@Component
public class PaystackGateway implements PaymentGatewayAdapter {

    private static final Logger log = LoggerFactory.getLogger(PaystackGateway.class);
    private static final String PAYSTACK_API_BASE = "https://api.paystack.co";
    private static final String HMAC_ALGORITHM = "HmacSHA512";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String secretKey;

    public PaystackGateway(
            RestTemplate restTemplate,
            ObjectMapper objectMapper,
            @Value("${lmg.paystack.secret-key:}") String secretKey) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.secretKey = secretKey;
    }

    @Override
    public PaymentGateway getGatewayType() {
        return PaymentGateway.PAYSTACK;
    }

    @Override
    public boolean supports(String currency) {
        return "ZAR".equals(currency);
    }

    /**
     * Initialize a Paystack transaction.
     *
     * <p>Creates a transaction on Paystack and returns an authorization URL
     * that the customer should be redirected to for payment.</p>
     *
     * @param request Payment request details
     * @param entity Payment entity to update with gateway response
     * @return Updated payment entity with authorization URL and access code
     */
    @Override
    public PaymentEntity initiateCharge(PaymentRequest request, PaymentEntity entity) {
        log.info("Initiating Paystack charge for order {}", request.orderId());

        HttpHeaders headers = createHeaders();
        Map<String, Object> body = new HashMap<>();
        body.put("email", request.customerEmail());
        body.put("amount", request.amountInCents());
        body.put("currency", request.currency());
        body.put("reference", entity.getId().toString());
        body.put("callback_url", request.callbackUrl());
        body.put("metadata", Map.of(
            "order_id", request.orderId(),
            "customer_id", request.customerId(),
            "partner_id", request.partnerId(),
            "platform", "lastmile_gig"
        ));

        try {
            HttpEntity<Map<String, Object>> httpEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                PAYSTACK_API_BASE + "/transaction/initialize",
                HttpMethod.POST,
                httpEntity,
                String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());

            if (responseBody.path("status").asBoolean()) {
                JsonNode data = responseBody.path("data");
                entity.setAuthorizationUrl(data.path("authorization_url").asText());
                entity.setAccessCode(data.path("access_code").asText());
                entity.setGatewayReference(data.path("reference").asText());
                entity.setStatus(PaymentStatus.PROCESSING);
                entity.setGatewayResponse(response.getBody());

                log.info("Paystack charge initialized for order {}: ref={}",
                    request.orderId(), entity.getGatewayReference());
            } else {
                String message = responseBody.path("message").asText("Unknown error");
                entity.setStatus(PaymentStatus.FAILED);
                entity.setFailureReason("Paystack initialization failed: " + message);
                log.error("Paystack initialization failed for order {}: {}",
                    request.orderId(), message);
            }
        } catch (Exception e) {
            entity.setStatus(PaymentStatus.FAILED);
            entity.setFailureReason("Paystack API error: " + e.getMessage());
            log.error("Paystack API call failed for order {}", request.orderId(), e);
        }

        return entity;
    }

    /**
     * Verify a Paystack transaction status.
     *
     * @param gatewayReference Paystack transaction reference
     * @return true if the transaction was successful
     */
    @Override
    public boolean verifyTransaction(String gatewayReference) {
        log.info("Verifying Paystack transaction: {}", gatewayReference);

        HttpHeaders headers = createHeaders();
        HttpEntity<Void> httpEntity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                PAYSTACK_API_BASE + "/transaction/verify/" + gatewayReference,
                HttpMethod.GET,
                httpEntity,
                String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());
            boolean success = responseBody.path("status").asBoolean()
                && "success".equals(responseBody.path("data").path("status").asText());

            log.info("Paystack verification for {}: success={}", gatewayReference, success);
            return success;
        } catch (Exception e) {
            log.error("Paystack verification failed for {}", gatewayReference, e);
            return false;
        }
    }

    /**
     * Verify Paystack webhook signature using HMAC-SHA512.
     *
     * @param payload Raw webhook body
     * @param signature Value from x-paystack-signature header
     * @return true if the signature is valid
     */
    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(
                secretKey.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM
            );
            mac.init(keySpec);
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String computedSignature = HexFormat.of().formatHex(hash);

            return computedSignature.equals(signature);
        } catch (Exception e) {
            log.error("Paystack webhook signature verification failed", e);
            return false;
        }
    }

    /**
     * Create HTTP headers with Paystack authorization.
     */
    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(secretKey);
        return headers;
    }
}
