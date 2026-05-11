-- -------------------------------------------------------------------
-- Lastmile Gig Ecosystem - Payments Table
-- Phase: P076 | payments table, gateway enum
-- -------------------------------------------------------------------

-- Payment gateway enum
DO $$ BEGIN
  CREATE TYPE payment_gateway AS ENUM (
    'paystack',
    'ozow',
    'stripe',
    'peach_payments',
    'flutterwave'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment status enum
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'cancelled',
    'refunded',
    'partially_refunded',
    'disputed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment type enum
DO $$ BEGIN
  CREATE TYPE payment_type AS ENUM (
    'order_payment',
    'driver_payout',
    'partner_settlement',
    'refund',
    'subscription',
    'deposit',
    'penalty'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  payer_user_id UUID REFERENCES users(id),
  payee_user_id UUID REFERENCES users(id),

  -- Payment details
  payment_type payment_type NOT NULL,
  gateway payment_gateway NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  amount_zar DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',

  -- Commission and fees
  platform_fee_zar DECIMAL(10,2) DEFAULT 0.00,
  gateway_fee_zar DECIMAL(10,2) DEFAULT 0.00,
  commission_zar DECIMAL(10,2) DEFAULT 0.00,
  net_amount_zar DECIMAL(12,2) NOT NULL,

  -- Gateway references
  gateway_reference VARCHAR(255),
  gateway_transaction_id VARCHAR(255),
  gateway_authorization_code VARCHAR(100),
  gateway_response JSONB DEFAULT '{}',

  -- Webhook
  webhook_received_at TIMESTAMPTZ,
  webhook_payload JSONB DEFAULT '{}',
  webhook_verified BOOLEAN DEFAULT FALSE,

  -- Refund tracking
  refund_amount_zar DECIMAL(12,2) DEFAULT 0.00,
  refund_reason TEXT,
  refund_gateway_reference VARCHAR(255),

  -- Invoice
  invoice_number VARCHAR(50),
  invoice_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  idempotency_key VARCHAR(100) UNIQUE,

  -- Timestamps
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_payment_amount CHECK (amount_zar > 0),
  CONSTRAINT valid_net_amount CHECK (net_amount_zar >= 0)
);

-- Indexes
CREATE INDEX idx_payments_order ON payments(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_payments_payer ON payments(payer_user_id);
CREATE INDEX idx_payments_payee ON payments(payee_user_id) WHERE payee_user_id IS NOT NULL;
CREATE INDEX idx_payments_gateway ON payments(gateway);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_type ON payments(payment_type);
CREATE INDEX idx_payments_reference ON payments(gateway_reference) WHERE gateway_reference IS NOT NULL;
CREATE INDEX idx_payments_idempotency ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_payments_initiated ON payments(initiated_at DESC);

-- Updated_at trigger
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE payments IS 'All financial transactions across payment gateways with full audit trail';
