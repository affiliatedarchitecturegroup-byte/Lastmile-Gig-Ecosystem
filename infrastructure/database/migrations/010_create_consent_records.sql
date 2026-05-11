-- -------------------------------------------------------------------
-- Lastmile Gig Ecosystem - POPIA Consent Management Schema
-- Phase: P066 | consent_records table, consent_type enum
-- -------------------------------------------------------------------

-- Consent type enum
CREATE TYPE consent_type AS ENUM (
  'personal_data_collection',
  'biometric_processing',
  'location_tracking',
  'marketing_communications',
  'third_party_sharing',
  'analytics_processing',
  'payment_processing',
  'delivery_verification',
  'driver_background_check',
  'partner_data_sharing',
  'cookie_tracking',
  'push_notifications'
);

-- Consent status enum
CREATE TYPE consent_status AS ENUM (
  'granted',
  'denied',
  'withdrawn',
  'expired'
);

-- Consent records table
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type consent_type NOT NULL,
  status consent_status NOT NULL DEFAULT 'granted',

  -- POPIA required fields
  purpose TEXT NOT NULL,
  plain_language_description TEXT NOT NULL,
  data_categories TEXT[] NOT NULL DEFAULT '{}',
  processing_activities TEXT[] NOT NULL DEFAULT '{}',
  third_parties TEXT[] DEFAULT '{}',
  retention_period_days INTEGER NOT NULL DEFAULT 365,

  -- Consent metadata
  ip_address INET,
  user_agent TEXT,
  consent_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  collection_method VARCHAR(50) NOT NULL DEFAULT 'web_form',

  -- Timestamps
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT consent_unique_active UNIQUE (user_id, consent_type, status)
);

-- Indexes for consent lookups
CREATE INDEX idx_consent_user_id ON consent_records(user_id);
CREATE INDEX idx_consent_type ON consent_records(consent_type);
CREATE INDEX idx_consent_status ON consent_records(status);
CREATE INDEX idx_consent_granted_at ON consent_records(granted_at);
CREATE INDEX idx_consent_expires_at ON consent_records(expires_at)
  WHERE expires_at IS NOT NULL;

-- RLS policies
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- Users can view their own consent records
CREATE POLICY consent_select_own ON consent_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own consent records
CREATE POLICY consent_insert_own ON consent_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update (withdraw) their own consent
CREATE POLICY consent_update_own ON consent_records
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin can read all consent records for compliance
CREATE POLICY consent_select_admin ON consent_records
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN')
  );

-- Trigger to update updated_at
CREATE TRIGGER consent_records_updated_at
  BEFORE UPDATE ON consent_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user has active consent for a type
CREATE OR REPLACE FUNCTION has_active_consent(
  p_user_id UUID,
  p_consent_type consent_type
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM consent_records
    WHERE user_id = p_user_id
      AND consent_type = p_consent_type
      AND status = 'granted'
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to withdraw consent
CREATE OR REPLACE FUNCTION withdraw_consent(
  p_user_id UUID,
  p_consent_type consent_type
) RETURNS VOID AS $$
BEGIN
  UPDATE consent_records
  SET
    status = 'withdrawn',
    withdrawn_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND consent_type = p_consent_type
    AND status = 'granted';

  -- Log the withdrawal to audit_log
  INSERT INTO audit_log (
    user_id, action, entity_type, entity_id, details
  ) VALUES (
    p_user_id,
    'consent_withdrawn',
    'consent_records',
    p_user_id::TEXT,
    jsonb_build_object('consent_type', p_consent_type::TEXT)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE consent_records IS 'POPIA consent management - tracks explicit consent per data processing purpose';
