package co.za.aagais.lastmilegig.payments.kafka;

import co.za.aagais.lastmilegig.payments.model.PaymentStatus;
import co.za.aagais.lastmilegig.payments.service.DriverPayoutService;
import co.za.aagais.lastmilegig.payments.service.PaymentService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Kafka consumer for payment-related events.
 *
 * <p>Listens to:
 * <ul>
 *   <li>{@code lmg.orders.delivered} - Triggers driver payout after delivery confirmation</li>
 *   <li>{@code lmg.payments.webhooks} - Processes webhook events from API Gateway</li>
 * </ul>
 *
 * @since 1.0.0
 */
@Component
public class PaymentKafkaConsumer {

    private static final Logger log = LoggerFactory.getLogger(PaymentKafkaConsumer.class);

    private final PaymentService paymentService;
    private final DriverPayoutService driverPayoutService;
    private final ObjectMapper objectMapper;

    public PaymentKafkaConsumer(
            PaymentService paymentService,
            DriverPayoutService driverPayoutService,
            ObjectMapper objectMapper) {
        this.paymentService = paymentService;
        this.driverPayoutService = driverPayoutService;
        this.objectMapper = objectMapper;
    }

    /**
     * Consume order.delivered events to trigger driver payout.
     *
     * <p>When an order is confirmed as delivered, this consumer triggers
     * the commission split and driver payout via Ozow instant EFT.</p>
     *
     * @param message JSON message from lmg.orders.delivered topic
     */
    @KafkaListener(
        topics = "lmg.orders.delivered",
        groupId = "svc-payments-payout"
    )
    public void handleOrderDelivered(String message) {
        log.info("Received order.delivered event");

        try {
            JsonNode event = objectMapper.readTree(message);
            String orderId = event.path("orderId").asText();
            String driverId = event.path("driverId").asText();
            String partnerId = event.path("partnerId").asText();

            log.info("Processing payout for delivered order {}: driver={} partner={}",
                orderId, driverId, partnerId);

            driverPayoutService.processDeliveryPayout(orderId, driverId, partnerId);

            log.info("Payout processing initiated for order {}", orderId);
        } catch (Exception e) {
            log.error("Failed to process order.delivered event", e);
            // TODO: Push to dead letter topic for retry
        }
    }

    /**
     * Consume webhook events forwarded by the API Gateway.
     *
     * <p>Updates payment status based on gateway webhook notifications.
     * Handles success, failure, and dispute events.</p>
     *
     * @param message JSON webhook event from lmg.payments.webhooks topic
     */
    @KafkaListener(
        topics = "lmg.payments.webhooks",
        groupId = "svc-payments-webhooks"
    )
    public void handleWebhookEvent(String message) {
        log.info("Received payment webhook event");

        try {
            JsonNode event = objectMapper.readTree(message);
            String gateway = event.path("gateway").asText();
            String reference = event.path("reference").asText();
            String status = event.path("status").asText();
            String eventType = event.path("event").asText();

            log.info("Processing {} webhook: ref={} event={} status={}",
                gateway, reference, eventType, status);

            PaymentStatus newStatus = mapGatewayStatus(gateway, status, eventType);
            if (newStatus != null) {
                paymentService.updatePaymentFromWebhook(reference, newStatus);
                log.info("Payment {} updated to status {} from {} webhook",
                    reference, newStatus, gateway);
            } else {
                log.warn("Unmapped webhook event: gateway={} event={} status={}",
                    gateway, eventType, status);
            }
        } catch (Exception e) {
            log.error("Failed to process webhook event", e);
        }
    }

    /**
     * Map gateway-specific status to internal PaymentStatus.
     */
    private PaymentStatus mapGatewayStatus(
            String gateway, String status, String eventType) {
        return switch (gateway) {
            case "paystack" -> mapPaystackStatus(eventType);
            case "stripe" -> mapStripeStatus(eventType);
            case "ozow" -> mapOzowStatus(status);
            case "flutterwave" -> mapFlutterwaveStatus(eventType, status);
            case "peach" -> mapPeachStatus(status);
            default -> null;
        };
    }

    private PaymentStatus mapPaystackStatus(String eventType) {
        return switch (eventType) {
            case "charge.success" -> PaymentStatus.COMPLETED;
            case "charge.failed" -> PaymentStatus.FAILED;
            case "transfer.success" -> PaymentStatus.PAYOUT_COMPLETED;
            case "transfer.failed" -> PaymentStatus.PAYOUT_FAILED;
            case "refund.processed" -> PaymentStatus.REFUNDED;
            case "charge.dispute.create" -> PaymentStatus.DISPUTED;
            default -> null;
        };
    }

    private PaymentStatus mapStripeStatus(String eventType) {
        return switch (eventType) {
            case "payment_intent.succeeded" -> PaymentStatus.COMPLETED;
            case "payment_intent.payment_failed" -> PaymentStatus.FAILED;
            case "payment_intent.canceled" -> PaymentStatus.CANCELLED;
            case "charge.refunded" -> PaymentStatus.REFUNDED;
            case "charge.dispute.created" -> PaymentStatus.DISPUTED;
            default -> null;
        };
    }

    private PaymentStatus mapOzowStatus(String status) {
        return switch (status.toLowerCase()) {
            case "complete" -> PaymentStatus.COMPLETED;
            case "cancelled" -> PaymentStatus.CANCELLED;
            case "error" -> PaymentStatus.FAILED;
            case "pendingInvestigation" -> PaymentStatus.DISPUTED;
            default -> null;
        };
    }

    private PaymentStatus mapFlutterwaveStatus(String eventType, String status) {
        if ("charge.completed".equals(eventType) && "successful".equals(status)) {
            return PaymentStatus.COMPLETED;
        }
        if ("charge.completed".equals(eventType) && "failed".equals(status)) {
            return PaymentStatus.FAILED;
        }
        return null;
    }

    private PaymentStatus mapPeachStatus(String resultCode) {
        if (resultCode.matches("^(000\\.000\\.|000\\.100\\.1|000\\.[36]).*")) {
            return PaymentStatus.COMPLETED;
        }
        if (resultCode.startsWith("800.")) {
            return PaymentStatus.FAILED;
        }
        return null;
    }
}
