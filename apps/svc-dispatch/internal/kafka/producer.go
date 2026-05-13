// Package kafka provides the Kafka producer for the Dispatch Engine.
//
// Publishes dispatch decision events:
// - lmg.orders.dispatched: when a driver is successfully matched
// - lmg.dispatch.failed: when no driver could be matched
//
// See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.5
package kafka

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/pkg/models"
)

// Producer wraps a Kafka producer for dispatch events.
type Producer struct {
	producer *kafka.Producer
	logger   *zap.SugaredLogger
}

// NewProducer creates a new Kafka producer.
func NewProducer(brokers string, logger *zap.SugaredLogger) (*Producer, error) {
	p, err := kafka.NewProducer(&kafka.ConfigMap{
		"bootstrap.servers":   brokers,
		"acks":                "all",
		"enable.idempotence":  true,
		"retries":             5,
		"retry.backoff.ms":    300,
		"compression.type":    "snappy",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Kafka producer: %w", err)
	}

	// Start delivery report handler in background
	go func() {
		for e := range p.Events() {
			switch ev := e.(type) {
			case *kafka.Message:
				if ev.TopicPartition.Error != nil {
					logger.Errorf("Delivery failed: %v", ev.TopicPartition.Error)
				}
			}
		}
	}()

	logger.Info("Kafka producer initialised")

	return &Producer{
		producer: p,
		logger:   logger,
	}, nil
}

// Close flushes pending messages and closes the producer.
func (p *Producer) Close() {
	p.producer.Flush(5000)
	p.producer.Close()
	p.logger.Info("Kafka producer closed")
}

// PublishOrderDispatched sends an order.dispatched event to Kafka.
func (p *Producer) PublishOrderDispatched(payload models.DispatchedPayload) {
	event := models.KafkaEvent{
		EventID:   uuid.New().String(),
		EventType: "order.dispatched",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Source:    "svc-dispatch",
		TraceID:  uuid.New().String(),
		Payload:  payload,
	}

	p.publish(topicOrdersDispatched, payload.OrderID, event)
	p.logger.Infof("Published order.dispatched for orderId=%s, driverId=%s",
		payload.OrderID, payload.DriverID)
}

// PublishDispatchFailed sends a dispatch.failed event to Kafka.
func (p *Producer) PublishDispatchFailed(payload models.DispatchFailedPayload) {
	event := models.KafkaEvent{
		EventID:   uuid.New().String(),
		EventType: "dispatch.failed",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Source:    "svc-dispatch",
		TraceID:  uuid.New().String(),
		Payload:  payload,
	}

	p.publish(topicDispatchFailed, payload.OrderID, event)
	p.logger.Warnf("Published dispatch.failed for orderId=%s, reason=%s",
		payload.OrderID, payload.Reason)
}

// publish sends a message to the specified Kafka topic.
func (p *Producer) publish(topic string, key string, value interface{}) {
	data, err := json.Marshal(value)
	if err != nil {
		p.logger.Errorf("Failed to marshal event for topic %s: %v", topic, err)
		return
	}

	err = p.producer.Produce(&kafka.Message{
		TopicPartition: kafka.TopicPartition{
			Topic:     &topic,
			Partition: kafka.PartitionAny,
		},
		Key:   []byte(key),
		Value: data,
		Headers: []kafka.Header{
			{Key: "content-type", Value: []byte("application/json")},
			{Key: "source", Value: []byte("svc-dispatch")},
		},
	}, nil)

	if err != nil {
		p.logger.Errorf("Failed to produce message to %s: %v", topic, err)
	}
}
