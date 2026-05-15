//! Kafka consumer for blockchain event processing.
//!
//! Consumes `order.delivered` and `payment.completed` events from Kafka
//! and triggers on-chain recording via the blockchain client.
//!
//! See: docs/specs/06_BLOCKCHAIN_LAYER.md - Section 3
//! See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 3.1

use std::sync::Arc;

use serde::Deserialize;
use tracing::{error, info, warn};

use crate::blockchain::contracts::string_to_bytes32;
use crate::error::BlockchainError;
use crate::AppState;

/// Kafka event payload for order delivered events.
#[derive(Debug, Deserialize)]
pub struct OrderDeliveredPayload {
    pub order_id: String,
    pub driver_id: String,
    pub delivery_latitude: f64,
    pub delivery_longitude: f64,
    pub photo_hash: String,
    pub delivered_at: String,
}

/// Kafka event payload for payment completed events.
#[derive(Debug, Deserialize)]
pub struct PaymentCompletedPayload {
    pub payment_id: String,
    pub order_id: String,
    pub amount: f64,
    pub gateway: String,
    pub gateway_ref: String,
}

/// Generic Kafka event wrapper matching the platform event schema.
#[derive(Debug, Deserialize)]
pub struct KafkaEvent<T> {
    pub event_id: String,
    pub event_type: String,
    pub timestamp: String,
    pub source: String,
    pub trace_id: String,
    pub payload: T,
}

/// Blockchain event consumer.
pub struct BlockchainEventConsumer;

impl BlockchainEventConsumer {
    /// Start the Kafka consumer loop.
    ///
    /// Listens to `lmg.orders.delivered` and `lmg.payments.completed` topics.
    /// For each event, triggers the corresponding on-chain transaction.
    pub async fn start(state: Arc<AppState>) -> Result<(), BlockchainError> {
        let brokers = &state.config.kafka_brokers;
        let group_id = &state.config.kafka_group_id;

        info!(
            "Starting Kafka consumer: brokers={}, group={}",
            brokers, group_id
        );

        // In a full implementation, this would use rdkafka to create a
        // StreamConsumer and process messages in a loop. The scaffold
        // demonstrates the event routing pattern.

        // Placeholder: log that the consumer would start here
        info!(
            "Kafka consumer configured for topics: [{}, {}]",
            state.config.kafka_orders_delivered_topic,
            state.config.kafka_payments_topic
        );

        // In production:
        // loop {
        //     match consumer.recv().await {
        //         Ok(message) => {
        //             Self::process_message(&state, &message).await;
        //             consumer.commit_message(&message, CommitMode::Async)?;
        //         }
        //         Err(e) => error!("Kafka recv error: {}", e),
        //     }
        // }

        Ok(())
    }

    /// Route a Kafka message to the appropriate handler based on topic.
    pub async fn process_message(
        state: &Arc<AppState>,
        topic: &str,
        payload: &str,
    ) -> Result<(), BlockchainError> {
        match topic {
            t if t.contains("orders.delivered") => {
                Self::handle_order_delivered(state, payload).await
            }
            t if t.contains("payments.completed") => {
                Self::handle_payment_completed(state, payload).await
            }
            _ => {
                warn!("Unknown topic: {}", topic);
                Ok(())
            }
        }
    }

    /// Handle an order.delivered event by recording delivery on-chain.
    async fn handle_order_delivered(
        state: &Arc<AppState>,
        payload: &str,
    ) -> Result<(), BlockchainError> {
        let event: KafkaEvent<OrderDeliveredPayload> = serde_json::from_str(payload)
            .map_err(|e| BlockchainError::SerializationError(e.to_string()))?;

        let p = &event.payload;
        info!(
            "Processing order.delivered: order={}, driver={}",
            p.order_id, p.driver_id
        );

        let order_id = string_to_bytes32(&p.order_id);
        let driver_id = string_to_bytes32(&p.driver_id);
        let customer_id = [0u8; 32]; // Would come from order lookup
        let photo_hash = string_to_bytes32(&p.photo_hash);
        let signature_hash = [0u8; 32];

        let lat_fixed = (p.delivery_latitude * 1_000_000.0) as i64;
        let lng_fixed = (p.delivery_longitude * 1_000_000.0) as i64;

        match state
            .blockchain_client
            .record_delivery(
                order_id,
                driver_id,
                customer_id,
                lat_fixed,
                lng_fixed,
                photo_hash,
                signature_hash,
            )
            .await
        {
            Ok((tx_hash, block)) => {
                info!(
                    "Delivery recorded on-chain: order={}, tx={:?}, block={}",
                    p.order_id, tx_hash, block
                );
            }
            Err(e) => {
                error!(
                    "Failed to record delivery on-chain: order={}, error={}",
                    p.order_id, e
                );
                return Err(e);
            }
        }

        Ok(())
    }

    /// Handle a payment.completed event (for potential escrow creation).
    async fn handle_payment_completed(
        _state: &Arc<AppState>,
        payload: &str,
    ) -> Result<(), BlockchainError> {
        let event: KafkaEvent<PaymentCompletedPayload> = serde_json::from_str(payload)
            .map_err(|e| BlockchainError::SerializationError(e.to_string()))?;

        info!(
            "Processing payment.completed: payment={}, order={}, amount={}",
            event.payload.payment_id, event.payload.order_id, event.payload.amount
        );

        // Phase J: Create escrow on-chain after payment confirmation
        // This would call state.blockchain_client.create_escrow(...)

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deserialize_order_delivered_event() {
        let json = r#"{
            "event_id": "evt-001",
            "event_type": "order.delivered",
            "timestamp": "2026-05-15T00:00:00Z",
            "source": "svc-orders",
            "trace_id": "trace-001",
            "payload": {
                "order_id": "ORD-001",
                "driver_id": "DRV-001",
                "delivery_latitude": -29.858681,
                "delivery_longitude": 31.021839,
                "photo_hash": "QmPhotoHash",
                "delivered_at": "2026-05-15T00:30:00Z"
            }
        }"#;

        let event: KafkaEvent<OrderDeliveredPayload> = serde_json::from_str(json).unwrap();
        assert_eq!(event.event_type, "order.delivered");
        assert_eq!(event.payload.order_id, "ORD-001");
        assert!((event.payload.delivery_latitude - (-29.858681)).abs() < 0.0001);
    }

    #[test]
    fn test_deserialize_payment_completed_event() {
        let json = r#"{
            "event_id": "evt-002",
            "event_type": "payment.completed",
            "timestamp": "2026-05-15T00:00:00Z",
            "source": "svc-payments",
            "trace_id": "trace-002",
            "payload": {
                "payment_id": "PAY-001",
                "order_id": "ORD-001",
                "amount": 125.50,
                "gateway": "paystack",
                "gateway_ref": "PSK-REF-001"
            }
        }"#;

        let event: KafkaEvent<PaymentCompletedPayload> = serde_json::from_str(json).unwrap();
        assert_eq!(event.payload.gateway, "paystack");
        assert!((event.payload.amount - 125.50).abs() < 0.01);
    }
}
