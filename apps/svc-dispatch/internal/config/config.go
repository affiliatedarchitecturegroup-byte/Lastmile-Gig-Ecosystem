// Package config provides configuration loading for the Dispatch Engine.
//
// All configuration values use the LMG_ prefix and are loaded from
// environment variables per DEVELOPMENT_DIRECTIVES.md Section 10.
package config

import (
	"os"
	"strconv"
)

// Config holds all configuration values for the Dispatch Engine.
type Config struct {
	// Port is the HTTP server port (default: 4000)
	Port int

	// Environment is the deployment environment (development, staging, production)
	Environment string

	// RedisURL is the Upstash Redis connection string
	RedisURL string

	// KafkaBrokers is a comma-separated list of Kafka broker addresses
	KafkaBrokers string

	// KafkaGroupID is the consumer group ID for this service
	KafkaGroupID string

	// AIServiceURL is the gRPC endpoint for the AI inference service
	AIServiceURL string

	// DispatchTimeoutMs is the maximum time allowed for a dispatch decision
	DispatchTimeoutMs int

	// MaxCandidateDrivers is the maximum number of candidate drivers to evaluate
	MaxCandidateDrivers int

	// HITLConfidenceThreshold is the minimum confidence score to auto-dispatch
	// Below this threshold, decisions are routed to the Command Centre HITL gate
	HITLConfidenceThreshold float64
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:                    getEnvInt("LMG_PORT_DISPATCH_SERVICE", 4000),
		Environment:             getEnv("LMG_ENVIRONMENT", "development"),
		RedisURL:                getEnv("LMG_UPSTASH_REDIS_URL", "redis://localhost:6379"),
		KafkaBrokers:            getEnv("LMG_KAFKA_BROKERS", "localhost:9092"),
		KafkaGroupID:            getEnv("LMG_KAFKA_GROUP_DISPATCH", "svc-dispatch"),
		AIServiceURL:            getEnv("LMG_AI_SERVICE_GRPC_URL", "localhost:8000"),
		DispatchTimeoutMs:       getEnvInt("LMG_DISPATCH_TIMEOUT_MS", 800),
		MaxCandidateDrivers:     getEnvInt("LMG_MAX_CANDIDATE_DRIVERS", 10),
		HITLConfidenceThreshold: getEnvFloat("LMG_HITL_CONFIDENCE_THRESHOLD", 0.7),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value, exists := os.LookupEnv(key); exists {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	if value, exists := os.LookupEnv(key); exists {
		if parsed, err := strconv.ParseFloat(value, 64); err == nil {
			return parsed
		}
	}
	return fallback
}
