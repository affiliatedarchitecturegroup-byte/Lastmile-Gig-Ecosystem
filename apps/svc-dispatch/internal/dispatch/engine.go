// Package dispatch implements the core dispatch matching algorithm.
//
// The engine matches incoming orders to optimal available drivers using
// a rule-based scoring algorithm (v1) with plans to integrate AI-based
// scoring via gRPC to the AI inference service.
//
// Scoring factors (v1):
//   - Distance from driver to pickup (40% weight)
//   - Driver performance rating (30% weight)
//   - Driver tier bonus (20% weight)
//   - Zone familiarity (10% weight)
//
// SLA: < 800ms from order.placed to dispatch decision
//
// See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.5
package dispatch

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"

	"go.uber.org/zap"

	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/internal/config"
	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/internal/redis"
	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/pkg/models"
)

const (
	// Scoring weights (must sum to 1.0)
	weightDistance    = 0.40
	weightRating     = 0.30
	weightTier       = 0.20
	weightFamiliarity = 0.10

	// Maximum distance in km before a driver is excluded
	maxDispatchDistanceKm = 15.0

	// Earth radius in kilometres for Haversine calculation
	earthRadiusKm = 6371.0

	// Average speed assumption for ETA calculation (km/h)
	averageSpeedKmh = 30.0
)

// Tier score mapping
var tierScores = map[string]float64{
	"elite":  1.0,
	"gold":   0.8,
	"silver": 0.6,
	"bronze": 0.4,
}

// Engine is the core dispatch matching engine.
type Engine struct {
	driverPool *redis.DriverPool
	logger     *zap.SugaredLogger
	cfg        *config.Config
}

// NewEngine creates a new dispatch engine with the given driver pool and config.
func NewEngine(pool *redis.DriverPool, logger *zap.SugaredLogger, cfg *config.Config) *Engine {
	return &Engine{
		driverPool: pool,
		logger:     logger,
		cfg:        cfg,
	}
}

// MatchDriver processes an order.placed event and finds the optimal driver.
//
// The algorithm:
// 1. Acquire dispatch lock (prevent double-dispatch)
// 2. Query available drivers from Redis pool for the order's zone
// 3. Calculate distance from each driver to pickup location
// 4. Score each candidate using the weighted scoring formula
// 5. Sort by score descending and select the top candidate
// 6. Determine if HITL review is required (confidence < threshold)
// 7. Return dispatch decision
func (e *Engine) MatchDriver(ctx context.Context, order models.OrderPlacedPayload) (*models.DispatchDecision, error) {
	startTime := time.Now()
	e.logger.Infof("Starting dispatch matching for order %s in zone %s", order.OrderID, order.Zone)

	// Step 1: Acquire dispatch lock
	locked, err := e.driverPool.AcquireDispatchLock(ctx, order.OrderID)
	if err != nil {
		return nil, fmt.Errorf("dispatch lock error: %w", err)
	}
	if !locked {
		return nil, fmt.Errorf("order %s already being dispatched", order.OrderID)
	}

	// Step 2: Get available drivers from Redis pool
	candidates, err := e.driverPool.GetAvailableDrivers(ctx, order.Zone, e.cfg.MaxCandidateDrivers)
	if err != nil {
		e.driverPool.ReleaseDispatchLock(ctx, order.OrderID)
		return nil, fmt.Errorf("failed to get available drivers: %w", err)
	}

	if len(candidates) == 0 {
		e.driverPool.ReleaseDispatchLock(ctx, order.OrderID)
		return nil, fmt.Errorf("no available drivers in zone %s", order.Zone)
	}

	// Step 3 & 4: Calculate distance and score each candidate
	scoredCandidates := e.scoreAllCandidates(candidates, order)

	if len(scoredCandidates) == 0 {
		e.driverPool.ReleaseDispatchLock(ctx, order.OrderID)
		return nil, fmt.Errorf("no drivers within %0.fkm of pickup in zone %s", maxDispatchDistanceKm, order.Zone)
	}

	// Step 5: Sort by score descending
	sort.Slice(scoredCandidates, func(i, j int) bool {
		return scoredCandidates[i].Score > scoredCandidates[j].Score
	})

	// Step 6: Select top candidate and check confidence
	selected := scoredCandidates[0]
	confidence := e.calculateConfidence(scoredCandidates)
	hitlRequired := confidence < e.cfg.HITLConfidenceThreshold

	// Step 7: Build dispatch decision
	decisionTimeMs := time.Since(startTime).Milliseconds()
	decision := &models.DispatchDecision{
		OrderID:          order.OrderID,
		SelectedDriverID: selected.DriverID,
		Candidates:       scoredCandidates,
		Confidence:       confidence,
		HITLRequired:     hitlRequired,
		RouteEstimate: models.RouteEstimate{
			DistanceKm:   selected.DistanceKm,
			EstimatedMin: selected.EstimatedMin,
			Waypoints: []models.GeoPoint{
				{Latitude: selected.Latitude, Longitude: selected.Longitude},
				{Latitude: order.Address.Latitude, Longitude: order.Address.Longitude},
			},
		},
		DecisionTimeMs: decisionTimeMs,
	}

	e.logger.Infof(
		"Dispatch decision for order %s: driver=%s, score=%.2f, confidence=%.2f, hitl=%v, time=%dms",
		order.OrderID, selected.DriverID, selected.Score, confidence, hitlRequired, decisionTimeMs,
	)

	return decision, nil
}

