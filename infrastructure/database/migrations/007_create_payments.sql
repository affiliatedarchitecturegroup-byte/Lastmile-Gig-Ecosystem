-- Migration 007: Payments & SLA Contracts Tables
-- @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2

-- Payments table
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES orders(id),
  amount          DECIMAL(10,2),
  currency        TEXT DEFAULT 'ZAR',
  gateway         payment_gateway,
  gateway_ref     TEXT,
  status          payment_status DEFAULT 'pending',
  payout_type     payout_type,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway ON payments(gateway);
CREATE INDEX idx_payments_created_at ON payments(created_at);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- SLA Contracts table
CREATE TABLE sla_contracts (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id                  UUID REFERENCES partners(id),
  delivery_target_minutes     INTEGER,
  breach_penalty_zar          DECIMAL(10,2),
  perfect_week_bonus_zar      DECIMAL(10,2),
  contract_start              DATE,
  contract_end                DATE,
  blockchain_address          TEXT,
  active                      BOOLEAN DEFAULT TRUE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sla_partner ON sla_contracts(partner_id);
CREATE INDEX idx_sla_active ON sla_contracts(active);

CREATE TRIGGER tr_sla_contracts_updated_at
  BEFORE UPDATE ON sla_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE sla_contracts ENABLE ROW LEVEL SECURITY;
