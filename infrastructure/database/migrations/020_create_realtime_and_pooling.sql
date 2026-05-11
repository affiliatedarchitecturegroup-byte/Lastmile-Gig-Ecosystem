-- -------------------------------------------------------------------
-- Lastmile Gig Ecosystem - Realtime Subscriptions & Connection Pooling
-- Phase: P079, P090 | Realtime on orders/drivers, connection pool config
-- -------------------------------------------------------------------

-- ============================================================
-- P079: Enable Supabase Realtime on key tables
-- ============================================================

-- Enable realtime for orders table (customer order tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Enable realtime for drivers table (ops dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;

-- Note: Realtime filters are applied client-side via Supabase SDK
-- Example client usage:
-- supabase.channel('orders')
--   .on('postgres_changes', {
--     event: 'UPDATE',
--     schema: 'public',
--     table: 'orders',
--     filter: 'id=eq.{order_id}'
--   }, callback)
--   .subscribe()

-- ============================================================
-- P090: Connection Pooling Configuration
-- ============================================================

-- PgBouncer configuration is handled at the Supabase/infrastructure level.
-- This migration documents the expected configuration and creates
-- monitoring views for connection pool health.

-- Connection pool monitoring view
CREATE OR REPLACE VIEW connection_pool_stats AS
SELECT
  datname AS database_name,
  numbackends AS active_connections,
  xact_commit AS transactions_committed,
  xact_rollback AS transactions_rolled_back,
  blks_read AS blocks_read,
  blks_hit AS blocks_hit,
  tup_returned AS rows_returned,
  tup_fetched AS rows_fetched,
  tup_inserted AS rows_inserted,
  tup_updated AS rows_updated,
  tup_deleted AS rows_deleted,
  conflicts,
  deadlocks,
  CASE WHEN blks_read > 0
    THEN ROUND(100.0 * blks_hit / (blks_hit + blks_read), 2)
    ELSE 100
  END AS cache_hit_ratio
FROM pg_stat_database
WHERE datname = current_database();

-- Active connections monitoring
CREATE OR REPLACE VIEW active_connections AS
SELECT
  pid,
  usename AS username,
  application_name,
  client_addr AS client_ip,
  state,
  query_start,
  NOW() - query_start AS query_duration,
  wait_event_type,
  wait_event,
  LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid != pg_backend_pid()
ORDER BY query_start DESC;

-- Long-running query alert function
CREATE OR REPLACE FUNCTION check_long_queries(
  p_threshold_seconds INTEGER DEFAULT 30
) RETURNS TABLE (
  pid INTEGER,
  username TEXT,
  duration INTERVAL,
  query_preview TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.pid,
    a.usename::TEXT,
    NOW() - a.query_start AS duration,
    LEFT(a.query, 200)::TEXT AS query_preview
  FROM pg_stat_activity a
  WHERE a.datname = current_database()
    AND a.state = 'active'
    AND a.pid != pg_backend_pid()
    AND NOW() - a.query_start > (p_threshold_seconds || ' seconds')::INTERVAL
  ORDER BY a.query_start ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PgBouncer Configuration Reference
-- ============================================================
-- Applied via infrastructure/pgbouncer/pgbouncer.ini
-- Documented here for developer reference:
--
-- [pgbouncer]
-- pool_mode = transaction          ; Release connection after each transaction
-- default_pool_size = 25           ; Per-database pool size
-- max_client_conn = 200            ; Total client connections
-- max_db_connections = 50          ; Max connections to actual database
-- reserve_pool_size = 5            ; Extra connections for burst
-- reserve_pool_timeout = 3         ; Wait time for reserve pool
-- server_idle_timeout = 300        ; Close idle server connections after 5min
-- server_lifetime = 3600           ; Reconnect server connections after 1h
-- query_timeout = 30               ; Kill queries running > 30s
-- client_idle_timeout = 600        ; Close idle clients after 10min
--
-- Per-service pool limits:
-- api-gateway:      pool_size=10
-- svc-auth:         pool_size=5
-- svc-orders:       pool_size=15
-- svc-drivers:      pool_size=10
-- svc-fleet:        pool_size=5
-- svc-storefronts:  pool_size=10
-- svc-payments:     pool_size=8
-- svc-analytics:    pool_size=5

COMMENT ON VIEW connection_pool_stats IS 'Database connection and performance statistics for monitoring';
COMMENT ON VIEW active_connections IS 'Currently active database connections with query details';
COMMENT ON FUNCTION check_long_queries IS 'Find queries running longer than the specified threshold';
