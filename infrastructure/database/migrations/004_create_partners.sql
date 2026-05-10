-- Migration 004: Partners (Restaurants/Corporate) Table
-- @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2

CREATE TABLE partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  type            partner_type,
  cipc_number     TEXT,
  vat_number      TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  address         JSONB,
  bank_details    JSONB,
  status          partner_status DEFAULT 'pending',
  sla_contract_id TEXT,
  logo_url        TEXT,
  cover_image_url TEXT,
  cuisine         TEXT[],
  delivery_radius DECIMAL(5,2),
  minimum_order   DECIMAL(10,2),
  avg_delivery_time INTEGER,
  rating          DECIMAL(3,2) DEFAULT 0.0,
  is_active       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_partners_slug ON partners(slug);
CREATE INDEX idx_partners_type ON partners(type);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_name_trgm ON partners USING gin(name gin_trgm_ops);

-- Trigger
CREATE TRIGGER tr_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Partners can read their own record
CREATE POLICY "partners_read_own" ON partners
  FOR SELECT USING (
    contact_email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Public can read active partners (for storefront directory)
CREATE POLICY "public_read_active_partners" ON partners
  FOR SELECT USING (status = 'active' AND is_active = TRUE);
