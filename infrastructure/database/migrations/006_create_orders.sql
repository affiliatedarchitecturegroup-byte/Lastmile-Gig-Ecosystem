-- Migration 006: Orders Table
-- @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2

CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID REFERENCES users(id),
  partner_id          UUID REFERENCES partners(id),
  driver_id           UUID REFERENCES drivers(id),
  status              order_status DEFAULT 'placed',
  items               JSONB,
  subtotal            DECIMAL(10,2),
  delivery_fee        DECIMAL(10,2),
  total               DECIMAL(10,2),
  payment_method      TEXT,
  payment_ref         TEXT,
  delivery_address    JSONB,
  placed_at           TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at        TIMESTAMPTZ,
  dispatched_at       TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  delivery_photo_hash TEXT,
  blockchain_tx       TEXT,
  cancelled_at        TIMESTAMPTZ,
  cancel_reason       TEXT
);

-- Indexes
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_partner ON orders(partner_id);
CREATE INDEX idx_orders_driver ON orders(driver_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_placed_at ON orders(placed_at);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Customers can only read their own orders
CREATE POLICY "customer_own_orders" ON orders
  FOR SELECT USING (customer_id = auth.uid());

-- Drivers can only see orders assigned to them
CREATE POLICY "driver_assigned_orders" ON orders
  FOR SELECT USING (driver_id = auth.uid());

-- Partners can only see orders from their restaurant
CREATE POLICY "partner_own_orders" ON orders
  FOR SELECT USING (
    partner_id IN (
      SELECT id FROM partners WHERE contact_email = (
        SELECT email FROM users WHERE id = auth.uid()
      )
    )
  );
