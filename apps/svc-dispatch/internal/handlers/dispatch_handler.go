// Package handlers provides HTTP handlers for the Dispatch Engine REST API.
//
// Endpoints:
//   - GET  /health              Health check
//   - GET  /ready               Readiness probe
//   - GET  /v1/dispatch/pool/:zone  Get driver pool size for a zone
//   - POST /v1/dispatch/manual      Manually trigger dispatch for an order
//
// See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.5
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/internal/dispatch"
	dispatchkafka "github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/internal/kafka"
	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/internal/redis"
	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/pkg/models"
)

// DispatchHandler handles HTTP requests for the dispatch engine.
type DispatchHandler struct {
	engine     *dispatch.Engine
	driverPool *redis.DriverPool
	producer   *dispatchkafka.Producer
	logger     *zap.SugaredLogger
}

// NewDispatchHandler creates a new DispatchHandler.
func NewDispatchHandler(
	engine *dispatch.Engine,
	driverPool *redis.DriverPool,
	producer *dispatchkafka.Producer,
	logger *zap.SugaredLogger,
) *DispatchHandler {
	return &DispatchHandler{
		engine:     engine,
		driverPool: driverPool,
		producer:   producer,
		logger:     logger,
	}
}

// RegisterRoutes registers all dispatch engine HTTP routes.
func (h *DispatchHandler) RegisterRoutes(router *gin.Engine) {
	router.GET("/health", h.healthCheck)
	router.GET("/ready", h.readinessCheck)

	v1 := router.Group("/v1/dispatch")
	{
		v1.GET("/pool/:zone", h.getPoolSize)
		v1.POST("/manual", h.manualDispatch)
		v1.POST("/pool/register", h.registerDriver)
		v1.DELETE("/pool/:zone/:driverId", h.removeDriver)
	}
}

// healthCheck returns the service health status.
func (h *DispatchHandler) healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "svc-dispatch",
		"version": "0.1.0",
	})
}

// readinessCheck verifies the service is ready to accept traffic.
func (h *DispatchHandler) readinessCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ready",
	})
}

// getPoolSize returns the number of available drivers in a zone.
func (h *DispatchHandler) getPoolSize(c *gin.Context) {
	zone := c.Param("zone")

	size, err := h.driverPool.GetPoolSize(c.Request.Context(), zone)
	if err != nil {
		h.logger.Errorf("Failed to get pool size for zone %s: %v", zone, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query driver pool"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"zone":           zone,
		"availableDrivers": size,
	})
}

// manualDispatch allows ops staff to manually trigger dispatch for an order.
// Used when automatic dispatch fails or for testing.
func (h *DispatchHandler) manualDispatch(c *gin.Context) {
	var req models.OrderPlacedPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	decision, err := h.engine.MatchDriver(c.Request.Context(), req)
	if err != nil {
		h.logger.Errorf("Manual dispatch failed for order %s: %v", req.OrderID, err)
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":   "Dispatch matching failed",
			"detail":  err.Error(),
			"orderId": req.OrderID,
		})
		return
	}

	// Publish dispatch event
	h.producer.PublishOrderDispatched(models.DispatchedPayload{
		OrderID:      decision.OrderID,
		DriverID:     decision.SelectedDriverID,
		EstimatedMin: decision.RouteEstimate.EstimatedMin,
		RouteDistKm:  decision.RouteEstimate.DistanceKm,
	})

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"decision": decision,
	})
}

// registerDriver registers a driver in the availability pool.
func (h *DispatchHandler) registerDriver(c *gin.Context) {
	var driver models.DriverCandidate
	if err := c.ShouldBindJSON(&driver); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.driverPool.RegisterDriver(c.Request.Context(), driver); err != nil {
		h.logger.Errorf("Failed to register driver %s: %v", driver.DriverID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register driver"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"driverId": driver.DriverID,
		"zone":     driver.Zone,
	})
}

// removeDriver removes a driver from the availability pool.
func (h *DispatchHandler) removeDriver(c *gin.Context) {
	zone := c.Param("zone")
	driverID := c.Param("driverId")

	if err := h.driverPool.RemoveDriver(c.Request.Context(), driverID, zone); err != nil {
		h.logger.Errorf("Failed to remove driver %s: %v", driverID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove driver"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"driverId": driverID,
		"zone":     zone,
	})
}
