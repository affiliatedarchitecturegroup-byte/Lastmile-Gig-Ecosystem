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
import java.util.HexFormat;
import java.util.Map;

/**
 * Stripe payment gateway integration.
 *
 * <p>Stripe handles international payments, invoice processing, and
 * multi-currency transactions. Uses Payment Intents API for SCA compliance.</p>
 *
 * <p>API Reference: <a href="https://stripe.com/docs/api">Stripe API Docs</a></p>
 *
 * @since 1.0.0
 */
@Component
public class StripeGateway implements PaymentGatewayAdapter {

    private static final Logger log = LoggerFactory.getLogger(StripeGateway.class);
    private static final String STRIPE_API_BASE = "https://api.stripe.com/v1";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String secretKey;
    private final String webhookSecret;

    public StripeGateway(
            RestTemplate restTemplate,
            ObjectMapper objectMapper,
            @Value("${lmg.stripe.secret-key:}") String secretKey,
            @Value("${lmg.stripe.webhook-secret:}") String webhookSecret) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.secretKey = secretKey;
        this.webhookSecret = webhookSecret;
    }

    @Override
    public PaymentGateway getGatewayType() {
        return PaymentGateway.STRIPE;
    }

    @Override
    public boolean supports(String currency) {
        return PaymentGateway.STRIPE.supportsCurrency(currency);
    }

    /**
     * Create a Stripe Payment Intent.
     *
     * <p>Creates a Payment Intent and returns the client secret for
     * frontend SDK confirmation. Supports 3D Secure / SCA flows.</p>
     */
    @Override
    public PaymentEntity initiateCharge(PaymentRequest request, PaymentEntity entity) {
        log.info("Initiating Stripe Payment Intent for order {}", request.orderId());

        HttpHeaders headers = createHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String body = String.format(
            "amount=%d&currency=%s&receipt_email=%s&metadata[order_id]=%s" +
            "&metadata[customer_id]=%s&metadata[partner_id]=%s&metadata[platform]=lastmile_gig",
            request.amountInCents(),
            request.currency().toLowerCase(),
            request.customerEmail(),
            request.orderId(),
            request.customerId(),
            request.partnerId()
        );

        try {
            HttpEntity<String> httpEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                STRIPE_API_BASE + "/payment_intents",
                HttpMethod.POST,
                httpEntity,
                String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());
            String intentId = responseBody.path("id").asText();
            String clientSecret = responseBody.path("client_secret").asText();

            entity.setGatewayReference(intentId);
            entity.setAccessCode(clientSecret);
            entity.setStatus(PaymentStatus.PROCESSING);
            entity.setGatewayResponse(response.getBody());

            log.info("Stripe Payment Intent created for order {}: {}",
                request.orderId(), intentId);
        } catch (Exception e) {
            entity.setStatus(PaymentStatus.FAILED);
            entity.setFailureReason("Stripe API error: " + e.getMessage());
            log.error("Stripe Payment Intent creation failed for order {}",
                request.orderId(), e);
        }

        return entity;
    }

    @Override
    public boolean verifyTransaction(String gatewayReference) {
        log.info("Verifying Stripe Payment Intent: {}", gatewayReference);

        HttpHeaders headers = createHeaders();
        HttpEntity<Void> httpEntity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                STRIPE_API_BASE + "/payment_intents/" + gatewayReference,
                HttpMethod.GET,
                httpEntity,
                String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());
            String status = responseBody.path("status").asText();
            boolean success = "succeeded".equals(status);

            log.info("Stripe verification for {}: status={}", gatewayReference, status);
            return success;
        } catch (Exception e) {
            log.error("Stripe verification failed for {}", gatewayReference, e);
            return false;
        }
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        try {
            // Stripe uses timestamp-based HMAC-SHA256
            String[] parts = signature.split(",");
            String timestamp = "";
            String sig = "";
            for (String part : parts) {
                if (part.startsWith("t=")) timestamp = part.substring(2);
                if (part.startsWith("v1=")) sig = part.substring(3);
            }

            String signedPayload = timestamp + "." + payload;
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(
                webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"
            );
            mac.init(keySpec);
            byte[] hash = mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8));
            String computed = HexFormat.of().formatHex(hash);

            return computed.equals(sig);
        } catch (Exception e) {
            log.error("Stripe webhook signature verification failed", e);
            return false;
        }
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(secretKey, "");
        return headers;
    }
}
