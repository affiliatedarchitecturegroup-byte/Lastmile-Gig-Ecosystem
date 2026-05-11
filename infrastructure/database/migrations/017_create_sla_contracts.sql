-- -------------------------------------------------------------------
-- Lastmile Gig Ecosystem - SLA Contracts Table
-- Phase: P077 | sla_contracts table
-- -------------------------------------------------------------------

-- SLA status enum
DO $$ BEGIN
  CREATE TYPE sla_status AS ENUM (
    'draft',
    'active',
    'breached',
    'expired',
    'terminated'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- SLA contracts table
CREATE TABLE IF NOT EXISTS sla_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id),

  -- SLA details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status sla_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,

  -- Metrics thresholds
  max_delivery_time_minutes INTEGER NOT NULL DEFAULT 45,
  max_preparation_time_minutes INTEGER NOT NULL DEFAULT 20,
  min_acceptance_rate DECIMAL(5,2) NOT NULL DEFAULT 90.00,
  max_cancellation_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  min_rating DECIMAL(3,2) NOT NULL DEFAULT 4.00,
  uptime_sla_percent DECIMAL(5,2) NOT NULL DEFAULT 99.50,

  -- Financial terms
  penalty_per_breach_zar DECIMAL(10,2) DEFAULT 0.00,
  max_monthly_penalty_zar DECIMAL(10,2) DEFAULT 0.00,
  bonus_per_exceed_zar DECIMAL(10,2) DEFAULT 0.00,

  -- Blockchain reference
  blockchain_contract_address VARCHAR(42),
  blockchain_tx_hash VARCHAR(66),

  -- Breach tracking
  total_breaches INTEGER DEFAULT 0,
  last_breach_at TIMESTAMPTZ,
  consecutive_breach_count INTEGER DEFAULT 0,

  -- Period
  effective_from DATE NOT NULL,
  effective_to DATE,
  review_date DATE,

  -- Metadata
  terms_document_url TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_delivery_time CHECK (max_delivery_time_minutes > 0),
  CONSTRAINT valid_acceptance_rate CHECK (min_acceptance_rate >= 0 AND min_acceptance_rate <= 100),
  CONSTRAINT valid_uptime CHECK (uptime_sla_percent >= 0 AND uptime_sla_percent <= 100)
);

-- Indexes
CREATE INDEX idx_sla_partner ON sla_contracts(partner_id);
CREATE INDEX idx_sla_status ON sla_contracts(status);
CREATE INDEX idx_sla_active ON sla_contracts(partner_id, status) WHERE status = 'active';

-- Updated_at trigger
CREATE TRIGGER sla_contracts_updated_at
  BEFORE UPDATE ON sla_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE sla_contracts IS 'Service Level Agreements between platform and partners with blockchain enforcement';
