// Package dispatch tests for the core dispatch matching algorithm.
//
// Coverage target: 80%+
package dispatch

import (
	"math"
	"testing"

	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/pkg/models"
)

func TestHaversineDistance(t *testing.T) {
	tests := []struct {
		name     string
		lat1     float64
		lon1     float64
		lat2     float64
		lon2     float64
		expected float64
		tolerance float64
	}{
		{
			name:     "same point should be zero",
			lat1:     -29.8587, lon1: 31.0218,
			lat2:     -29.8587, lon2: 31.0218,
			expected: 0.0,
			tolerance: 0.01,
		},
		{
			name:     "Durban to Umhlanga ~15km",
			lat1:     -29.8587, lon1: 31.0218,
			lat2:     -29.7273, lon2: 31.0849,
			expected: 15.5,
			tolerance: 1.0,
		},
		{
			name:     "short distance ~1km",
			lat1:     -29.8587, lon1: 31.0218,
			lat2:     -29.8500, lon2: 31.0218,
			expected: 0.97,
			tolerance: 0.1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := haversineDistance(tt.lat1, tt.lon1, tt.lat2, tt.lon2)
			if math.Abs(result-tt.expected) > tt.tolerance {
				t.Errorf("haversineDistance() = %v, expected %v (+/- %v)", result, tt.expected, tt.tolerance)
			}
		})
	}
}

func TestScoreAllCandidates(t *testing.T) {
	engine := &Engine{
		cfg: &struct {
			Port                    int
			Environment             string
			RedisURL                string
			KafkaBrokers            string
			KafkaGroupID            string
			AIServiceURL            string
			DispatchTimeoutMs       int
			MaxCandidateDrivers     int
			HITLConfidenceThreshold float64
		}{
			MaxCandidateDrivers: 10,
			HITLConfidenceThreshold: 0.7,
		},
	}

	order := models.OrderPlacedPayload{
		OrderID: "order-001",
		Zone:    "KZN-North",
		Address: models.DeliveryAddress{
			Latitude:  -29.8587,
			Longitude: 31.0218,
		},
	}

	candidates := []models.DriverCandidate{
		{
			DriverID:        "driver-close",
			Latitude:        -29.8600,
			Longitude:       31.0220,
			Zone:            "KZN-North",
			Rating:          4.8,
			PerformanceTier: "gold",
		},
		{
			DriverID:        "driver-far",
			Latitude:        -29.7273,
			Longitude:       31.0849,
			Zone:            "KZN-North",
			Rating:          4.5,
			PerformanceTier: "silver",
		},
		{
			DriverID:        "driver-too-far",
			Latitude:        -29.0000,
			Longitude:       30.0000,
			Zone:            "KZN-South",
			Rating:          5.0,
			PerformanceTier: "elite",
		},
	}

	scored := engine.scoreAllCandidates(candidates, order)

	// driver-too-far should be excluded (>15km)
	if len(scored) != 2 {
		t.Errorf("Expected 2 candidates, got %d", len(scored))
	}

	// driver-close should score higher than driver-far
	if len(scored) >= 2 {
		closeIdx := -1
		farIdx := -1
		for i, c := range scored {
			if c.DriverID == "driver-close" {
				closeIdx = i
			}
			if c.DriverID == "driver-far" {
				farIdx = i
			}
		}

		if closeIdx >= 0 && farIdx >= 0 {
			if scored[closeIdx].Score <= scored[farIdx].Score {
				t.Errorf("Close driver should score higher: close=%.3f, far=%.3f",
					scored[closeIdx].Score, scored[farIdx].Score)
			}
		}
	}
}

func TestCalculateConfidence(t *testing.T) {
	engine := &Engine{}

	tests := []struct {
		name       string
		candidates []models.DriverCandidate
		minConf    float64
		maxConf    float64
	}{
		{
			name:       "no candidates",
			candidates: []models.DriverCandidate{},
			minConf:    0,
			maxConf:    0,
		},
		{
			name: "single candidate",
			candidates: []models.DriverCandidate{
				{Score: 0.85},
			},
			minConf: 0.8,
			maxConf: 0.9,
		},
		{
			name: "clear winner (large gap)",
			candidates: []models.DriverCandidate{
				{Score: 0.9},
				{Score: 0.3},
			},
			minConf: 0.9,
			maxConf: 1.0,
		},
		{
			name: "close race (small gap)",
			candidates: []models.DriverCandidate{
				{Score: 0.7},
				{Score: 0.68},
			},
			minConf: 0.7,
			maxConf: 0.8,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			confidence := engine.calculateConfidence(tt.candidates)
			if confidence < tt.minConf || confidence > tt.maxConf {
				t.Errorf("confidence = %.2f, expected between %.2f and %.2f",
					confidence, tt.minConf, tt.maxConf)
			}
		})
	}
}

func TestTierScores(t *testing.T) {
	expected := map[string]float64{
		"elite":  1.0,
		"gold":   0.8,
		"silver": 0.6,
		"bronze": 0.4,
	}

	for tier, expectedScore := range expected {
		if score, ok := tierScores[tier]; !ok || score != expectedScore {
			t.Errorf("tierScores[%s] = %v, expected %v", tier, score, expectedScore)
		}
	}
}
