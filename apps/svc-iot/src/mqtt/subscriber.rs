//! MQTT Subscriber - Ingests vehicle telemetry from IoT devices.
//!
//! Subscribes to MQTT topics for fleet telemetry, diagnostics, and GPS
//! updates. Processes incoming messages and routes them to the
//! telemetry processor for storage and alert generation.
//!
//! Uses rumqttc for async MQTT 3.1.1/5 connectivity.
//!
//! See: POLYGLOT_ARCHITECTURE.md - Section 2.4

use std::sync::Arc;
use std::time::Duration;

use rumqttc::{AsyncClient, Event, MqttOptions, Packet, QoS};
use tracing::{debug, error, info, warn};

use crate::db::timescaledb::TimescaleDb;
use crate::error::IoTError;
use crate::models::{DiagnosticsEvent, GpsPosition, TelemetryEvent};
use crate::AppState;

/// MQTT subscriber that ingests vehicle telemetry data.
pub struct MqttSubscriber;

impl MqttSubscriber {
    /// Start the MQTT subscriber loop.
    ///
    /// Connects to the MQTT broker and subscribes to telemetry, diagnostics,
    /// and GPS topics. Incoming messages are deserialized and forwarded to
    /// the telemetry processor for storage and alerting.
    pub async fn start(state: Arc<AppState>, db: TimescaleDb) -> Result<(), IoTError> {
        let config = &state.config;

        info!(
            "Connecting to MQTT broker: {}:{}",
            config.mqtt_broker_url, config.mqtt_port
        );

        let mut mqtt_options = MqttOptions::new(
            &config.mqtt_client_id,
            &config.mqtt_broker_url,
            config.mqtt_port,
        );
        mqtt_options.set_keep_alive(Duration::from_secs(30));
        mqtt_options.set_clean_session(true);
        mqtt_options.set_max_packet_size(256 * 1024, 256 * 1024);

        let (client, mut eventloop) = AsyncClient::new(mqtt_options, 100);

        // Subscribe to telemetry topics
        client
            .subscribe(&config.mqtt_telemetry_topic, QoS::AtLeastOnce)
            .await
            .map_err(|e| IoTError::MqttSubscriptionError(e.to_string()))?;

        client
            .subscribe(&config.mqtt_diagnostics_topic, QoS::AtLeastOnce)
            .await
            .map_err(|e| IoTError::MqttSubscriptionError(e.to_string()))?;

        client
            .subscribe(&config.mqtt_gps_topic, QoS::AtLeastOnce)
            .await
            .map_err(|e| IoTError::MqttSubscriptionError(e.to_string()))?;

        info!(
            "Subscribed to MQTT topics: [{}], [{}], [{}]",
            config.mqtt_telemetry_topic,
            config.mqtt_diagnostics_topic,
            config.mqtt_gps_topic
        );

        // Event loop
        loop {
            match eventloop.poll().await {
                Ok(Event::Incoming(Packet::Publish(publish))) => {
                    let topic = &publish.topic;
                    let payload = &publish.payload;

                    debug!("MQTT message received on topic: {}", topic);

                    if let Err(e) =
                        Self::route_message(&state, &db, topic, payload).await
                    {
                        error!("Error processing MQTT message: {}", e);
                    }
                }
                Ok(Event::Incoming(Packet::ConnAck(_))) => {
                    info!("MQTT connection established");
                }
                Ok(Event::Incoming(Packet::SubAck(_))) => {
                    debug!("MQTT subscription acknowledged");
                }
                Ok(_) => {}
                Err(e) => {
                    error!("MQTT event loop error: {}", e);
                    tokio::time::sleep(Duration::from_secs(5)).await;
                }
            }
        }
    }

    /// Route an incoming MQTT message to the appropriate handler.
    async fn route_message(
        state: &Arc<AppState>,
        db: &TimescaleDb,
        topic: &str,
        payload: &[u8],
    ) -> Result<(), IoTError> {
        let payload_str = std::str::from_utf8(payload)
            .map_err(|e| IoTError::InvalidTelemetryData(e.to_string()))?;

        if topic.contains("/telemetry") {
            Self::handle_telemetry(state, db, payload_str).await
        } else if topic.contains("/diagnostics") {
            Self::handle_diagnostics(state, db, payload_str).await
        } else if topic.contains("/gps") {
            Self::handle_gps(state, db, payload_str).await
        } else {
            warn!("Unknown MQTT topic: {}", topic);
            Ok(())
        }
    }

    /// Handle a telemetry event from a vehicle.
    async fn handle_telemetry(
        state: &Arc<AppState>,
        db: &TimescaleDb,
        payload: &str,
    ) -> Result<(), IoTError> {
        let event: TelemetryEvent = serde_json::from_str(payload)
            .map_err(|e| IoTError::InvalidTelemetryData(e.to_string()))?;

        debug!(
            "Telemetry: vehicle={}, speed={:.1}km/h, engine={:.1}C",
            event.vehicle_id, event.speed_kmh, event.engine_temp_c
        );

        // Check for alerts
        let alerts = state.processor.check_alerts(&event);
        for alert in &alerts {
            info!(
                "Alert generated: vehicle={}, type={}, severity={}",
                alert.vehicle_id, alert.alert_type, alert.severity
            );
        }

        // Store telemetry record
        let record = crate::models::TelemetryRecord::from_event(event);
        db.insert_telemetry(&record).await?;

        // Store any alerts
        for alert in &alerts {
            db.insert_alert(alert).await?;
        }

        Ok(())
    }

    /// Handle a diagnostics event from a vehicle.
    async fn handle_diagnostics(
        _state: &Arc<AppState>,
        db: &TimescaleDb,
        payload: &str,
    ) -> Result<(), IoTError> {
        let event: DiagnosticsEvent = serde_json::from_str(payload)
            .map_err(|e| IoTError::InvalidTelemetryData(e.to_string()))?;

        debug!(
            "Diagnostics: vehicle={}, DTC codes={}, MIL={}",
            event.vehicle_id,
            event.dtc_codes.len(),
            event.mil_status
        );

        db.insert_diagnostics(&event).await?;

        Ok(())
    }

    /// Handle a GPS position update from a vehicle.
    async fn handle_gps(
        _state: &Arc<AppState>,
        db: &TimescaleDb,
        payload: &str,
    ) -> Result<(), IoTError> {
        let position: GpsPosition = serde_json::from_str(payload)
            .map_err(|e| IoTError::InvalidTelemetryData(e.to_string()))?;

        debug!(
            "GPS: vehicle={}, lat={:.6}, lng={:.6}, speed={:.1}",
            position.vehicle_id, position.latitude, position.longitude, position.speed_kmh
        );

        db.insert_gps_position(&position).await?;

        Ok(())
    }
}
