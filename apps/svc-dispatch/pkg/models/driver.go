// Package models contains shared data structures for the Dispatch Engine.
package models

// DriverCandidate represents a driver being evaluated for dispatch assignment.
type DriverCandidate struct {
	DriverID        string  `json:"driverId"`
	Latitude        float64 `json:"latitude"`
	Longitude       float64 `json:"longitude"`
	Zone            string  `json:"zone"`
	Status          string  `json:"status"`
	PerformanceTier string  `json:"performanceTier"`
	Rating          float64 `json:"rating"`
	DistanceKm      float64 `json:"distanceKm"`
	EstimatedMin    float64 `json:"estimatedMinutes"`
	Score           float64 `json:"score"`
}

// DispatchDecision represents the result of the dispatch matching algorithm.
type DispatchDecision struct {
	OrderID          string            `json:"orderId"`
	SelectedDriverID string            `json:"selectedDriverId"`
	Candidates       []DriverCandidate `json:"candidateDrivers"`
	Confidence       float64           `json:"confidence"`
	HITLRequired     bool              `json:"hitlRequired"`
	RouteEstimate    RouteEstimate     `json:"routeEstimate"`
	DecisionTimeMs   int64             `json:"decisionTimeMs"`
}

// RouteEstimate contains estimated route information for a dispatch.
type RouteEstimate struct {
	DistanceKm    float64    `json:"distanceKm"`
	EstimatedMin  float64    `json:"estimatedMinutes"`
	Waypoints     []GeoPoint `json:"waypoints"`
}

// GeoPoint represents a latitude/longitude coordinate pair.
type GeoPoint struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// DispatchedPayload is the Kafka payload for order.dispatched events.
type DispatchedPayload struct {
	OrderID        string  `json:"orderId"`
	DriverID       string  `json:"driverId"`
	EstimatedMin   float64 `json:"estimatedMinutes"`
	RouteDistKm    float64 `json:"routeDistanceKm"`
}

// DispatchFailedPayload is the Kafka payload for dispatch.failed events.
type DispatchFailedPayload struct {
	OrderID string `json:"orderId"`
	Reason  string `json:"reason"`
	Zone    string `json:"zone"`
}
