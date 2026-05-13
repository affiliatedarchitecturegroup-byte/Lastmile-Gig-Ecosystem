// Package kafka provides Kafka consumer and producer for the Dispatch Engine.
//
// Consumes: lmg.orders.placed, lmg.drivers.status
// Produces: lmg.orders.dispatched, lmg.dispatch.failed
//
// See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.5
package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"go.uber.org/zap"

	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/internal/dispatch"
	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/pkg/models"
)

const (
	topicOrdersPlaced     = "lmg.orders.placed"
	topicDriversStatus    = "lmg.drivers.status"
	topicOrdersDispatched = "lmg.orders.dispatched"
	topicDispatchFailed   = "lmg.dispatch.failed"

	pollTimeoutMs = 1000
)

// Consumer wraps a Kafka consumer for order and driver events.
type Consumer struct {
	consumer *kafka.Consumer
	logger   *zap.SugaredLogger
}

// NewConsumer creates a new Kafka consumer subscribed to dispatch-relevant topics.
func NewConsumer(brokers string, groupID string, logger *zap.SugaredLogger) (*Consumer, error) {
	c, err := kafka.NewConsumer(&kafka.ConfigMap{
		"bootstrap.servers":  brokers,
		"group.id":           groupID,
		"auto.offset.reset":  "earliest",
		"enable.auto.commit": true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Kafka consumer: %w", err)
	}

	topics := []string{topicOrdersPlaced, topicDriversStatus}
	if err := c.SubscribeTopics(topics, nil); err != nil {
		return nil, fmt.Errorf("failed to subscribe to topics: %w", err)
	}

	logger.Infof("Kafka consumer subscribed to topics: %v", topics)

	return &Consumer{
		consumer: c,
		logger:   logger,
	}, nil
}

// Close closes the Kafka consumer.
func (c *Consumer) Close() {
	c.consumer.Close()
	c.logger.Info("Kafka consumer closed")
}

// ConsumeOrderPlaced starts the main consumption loop for order.placed events.
// Each event triggers the dispatch engine to find an optimal driver match.
// Runs until the context is cancelled.
func (c *Consumer) ConsumeOrderPlaced(ctx context.Context, engine *dispatch.Engine, producer *Producer) {
	c.logger.Info("Starting Kafka consumer loop for order.placed events")

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("Kafka consumer loop stopped")
			return
		default:
			msg, err := c.consumer.ReadMessage(time.Duration(pollTimeoutMs) * time.Millisecond)
			if err != nil {
				// Timeout is expected when no messages available
				if err.(kafka.Error).Code() == kafka.ErrTimedOut {
					continue
				}
				c.logger.Warnf("Kafka read error: %v", err)
				continue
			}

			topic := *msg.TopicPartition.Topic

			switch topic {
			case topicOrdersPlaced:
				c.handleOrderPlaced(ctx, msg, engine, producer)
			case topicDriversStatus:
				c.handleDriverStatus(ctx, msg)
			default:
				c.logger.Warnf("Received message from unexpected topic: %s", topic)
			}
		}
	}
}

// handleOrderPlaced processes an order.placed event.
func (c *Consumer) handleOrderPlaced(ctx context.Context, msg *kafka.Message, engine *dispatch.Engine, producer *Producer) {
	var event models.OrderPlacedEvent
	if err := json.Unmarshal(msg.Value, &event); err != nil {
		c.logger.Errorf("Failed to unmarshal order.placed event: %v", err)
		return
	}

	c.logger.Infof("Processing order.placed: orderId=%s, zone=%s", event.Payload.OrderID, event.Payload.Zone)

	// Run dispatch matching
	decision, err := engine.MatchDriver(ctx, event.Payload)
	if err != nil {
		c.logger.Errorf("Dispatch matching failed for order %s: %v", event.Payload.OrderID, err)

		// Publish dispatch.failed event
		producer.PublishDispatchFailed(models.DispatchFailedPayload{
			OrderID: event.Payload.OrderID,
			Reason:  err.Error(),
			Zone:    event.Payload.Zone,
		})
		return
	}

	// If HITL required, log but still publish (Command Centre will review)
	if decision.HITLRequired {
		c.logger.Warnf(
			"Low confidence dispatch for order %s (%.2f), HITL review required",
			decision.OrderID, decision.Confidence,
		)
	}

	// Publish order.dispatched event
	producer.PublishOrderDispatched(models.DispatchedPayload{
		OrderID:      decision.OrderID,
		DriverID:     decision.SelectedDriverID,
		EstimatedMin: decision.RouteEstimate.EstimatedMin,
		RouteDistKm:  decision.RouteEstimate.DistanceKm,
	})
}

// handleDriverStatus processes a driver.status.changed event to update the pool.
func (c *Consumer) handleDriverStatus(ctx context.Context, msg *kafka.Message) {
	c.logger.Debugf("Received driver.status.changed event (placeholder handler)")
	// Phase G expansion: update driver pool based on status changes
}
