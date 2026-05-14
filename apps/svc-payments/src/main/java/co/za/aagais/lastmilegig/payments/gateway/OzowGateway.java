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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;

/**
 * Ozow payment gateway integration.
 *
 * <p>Ozow provides instant EFT payments and is the primary gateway
 * for driver payouts in South Africa. Supports real-time bank transfers
 * with instant confirmation.</p>
 *
 * <p>API Reference: <a href="https://ozow.com/developers">Ozow Developer Docs</a></p>
 *
 * @since 1.0.0
 */
@Component
public class OzowGateway implements PaymentGatewayAdapter {

    private static final Logger log = LoggerFactory.getLogger(OzowGateway.class);
    private static final String OZOW_API_BASE = "https://api.ozow.com";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String privateKey;
    private final String siteCode;

    public OzowGateway(
            RestTemplate restTemplate,
            ObjectMapper objectMapper,
            @Value("${lmg.ozow.api-key:}") String apiKey,
            @Value("${lmg.ozow.private-key:}") String privateKey,
            @Value("${lmg.ozow.site-code:}") String siteCode) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.privateKey = privateKey;
        this.siteCode = siteCode;
    }

    @Override
    public PaymentGateway getGatewayType() {
        return PaymentGateway.OZOW;
    }

    @Override
    public boolean supports(String currency) {
        return "ZAR".equals(currency);
    }

    /**
     * Initiate an Ozow instant EFT payment.
     *
     * <p>Creates a payment request on Ozow and returns a redirect URL
     * for the customer to complete the EFT payment via their bank.</p>
     */
    @Override
    public PaymentEntity initiateCharge(PaymentRequest request, PaymentEntity entity) {
        log.info("Initiating Ozow EFT payment for order {}", request.orderId());

        HttpHeaders headers = createHeaders();

        Map<String, Object> body = new HashMap<>();
        body.put("SiteCode", siteCode);
        body.put("CountryCode", "ZA");
        body.put("CurrencyCode", "ZAR");
        body.put("Amount", request.amount().toPlainString());
        body.put("TransactionReference", entity.getId().toString());
        body.put("BankReference", "LMG-" + request.orderId());
        body.put("Optional1", request.orderId());
        body.put("Optional2", request.customerId());
        body.put("Optional3", request.partnerId());
        body.put("IsTest", false);

        // Generate hash for request integrity
        String hashSource = String.join("",
            siteCode, "ZA", "ZAR",
            request.amount().toPlainString(),
            entity.getId().toString(),
            "LMG-" + request.orderId(),
            privateKey
        );
        body.put("HashCheck", generateSha512Hash(hashSource));

        try {
            HttpEntity<Map<String, Object>> httpEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                OZOW_API_BASE + "/PostPaymentRequest",
                HttpMethod.POST,
                httpEntity,
                String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());
            String paymentUrl = responseBody.path("url").asText();
            String ozowRef = responseBody.path("paymentRequestId").asText();

            entity.setAuthorizationUrl(paymentUrl);
            entity.setGatewayReference(ozowRef);
            entity.setStatus(PaymentStatus.PROCESSING);
            entity.setGatewayResponse(response.getBody());

            log.info("Ozow EFT payment initiated for order {}: ref={}",
                request.orderId(), ozowRef);
        } catch (Exception e) {
            entity.setStatus(PaymentStatus.FAILED);
            entity.setFailureReason("Ozow API error: " + e.getMessage());
            log.error("Ozow payment initiation failed for order {}",
                request.orderId(), e);
        }

        return entity;
    }

    /**
     * Initiate an Ozow payout to a driver's bank account.
     *
     * @param bankAccountNumber Driver's bank account number
     * @param branchCode Bank branch code
     * @param amount Payout amount in ZAR
     * @param reference Payout reference
     * @return Payout reference ID from Ozow
     */
    public String initiatePayout(
            String bankAccountNumber,
            String branchCode,
            java.math.BigDecimal amount,
            String reference) {
        log.info("Initiating Ozow payout: ref={} amount={}", reference, amount);

        HttpHeaders headers = createHeaders();

        Map<String, Object> body = new HashMap<>();
        body.put("SiteCode", siteCode);
        body.put("AccountNumber", bankAccountNumber);
        body.put("BranchCode", branchCode);
        body.put("Amount", amount.toPlainString());
        body.put("Reference", reference);
        body.put("CurrencyCode", "ZAR");

        try {
            HttpEntity<Map<String, Object>> httpEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                OZOW_API_BASE + "/PostPayout",
                HttpMethod.POST,
                httpEntity,
                String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());
            String payoutId = responseBody.path("payoutId").asText();

            log.info("Ozow payout initiated: payoutId={}", payoutId);
            return payoutId;
        } catch (Exception e) {
            log.error("Ozow payout failed for ref {}", reference, e);
            throw new RuntimeException("Ozow payout failed: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean verifyTransaction(String gatewayReference) {
        log.info("Verifying Ozow transaction: {}", gatewayReference);

        HttpHeaders headers = createHeaders();
        HttpEntity<Void> httpEntity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                OZOW_API_BASE + "/GetTransactionStatus?SiteCode=" + siteCode
                    + "&TransactionId=" + gatewayReference,
                HttpMethod.GET,
                httpEntity,
                String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());
            String status = responseBody.path("status").asText();

            return "Complete".equalsIgnoreCase(status);
        } catch (Exception e) {
            log.error("Ozow verification failed for {}", gatewayReference, e);
            return false;
        }
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        String computed = generateSha512Hash(payload + privateKey);
        return computed.equalsIgnoreCase(signature);
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("ApiKey", apiKey);
        return headers;
    }

    private String generateSha512Hash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-512");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).toLowerCase();
        } catch (Exception e) {
            throw new RuntimeException("SHA-512 hash generation failed", e);
        }
    }
}
