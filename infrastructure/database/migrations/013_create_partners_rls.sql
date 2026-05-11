-- -------------------------------------------------------------------
-- Lastmile Gig Ecosystem - Partners Table + RLS
-- Phase: P073 | partners table, partner_type enum, RLS
-- -------------------------------------------------------------------

-- Partner type enum
DO $$ BEGIN
  CREATE TYPE partner_type AS ENUM (
    'restaurant',
    'grocery',
    'pharmacy',
    'retail',
    'logistics',
    'corporate'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Partner status enum
DO $$ BEGIN
  CREATE TYPE partner_status AS ENUM (
    'pending_approval',
    'document_review',
    'onboarding',
    'active',
    'suspended',
    'deactivated'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Partners table
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id),

  -- Business info
  business_name VARCHAR(255) NOT NULL,
  trading_name VARCHAR(255),
  partner_type partner_type NOT NULL,
  status partner_status NOT NULL DEFAULT 'pending_approval',

  -- Registration
  registration_number VARCHAR(50),
  vat_number VARCHAR(20),
  bee_level INTEGER,

  -- Contact
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  website_url TEXT,

  -- Address
  address_line_1 VARCHAR(255) NOT NULL,
  address_line_2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10),
  country VARCHAR(2) DEFAULT 'ZA',
  geo_location GEOGRAPHY(POINT, 4326),

  -- Storefront
  slug VARCHAR(100) UNIQUE,
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  cuisine_types TEXT[] DEFAULT '{}',
  operating_hours JSONB DEFAULT '{}',
  delivery_radius_km DECIMAL(5,2) DEFAULT 10.00,
  avg_preparation_time_min INTEGER DEFAULT 30,
  minimum_order_zar DECIMAL(8,2) DEFAULT 50.00,

  -- Financial
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1500,
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(30),
  bank_branch_code VARCHAR(10),
  paystack_subaccount_code VARCHAR(100),

  -- Metrics
  total_orders INTEGER DEFAULT 0,
  total_revenue_zar DECIMAL(14,2) DEFAULT 0.00,
  avg_rating DECIMAL(3,2) DEFAULT 0.00,
  total_ratings INTEGER DEFAULT 0,

  -- Sanity CMS reference
  sanity_restaurant_id VARCHAR(100),

  -- Timestamps
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_commission CHECK (commission_rate >= 0 AND commission_rate <= 1),
  CONSTRAINT valid_partner_rating CHECK (avg_rating >= 0 AND avg_rating <= 5)
);

-- Indexes
CREATE INDEX idx_partners_type ON partners(partner_type);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_slug ON partners(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_partners_owner ON partners(owner_user_id);
CREATE INDEX idx_partners_location ON partners USING GIST(geo_location);
CREATE INDEX idx_partners_active ON partners(status) WHERE status = 'active';
CREATE INDEX idx_partners_cuisine ON partners USING GIN(cuisine_types);

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Partners can view their own record
CREATE POLICY partners_select_own ON partners
  FOR SELECT USING (owner_user_id = auth.uid());

-- Partners can update their own record
CREATE POLICY partners_update_own ON partners
  FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Public can view active partners (for storefront directory)
CREATE POLICY partners_select_public ON partners
  FOR SELECT USING (status = 'active' AND deleted_at IS NULL);

-- Admin can view and manage all partners
CREATE POLICY partners_select_admin ON partners
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN', 'OPS_SENIOR')
  );

CREATE POLICY partners_insert_admin ON partners
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN')
    OR auth.role() = 'service_role'
  );

-- Updated_at trigger
CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE partners IS 'Restaurant and business partner profiles with storefront configuration';
