package co.za.aagais.lastmilegig.payments.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

/**
 * Kafka producer for payment events.
 *
 * <p>Publishes payment lifecycle events to Kafka topics for
 * consumption by other services (orders, notifications, blockchain).</p>
 *
 * <p>Topics:
 * <ul>
 *   <li>{@code lmg.payments.completed} - Payment successfully completed</li>
 *   <li>{@code lmg.payments.failed} - Payment failed</li>
 *   <li>{@code lmg.payments.refunded} - Payment refunded</li>
 *   <li>{@code lmg.payments.payout.completed} - Driver payout completed</li>
 * </ul>
 *
 * @since 1.0.0
 */
@Component
public class PaymentKafkaProducer {

    private static final Logger log = LoggerFactory.getLogger(PaymentKafkaProducer.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public PaymentKafkaProducer(
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Publish a payment completed event.
     */
    public void publishPaymentCompleted(
            String paymentId, String orderId, String amount, String currency) {
        publishEvent("lmg.payments.completed", Map.of(
            "paymentId", paymentId,
            "orderId", orderId,
            "amount", amount,
            "currency", currency,
            "status", "COMPLETED",
            "timestamp", Instant.now().toString()
        ));
    }

    /**
     * Publish a payment failed event.
     */
    public void publishPaymentFailed(
            String paymentId, String orderId, String reason) {
        publishEvent("lmg.payments.failed", Map.of(
            "paymentId", paymentId,
            "orderId", orderId,
            "status", "FAILED",
            "reason", reason,
            "timestamp", Instant.now().toString()
        ));
    }

    /**
     * Publish a payment refunded event.
     */
    public void publishPaymentRefunded(
            String paymentId, String orderId, String amount) {
        publishEvent("lmg.payments.refunded", Map.of(
            "paymentId", paymentId,
            "orderId", orderId,
            "refundedAmount", amount,
            "status", "REFUNDED",
            "timestamp", Instant.now().toString()
        ));
    }

    /**
     * Publish a driver payout completed event.
     */
    public void publishPayoutCompleted(
            String paymentId, String orderId, String driverId, String amount) {
        publishEvent("lmg.payments.payout.completed", Map.of(
            "paymentId", paymentId,
            "orderId", orderId,
            "driverId", driverId,
            "payoutAmount", amount,
            "status", "PAYOUT_COMPLETED",
            "timestamp", Instant.now().toString()
        ));
    }

    /**
     * Publish event to Kafka topic.
     */
    private void publishEvent(String topic, Map<String, String> payload) {
        try {
            String message = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(topic, payload.get("orderId"), message);
            log.info("Published event to {}: orderId={}", topic, payload.get("orderId"));
        } catch (Exception e) {
            log.error("Failed to publish event to {}", topic, e);
        }
    }
}