// scoreAllCandidates calculates a composite score for each candidate driver.
func (e *Engine) scoreAllCandidates(candidates []models.DriverCandidate, order models.OrderPlacedPayload) []models.DriverCandidate {
	scored := make([]models.DriverCandidate, 0, len(candidates))

	for _, c := range candidates {
		// Calculate distance from driver to pickup
		distKm := haversineDistance(
			c.Latitude, c.Longitude,
			order.Address.Latitude, order.Address.Longitude,
		)

		// Skip drivers beyond maximum dispatch distance
		if distKm > maxDispatchDistanceKm {
			continue
		}

		// Calculate ETA in minutes
		etaMin := (distKm / averageSpeedKmh) * 60.0

		// Distance score: closer is better (inverse, normalised)
		distanceScore := 1.0 - (distKm / maxDispatchDistanceKm)

		// Rating score: normalised to 0-1 (assuming 5-point scale)
		ratingScore := c.Rating / 5.0

		// Tier score: mapped from tier name
		tierScore := tierScores[c.PerformanceTier]
		if tierScore == 0 {
			tierScore = 0.3 // default for unknown tiers
		}

		// Zone familiarity: 1.0 if driver is in the same zone, 0.5 otherwise
		familiarityScore := 0.5
		if c.Zone == order.Zone {
			familiarityScore = 1.0
		}

		// Composite score
		compositeScore := (weightDistance * distanceScore) +
			(weightRating * ratingScore) +
			(weightTier * tierScore) +
			(weightFamiliarity * familiarityScore)

		c.DistanceKm = math.Round(distKm*100) / 100
		c.EstimatedMin = math.Round(etaMin*10) / 10
		c.Score = math.Round(compositeScore*1000) / 1000

		scored = append(scored, c)
	}

	return scored
}

// calculateConfidence computes a confidence score for the dispatch decision.
// Based on the score gap between the top candidate and the rest.
func (e *Engine) calculateConfidence(candidates []models.DriverCandidate) float64 {
	if len(candidates) == 0 {
		return 0
	}

	if len(candidates) == 1 {
		return candidates[0].Score
	}

	topScore := candidates[0].Score
	secondScore := candidates[1].Score

	// Confidence is higher when there's a clear winner
	scoreGap := topScore - secondScore
	confidence := topScore * (1.0 + scoreGap)

	// Clamp to [0, 1]
	if confidence > 1.0 {
		confidence = 1.0
	}
	if confidence < 0 {
		confidence = 0
	}

	return math.Round(confidence*100) / 100
}

// haversineDistance calculates the great-circle distance between two GPS points in km.
func haversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	dLat := degreesToRadians(lat2 - lat1)
	dLon := degreesToRadians(lon2 - lon1)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(degreesToRadians(lat1))*
			math.Cos(degreesToRadians(lat2))*
			math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadiusKm * c
}

func degreesToRadians(deg float64) float64 {
	return deg * (math.Pi / 180.0)
}
