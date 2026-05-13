// Package redis provides the driver pool backed by Upstash Redis.
//
// The driver pool maintains real-time availability of drivers per zone.
// Drivers are stored as Redis sorted sets keyed by zone with their
// performance score as the sort value.
//
// Key namespace: lmg:dispatch:pool:{zone}
// Lock namespace: lmg:dispatch:lock:{orderId}
//
// See: docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.5
package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem/apps/svc-dispatch/pkg/models"
)

const (
	// poolKeyPrefix is the Redis key prefix for driver pool sorted sets
	poolKeyPrefix = "lmg:dispatch:pool:"

	// driverDataPrefix is the Redis key prefix for driver metadata hashes
	driverDataPrefix = "lmg:dispatch:driver:"

	// lockKeyPrefix is the Redis key prefix for dispatch locks
	lockKeyPrefix = "lmg:dispatch:lock:"

	// lockTTL is the TTL for dispatch locks to prevent double-dispatch
	lockTTL = 30 * time.Second

	// driverTTL is the TTL for driver availability entries (auto-expire offline)
	driverTTL = 5 * time.Minute
)

// DriverPool manages the real-time driver availability pool in Redis.
type DriverPool struct {
	client *goredis.Client
	logger *zap.SugaredLogger
}

// NewDriverPool creates a new DriverPool backed by the given Redis client.
func NewDriverPool(client *goredis.Client, logger *zap.SugaredLogger) *DriverPool {
	return &DriverPool{
		client: client,
		logger: logger,
	}
}

// Close closes the underlying Redis client.
func (dp *DriverPool) Close() error {
	return dp.client.Close()
}

// RegisterDriver adds or updates a driver in the availability pool for their zone.
func (dp *DriverPool) RegisterDriver(ctx context.Context, driver models.DriverCandidate) error {
	poolKey := poolKeyPrefix + driver.Zone

	// Add to zone sorted set with rating as score
	err := dp.client.ZAdd(ctx, poolKey, goredis.Z{
		Score:  driver.Rating,
		Member: driver.DriverID,
	}).Err()
	if err != nil {
		return fmt.Errorf("failed to register driver %s in pool: %w", driver.DriverID, err)
	}

	// Store driver metadata as a JSON hash
	driverData, _ := json.Marshal(driver)
	driverKey := driverDataPrefix + driver.DriverID
	err = dp.client.Set(ctx, driverKey, driverData, driverTTL).Err()
	if err != nil {
		return fmt.Errorf("failed to store driver data %s: %w", driver.DriverID, err)
	}

	dp.logger.Debugf("Registered driver %s in zone %s pool", driver.DriverID, driver.Zone)
	return nil
}

// RemoveDriver removes a driver from the availability pool.
func (dp *DriverPool) RemoveDriver(ctx context.Context, driverID string, zone string) error {
	poolKey := poolKeyPrefix + zone
	err := dp.client.ZRem(ctx, poolKey, driverID).Err()
	if err != nil {
		return fmt.Errorf("failed to remove driver %s from pool: %w", driverID, err)
	}

	dp.client.Del(ctx, driverDataPrefix+driverID)
	dp.logger.Debugf("Removed driver %s from zone %s pool", driverID, zone)
	return nil
}

// GetAvailableDrivers returns up to `limit` available drivers in the given zone,
// sorted by their performance rating (highest first).
func (dp *DriverPool) GetAvailableDrivers(ctx context.Context, zone string, limit int) ([]models.DriverCandidate, error) {
	poolKey := poolKeyPrefix + zone

	// Get top-rated drivers from sorted set (highest score first)
	driverIDs, err := dp.client.ZRevRangeByScore(ctx, poolKey, &goredis.ZRangeBy{
		Min:    "-inf",
		Max:    "+inf",
		Offset: 0,
		Count:  int64(limit),
	}).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to query driver pool for zone %s: %w", zone, err)
	}

	candidates := make([]models.DriverCandidate, 0, len(driverIDs))
	for _, driverID := range driverIDs {
		driverKey := driverDataPrefix + driverID
		data, err := dp.client.Get(ctx, driverKey).Bytes()
		if err != nil {
			dp.logger.Warnf("Driver %s in pool but no metadata found, skipping", driverID)
			continue
		}

		var candidate models.DriverCandidate
		if err := json.Unmarshal(data, &candidate); err != nil {
			dp.logger.Warnf("Failed to unmarshal driver %s data, skipping", driverID)
			continue
		}

		candidates = append(candidates, candidate)
	}

	dp.logger.Infof("Found %d available drivers in zone %s", len(candidates), zone)
	return candidates, nil
}

// GetPoolSize returns the number of available drivers in a zone.
func (dp *DriverPool) GetPoolSize(ctx context.Context, zone string) (int64, error) {
	poolKey := poolKeyPrefix + zone
	return dp.client.ZCard(ctx, poolKey).Result()
}

// AcquireDispatchLock attempts to acquire a distributed lock for an order dispatch.
// Returns true if the lock was acquired, false if another worker already has it.
// This prevents double-dispatch of the same order.
func (dp *DriverPool) AcquireDispatchLock(ctx context.Context, orderID string) (bool, error) {
	lockKey := lockKeyPrefix + orderID
	acquired, err := dp.client.SetNX(ctx, lockKey, "locked", lockTTL).Result()
	if err != nil {
		return false, fmt.Errorf("failed to acquire dispatch lock for order %s: %w", orderID, err)
	}

	if acquired {
		dp.logger.Debugf("Acquired dispatch lock for order %s", orderID)
	} else {
		dp.logger.Warnf("Dispatch lock already held for order %s", orderID)
	}

	return acquired, nil
}

// ReleaseDispatchLock releases the dispatch lock for an order.
func (dp *DriverPool) ReleaseDispatchLock(ctx context.Context, orderID string) error {
	lockKey := lockKeyPrefix + orderID
	return dp.client.Del(ctx, lockKey).Err()
}
