/**
 * Payment Kafka Consumer - Consumes order.delivered events to trigger driver payouts.
 *
 * Listens on lmg.orders.delivered topic and automatically initiates
 * driver payout flow when a delivery is confirmed.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.12
 */
package com.lastmilegig.payments.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lastmilegig.payments.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

@Component
public class PaymentKafkaConsumer {

    private static final Logger log = LoggerFactory.getLogger(PaymentKafkaConsumer.class);
    private final PaymentService paymentService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PaymentKafkaConsumer(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Consume order.delivered events to trigger automatic driver payout.
     */
    @KafkaListener(
        topics = "lmg.orders.delivered",
        groupId = "svc-payments",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void onOrderDelivered(String message) {
        try {
            JsonNode event = objectMapper.readTree(message);
            JsonNode payload = event.get("payload");

            String orderId = payload.get("orderId").asText();
            String driverId = payload.get("driverId").asText();

            log.info("Received order.delivered event: orderId={}, driverId={}", orderId, driverId);

            // Trigger driver payout
            // In production, fetch order amount from order service or payment record
            BigDecimal orderAmount = new BigDecimal("100.00"); // Placeholder

            paymentService.processDriverPayout(
                UUID.fromString(orderId),
                UUID.fromString(driverId),
                orderAmount
            );

            log.info("Driver payout triggered for order {}", orderId);
        } catch (Exception e) {
            log.error("Failed to process order.delivered event: {}", e.getMessage(), e);
        }
    }
}
