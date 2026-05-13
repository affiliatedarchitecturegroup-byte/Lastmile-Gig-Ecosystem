// Package main is the entry point for the Dispatch Engine service.
//
// The Dispatch Engine is a high-throughput Go service that matches
// incoming orders to optimal available drivers using a goroutine pool
// per region, Redis state, and Kafka event consumption.
//
// Architecture:
//   - Gin HTTP server for REST endpoints
//   - Kafka consumer for order.placed events
//   - Redis for real-time driver pool state
//   - gRPC client for AI route optimisation
//   - Goroutine pool per region (KZN, Gauteng, WC)
//
// SLA: < 800ms from order.placed to dispatch decision
//
// See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.5
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/internal/config"
	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/internal/dispatch"
	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/internal/handlers"
	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/internal/kafka"
	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/internal/redis"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	// Initialise structured logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()
	sugar := logger.Sugar()

	sugar.Info("Starting Dispatch Engine service")

	// Load configuration
	cfg := config.Load()

	// Initialise Redis client for driver pool state
	redisClient := redis.NewClient(cfg.RedisURL)
	defer redisClient.Close()

	// Initialise driver pool with Redis backend
	driverPool := redis.NewDriverPool(redisClient, sugar)

	// Initialise dispatch engine with scoring algorithm
	engine := dispatch.NewEngine(driverPool, sugar, cfg)

	// Initialise Kafka producer for dispatch events
	kafkaProducer, err := kafka.NewProducer(cfg.KafkaBrokers, sugar)
	if err != nil {
		sugar.Fatalf("Failed to create Kafka producer: %v", err)
	}
	defer kafkaProducer.Close()

	// Initialise Kafka consumer for order.placed events
	kafkaConsumer, err := kafka.NewConsumer(cfg.KafkaBrokers, cfg.KafkaGroupID, sugar)
	if err != nil {
		sugar.Fatalf("Failed to create Kafka consumer: %v", err)
	}
	defer kafkaConsumer.Close()

	// Start Kafka consumer in background goroutine
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go kafkaConsumer.ConsumeOrderPlaced(ctx, engine, kafkaProducer)

	// Configure Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())

	// Register HTTP handlers
	dispatchHandler := handlers.NewDispatchHandler(engine, driverPool, kafkaProducer, sugar)
	dispatchHandler.RegisterRoutes(router)

	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		sugar.Infof("Dispatch Engine listening on port %d", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			sugar.Fatalf("Server failed: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	sugar.Info("Shutting down Dispatch Engine...")
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		sugar.Fatalf("Server forced to shutdown: %v", err)
	}

	sugar.Info("Dispatch Engine stopped")
}
