-- -------------------------------------------------------------------
-- Lastmile Gig Ecosystem - Orders Table + RLS
-- Phase: P075 | orders table, order_status enum, RLS
-- -------------------------------------------------------------------

-- Order status enum
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'draft',
    'placed',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'dispatched',
    'driver_assigned',
    'picked_up',
    'in_transit',
    'arriving',
    'delivered',
    'delivery_verified',
    'cancelled',
    'refunded',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Order type enum
DO $$ BEGIN
  CREATE TYPE order_type AS ENUM (
    'food_delivery',
    'grocery_delivery',
    'parcel_delivery',
    'enterprise_logistics',
    'pharmacy_delivery',
    'retail_delivery'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES users(id),
  partner_id UUID NOT NULL REFERENCES partners(id),
  driver_id UUID REFERENCES drivers(id),

  -- Order details
  order_type order_type NOT NULL DEFAULT 'food_delivery',
  status order_status NOT NULL DEFAULT 'placed',
  items JSONB NOT NULL DEFAULT '[]',
  special_instructions TEXT,
  item_count INTEGER NOT NULL DEFAULT 0,

  -- Pricing
  subtotal_zar DECIMAL(10,2) NOT NULL,
  delivery_fee_zar DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  service_fee_zar DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_zar DECIMAL(10,2) DEFAULT 0.00,
  tip_zar DECIMAL(10,2) DEFAULT 0.00,
  total_zar DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',

  -- Addresses
  pickup_address TEXT NOT NULL,
  pickup_geo GEOGRAPHY(POINT, 4326) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_geo GEOGRAPHY(POINT, 4326) NOT NULL,
  delivery_instructions TEXT,

  -- Distance and time
  estimated_distance_km DECIMAL(6,2),
  estimated_duration_min INTEGER,
  actual_distance_km DECIMAL(6,2),
  actual_duration_min INTEGER,

  -- Dispatch
  dispatched_at TIMESTAMPTZ,
  dispatch_attempts INTEGER DEFAULT 0,
  dispatch_confidence DECIMAL(5,4),

  -- Delivery verification
  delivery_photo_url TEXT,
  delivery_geo_verified BOOLEAN DEFAULT FALSE,
  delivery_signature_url TEXT,
  blockchain_tx_hash VARCHAR(66),
  blockchain_verified BOOLEAN DEFAULT FALSE,

  -- Payment
  payment_id UUID,
  payment_status VARCHAR(30) DEFAULT 'pending',
  payment_gateway VARCHAR(30),

  -- Ratings
  customer_rating DECIMAL(3,2),
  customer_review TEXT,
  driver_rating DECIMAL(3,2),
  partner_rating DECIMAL(3,2),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  cancel_reason TEXT,
  cancelled_by VARCHAR(30),

  -- Timestamps
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_total CHECK (total_zar >= 0),
  CONSTRAINT valid_customer_rating CHECK (customer_rating IS NULL OR (customer_rating >= 0 AND customer_rating <= 5)),
  CONSTRAINT valid_driver_rating CHECK (driver_rating IS NULL OR (driver_rating >= 0 AND driver_rating <= 5))
);

-- Indexes
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_partner ON orders(partner_id);
CREATE INDEX idx_orders_driver ON orders(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_type ON orders(order_type);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_placed_at ON orders(placed_at DESC);
CREATE INDEX idx_orders_active ON orders(status) WHERE status NOT IN ('delivered', 'cancelled', 'refunded', 'failed');
CREATE INDEX idx_orders_pickup_geo ON orders USING GIST(pickup_geo);
CREATE INDEX idx_orders_delivery_geo ON orders USING GIST(delivery_geo);

-- Generate order number function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT := 'LMG';
  seq_val BIGINT;
BEGIN
  seq_val := nextval('order_number_seq');
  NEW.order_number := prefix || '-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(seq_val::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE TRIGGER orders_generate_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Customers can view their own orders
CREATE POLICY orders_select_customer ON orders
  FOR SELECT USING (customer_id = auth.uid());

-- Drivers can view orders assigned to them
CREATE POLICY orders_select_driver ON orders
  FOR SELECT USING (driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- Partners can view orders for their business
CREATE POLICY orders_select_partner ON orders
  FOR SELECT USING (
    partner_id IN (SELECT id FROM partners WHERE owner_user_id = auth.uid())
  );

-- Ops can view all orders
CREATE POLICY orders_select_ops ON orders
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN', 'OPS_SENIOR', 'OPS_STAFF')
  );

-- Service role can create orders
CREATE POLICY orders_insert_service ON orders
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR customer_id = auth.uid()
  );

-- Updated_at trigger
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Realtime subscription
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

COMMENT ON TABLE orders IS 'All delivery orders with full lifecycle tracking, pricing, and verification';
