-- -------------------------------------------------------------------
-- Lastmile Gig Ecosystem - Database Functions & Triggers
-- Phase: P087, P089 | Functions, triggers, full-text search indexes
-- -------------------------------------------------------------------

-- ============================================================
-- P087: Updated_at trigger function (re-declaration safe)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- P087: Soft delete function
-- ============================================================
CREATE OR REPLACE FUNCTION perform_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Instead of deleting, set deleted_at and is_active
  IF TG_OP = 'DELETE' THEN
    UPDATE users SET deleted_at = NOW(), is_active = FALSE WHERE id = OLD.id;
    RETURN NULL; -- Prevent actual delete
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Apply soft delete trigger to users table
DROP TRIGGER IF EXISTS users_soft_delete ON users;
CREATE TRIGGER users_soft_delete
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION perform_soft_delete();

-- ============================================================
-- Utility: Calculate distance between two geo points (km)
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN ST_DistanceSphere(
    ST_MakePoint(lon1, lat1),
    ST_MakePoint(lon2, lat2)
  ) / 1000.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- Utility: Verify delivery geo-tag within radius
-- ============================================================
CREATE OR REPLACE FUNCTION verify_delivery_geo(
  p_order_id UUID,
  p_delivery_lat DOUBLE PRECISION,
  p_delivery_lon DOUBLE PRECISION,
  p_max_distance_meters DOUBLE PRECISION DEFAULT 100.0
) RETURNS BOOLEAN AS $$
DECLARE
  v_order_geo GEOGRAPHY;
  v_delivery_geo GEOGRAPHY;
  v_distance DOUBLE PRECISION;
BEGIN
  SELECT delivery_geo INTO v_order_geo FROM orders WHERE id = p_order_id;

  IF v_order_geo IS NULL THEN
    RETURN FALSE;
  END IF;

  v_delivery_geo := ST_SetSRID(ST_MakePoint(p_delivery_lon, p_delivery_lat), 4326)::GEOGRAPHY;
  v_distance := ST_Distance(v_order_geo, v_delivery_geo);

  -- Update order with verification result
  UPDATE orders SET
    delivery_geo_verified = (v_distance <= p_max_distance_meters),
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN v_distance <= p_max_distance_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Utility: Get available drivers in zone within radius
-- ============================================================
CREATE OR REPLACE FUNCTION get_available_drivers(
  p_pickup_lat DOUBLE PRECISION,
  p_pickup_lon DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 10.0,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  driver_id UUID,
  user_id UUID,
  first_name VARCHAR,
  performance_score DECIMAL,
  tier driver_tier,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS driver_id,
    d.user_id,
    u.first_name,
    d.performance_score,
    d.tier,
    ST_Distance(
      d.current_location,
      ST_SetSRID(ST_MakePoint(p_pickup_lon, p_pickup_lat), 4326)::GEOGRAPHY
    ) / 1000.0 AS distance_km
  FROM drivers d
  JOIN users u ON u.id = d.user_id
  WHERE d.status = 'active'
    AND d.current_location IS NOT NULL
    AND ST_DWithin(
      d.current_location,
      ST_SetSRID(ST_MakePoint(p_pickup_lon, p_pickup_lat), 4326)::GEOGRAPHY,
      p_radius_km * 1000
    )
  ORDER BY d.performance_score DESC, distance_km ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- P089: Full-Text Search Indexes (pg_trgm)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Partners trigram search index
CREATE INDEX IF NOT EXISTS idx_partners_trgm_name ON partners
  USING GIN(business_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_partners_trgm_trading ON partners
  USING GIN(trading_name gin_trgm_ops)
  WHERE trading_name IS NOT NULL;

-- Orders search index
CREATE INDEX IF NOT EXISTS idx_orders_trgm_number ON orders
  USING GIN(order_number gin_trgm_ops);

-- Drivers search (via users join)
CREATE INDEX IF NOT EXISTS idx_users_trgm_name ON users
  USING GIN((first_name || ' ' || last_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_trgm_email ON users
  USING GIN(email gin_trgm_ops);

-- ============================================================
-- Utility: Fuzzy search partners
-- ============================================================
CREATE OR REPLACE FUNCTION search_partners(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  partner_id UUID,
  business_name VARCHAR,
  slug VARCHAR,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS partner_id,
    p.business_name,
    p.slug,
    similarity(p.business_name, p_query) AS similarity_score
  FROM partners p
  WHERE p.status = 'active'
    AND p.deleted_at IS NULL
    AND (
      p.business_name % p_query
      OR p.trading_name % p_query
      OR p_query = ANY(p.cuisine_types)
    )
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_delivery_geo IS 'Verify delivery photo geo-tag is within acceptable distance of order delivery address';
COMMENT ON FUNCTION get_available_drivers IS 'Find available drivers within radius of a pickup location, sorted by performance';
COMMENT ON FUNCTION search_partners IS 'Fuzzy text search for active restaurant partners';
