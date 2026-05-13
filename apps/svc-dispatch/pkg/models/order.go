// Package models contains shared data structures for the Dispatch Engine.
//
// These models mirror the Kafka event payloads defined in
// libs/shared-types/src/kafka/kafka-events.types.ts
package models

// OrderPlacedPayload represents the payload of an order.placed Kafka event.
type OrderPlacedPayload struct {
	OrderID   string           `json:"orderId"`
	CustomerID string          `json:"customerId"`
	PartnerID  string          `json:"partnerId"`
	Items     []OrderItem      `json:"items"`
	Total     float64          `json:"total"`
	Address   DeliveryAddress  `json:"deliveryAddress"`
	Zone      string           `json:"zone"`
}

// OrderItem represents a single item in an order.
type OrderItem struct {
	ItemID    string  `json:"itemId"`
	Quantity  int     `json:"quantity"`
	UnitPrice float64 `json:"unitPrice"`
}

// DeliveryAddress represents the delivery destination.
type DeliveryAddress struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Street    string  `json:"street"`
}

// KafkaEvent is the envelope for all Kafka events.
type KafkaEvent struct {
	EventID   string      `json:"eventId"`
	EventType string      `json:"eventType"`
	Timestamp string      `json:"timestamp"`
	Source    string       `json:"source"`
	TraceID  string       `json:"traceId"`
	Payload  interface{}  `json:"payload"`
}

// OrderPlacedEvent is a typed Kafka event for order.placed.
type OrderPlacedEvent struct {
	EventID   string             `json:"eventId"`
	EventType string             `json:"eventType"`
	Timestamp string             `json:"timestamp"`
	Source    string              `json:"source"`
	TraceID  string              `json:"traceId"`
	Payload  OrderPlacedPayload  `json:"payload"`
}
