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

import java.util.HashMap;
import java.util.Map;

/**
 * Flutterwave payment gateway integration.
 *
 * <p>Flutterwave provides pan-African multi-currency payment support.
 * Primary gateway for expansion markets: Nigeria (NGN), Kenya (KES),
 * Ghana (GHS), and cross-border ZAR transactions.</p>
 *
 * <p>API Reference: <a href="https://developer.flutterwave.com">Flutterwave Dev Docs</a></p>
 *
 * @since 1.0.0
 */
@Component
public class FlutterwaveGateway implements PaymentGatewayAdapter {

    private static final Logger log = LoggerFactory.getLogger(FlutterwaveGateway.class);
    private static final String FLUTTERWAVE_API_BASE = "https://api.flutterwave.com/v3";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String secretKey;
    private final String webhookSecret;

    public FlutterwaveGateway(
            RestTemplate restTemplate,
            ObjectMapper objectMapper,
            @Value("${lmg.flutterwave.secret-key:}") String secretKey,
            @Value("${lmg.flutterwave.webhook-secret:}") String webhookSecret) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.secretKey = secretKey;
        this.webhookSecret = webhookSecret;
    }

    @Override
    public PaymentGateway getGatewayType() {
        return PaymentGateway.FLUTTERWAVE;
    }

    @Override
    public boolean supports(String currency) {
        return PaymentGateway.FLUTTERWAVE.supportsCurrency(currency);
    }

    /**
     * Initialize a Flutterwave Standard payment.
     *
     * <p>Creates a payment link and returns a redirect URL for the
     * customer. Supports cards, bank transfers, mobile money, and USSD.</p>
     */
    @Override
    public PaymentEntity initiateCharge(PaymentRequest request, PaymentEntity entity) {
        log.info("Initiating Flutterwave payment for order {} ({} {})",
            request.orderId(), request.amount(), request.currency());

        HttpHeaders headers = createHeaders();

        Map<String, Object> body = new HashMap<>();
        body.put("tx_ref", entity.getId().toString());
        body.put("amount", request.amount().toPlainString());
        body.put("currency", request.currency());
        body.put("redirect_url", request.callbackUrl());
        body.put("payment_options", "card,banktransfer,mobilemoney");
        body.put("customer", Map.of(
            "email", request.customerEmail(),
            "name", request.customerName() != null ? request.customerName() : ""
        ));
        body.put("customizations", Map.of(
            "title", "Lastmile Gig",
            "description", "Order " + request.orderId()
        ));
        body.put("meta", Map.of(
            "order_id", request.orderId(),
            "customer_id", request.customerId(),
            "partner_id", request.partnerId(),
            "platform", "lastmile_gig"
        ));

        try {
            HttpEntity<Map<String, Object>> httpEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                FLUTTERWAVE_API_BASE + "/payments",
                HttpMethod.POST,
                httpEntity,
                String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());

            if ("success".equals(responseBody.path("status").asText())) {
                JsonNode data = responseBody.path("data");
                String paymentLink = data.path("link").asText();

                entity.setAuthorizationUrl(paymentLink);
                entity.setGatewayReference(entity.getId().toString());
                entity.setStatus(PaymentStatus.PROCESSING);
                entity.setGatewayResponse(response.getBody());

                log.info("Flutterwave payment link created for order {}",
                    request.orderId());
            } else {
                String message = responseBody.path("message").asText("Unknown error");
                entity.setStatus(PaymentStatus.FAILED);
                entity.setFailureReason("Flutterwave error: " + message);
                log.error("Flutterwave payment failed for order {}: {}",
                    request.orderId(), message);
            }
        } catch (Exception e) {
            entity.setStatus(PaymentStatus.FAILED);
            entity.setFailureReason("Flutterwave API error: " + e.getMessage());
            log.error("Flutterwave payment failed for order {}", request.orderId(), e);
        }

        return entity;
    }

    @Override
    public boolean verifyTransaction(String gatewayReference) {
        log.info("Verifying Flutterwave transaction: {}", gatewayReference);

        HttpHeaders headers = createHeaders();
        HttpEntity<Void> httpEntity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                FLUTTERWAVE_API_BASE + "/transactions/" + gatewayReference + "/verify",
                HttpMethod.GET,
                httpEntity,
                String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());
            boolean success = "success".equals(responseBody.path("status").asText())
                && "successful".equals(
                    responseBody.path("data").path("status").asText());

            log.info("Flutterwave verification for {}: success={}", gatewayReference, success);
            return success;
        } catch (Exception e) {
            log.error("Flutterwave verification failed for {}", gatewayReference, e);
            return false;
        }
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        return webhookSecret.equals(signature);
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(secretKey);
        return headers;
    }
}
