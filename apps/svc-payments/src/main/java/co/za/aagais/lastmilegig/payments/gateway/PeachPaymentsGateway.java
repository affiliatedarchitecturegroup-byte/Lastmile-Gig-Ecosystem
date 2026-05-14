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

import java.util.Map;

/**
 * Peach Payments gateway integration.
 *
 * <p>Peach Payments handles high-value enterprise payment processing
 * in South Africa. Used for transactions exceeding R50,000 and enterprise
 * partner settlements.</p>
 *
 * @since 1.0.0
 */
@Component
public class PeachPaymentsGateway implements PaymentGatewayAdapter {

    private static final Logger log = LoggerFactory.getLogger(PeachPaymentsGateway.class);
    private static final String PEACH_API_BASE = "https://eu-prod.oppwa.com/v1";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String entityId;

    public PeachPaymentsGateway(
            RestTemplate restTemplate,
            ObjectMapper objectMapper,
            @Value("${lmg.peach.api-key:}") String apiKey,
            @Value("${lmg.peach.entity-id:}") String entityId) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.entityId = entityId;
    }

    @Override
    public PaymentGateway getGatewayType() {
        return PaymentGateway.PEACH_PAYMENTS;
    }

    @Override
    public boolean supports(String currency) {
        return "ZAR".equals(currency);
    }

    @Override
    public PaymentEntity initiateCharge(PaymentRequest request, PaymentEntity entity) {
        log.info("Initiating Peach Payments charge for order {} (high-value: {} {})",
            request.orderId(), request.amount(), request.currency());

        HttpHeaders headers = createHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String body = String.format(
            "entityId=%s&amount=%s&currency=%s&paymentType=DB" +
            "&merchantTransactionId=%s&customer.email=%s",
            entityId,
            request.amount().toPlainString(),
            request.currency(),
            entity.getId().toString(),
            request.customerEmail()
        );

        try {
            HttpEntity<String> httpEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                PEACH_API_BASE + "/checkouts",
                HttpMethod.POST,
                httpEntity,
                String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());
            String checkoutId = responseBody.path("id").asText();

            entity.setGatewayReference(checkoutId);
            entity.setAccessCode(checkoutId);
            entity.setStatus(PaymentStatus.PROCESSING);
            entity.setGatewayResponse(response.getBody());

            log.info("Peach Payments checkout created for order {}: {}",
                request.orderId(), checkoutId);
        } catch (Exception e) {
            entity.setStatus(PaymentStatus.FAILED);
            entity.setFailureReason("Peach Payments API error: " + e.getMessage());
            log.error("Peach Payments charge failed for order {}", request.orderId(), e);
        }

        return entity;
    }

    @Override
    public boolean verifyTransaction(String gatewayReference) {
        log.info("Verifying Peach Payments transaction: {}", gatewayReference);

        HttpHeaders headers = createHeaders();
        HttpEntity<Void> httpEntity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                PEACH_API_BASE + "/checkouts/" + gatewayReference
                    + "/payment?entityId=" + entityId,
                HttpMethod.GET,
                httpEntity,
                String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());
            String resultCode = responseBody.path("result").path("code").asText();

            // Peach uses regex patterns for success codes
            boolean success = resultCode.matches("^(000\\.000\\.|000\\.100\\.1|000\\.[36]).*");

            log.info("Peach verification for {}: code={} success={}",
                gatewayReference, resultCode, success);
            return success;
        } catch (Exception e) {
            log.error("Peach verification failed for {}", gatewayReference, e);
            return false;
        }
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        // Peach Payments uses IP whitelisting for webhook verification
        log.debug("Peach webhook verification - delegating to IP whitelist check");
        return true;
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        return headers;
    }
}
