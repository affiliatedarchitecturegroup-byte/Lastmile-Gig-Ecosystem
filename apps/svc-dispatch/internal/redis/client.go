// Package redis provides Redis client and driver pool operations.
//
// Uses Upstash Redis for real-time driver availability state.
// All keys use the lmg:dispatch: namespace prefix.
package redis

import (
	"context"

	goredis "github.com/redis/go-redis/v9"
)

// NewClient creates a new Redis client from the given URL.
func NewClient(redisURL string) *goredis.Client {
	opts, err := goredis.ParseURL(redisURL)
	if err != nil {
		opts = &goredis.Options{
			Addr: redisURL,
		}
	}

	return goredis.NewClient(opts)
}
