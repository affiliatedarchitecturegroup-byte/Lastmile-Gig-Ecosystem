-- Migration: 010_create_blockchain_tables
-- Description: Blockchain audit trail tables for off-chain indexing
-- Author: Lastmile Gig Development Team
-- Date: 2026-05-15
--
-- These tables store a local copy of blockchain events for fast querying
-- without requiring direct RPC calls. The Graph subgraph is the primary
-- indexer, but these tables serve as a fallback and for internal analytics.
--
-- See: docs/specs/06_BLOCKCHAIN_LAYER.md

-- Blockchain delivery verification records (off-chain index)
CREATE TABLE IF NOT EXISTS blockchain_deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        VARCHAR(66) NOT NULL,
    driver_id       VARCHAR(66) NOT NULL,
    customer_id     VARCHAR(66) NOT NULL,
    delivery_lat    BIGINT NOT NULL,
    delivery_lng    BIGINT NOT NULL,
    photo_hash      VARCHAR(66) NOT NULL,
    signature_hash  VARCHAR(66),
    verified        BOOLEAN NOT NULL DEFAULT TRUE,
    disputed        BOOLEAN NOT NULL DEFAULT FALSE,
    tx_hash         VARCHAR(66) NOT NULL,
    block_number    BIGINT NOT NULL,
    chain_timestamp TIMESTAMPTZ NOT NULL,
    indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_blockchain_deliveries_order UNIQUE (order_id)
);

CREATE INDEX idx_blockchain_deliveries_driver ON blockchain_deliveries (driver_id);
CREATE INDEX idx_blockchain_deliveries_timestamp ON blockchain_deliveries (chain_timestamp);
CREATE INDEX idx_blockchain_deliveries_disputed ON blockchain_deliveries (disputed) WHERE disputed = TRUE;

-- Blockchain payout escrow records (off-chain index)
CREATE TABLE IF NOT EXISTS blockchain_escrows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        VARCHAR(66) NOT NULL,
    driver_wallet   VARCHAR(42) NOT NULL,
    amount_wei      NUMERIC(78, 0) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    release_after   TIMESTAMPTZ NOT NULL,
    tx_hash_create  VARCHAR(66) NOT NULL,
    tx_hash_complete VARCHAR(66),
    created_at      TIMESTAMPTZ NOT NULL,
    completed_at    TIMESTAMPTZ,
    indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_blockchain_escrows_order UNIQUE (order_id),
    CONSTRAINT chk_escrow_status CHECK (status IN ('CREATED', 'RELEASED', 'REFUNDED', 'EXPIRED'))
);

CREATE INDEX idx_blockchain_escrows_driver ON blockchain_escrows (driver_wallet);
CREATE INDEX idx_blockchain_escrows_status ON blockchain_escrows (status);

-- Blockchain SLA contracts (off-chain index)
CREATE TABLE IF NOT EXISTS blockchain_sla_contracts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id             VARCHAR(66) NOT NULL,
    partner_address         VARCHAR(42) NOT NULL,
    delivery_target_minutes INTEGER NOT NULL,
    penalty_per_breach_wei  NUMERIC(78, 0) NOT NULL,
    bonus_per_perfect_week  NUMERIC(78, 0) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    tx_hash                 VARCHAR(66) NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL,
    indexed_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_blockchain_sla_contract UNIQUE (contract_id),
    CONSTRAINT chk_sla_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED'))
);

-- SLA weekly settlements (off-chain index)
CREATE TABLE IF NOT EXISTS blockchain_sla_settlements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     VARCHAR(66) NOT NULL,
    week_number     INTEGER NOT NULL,
    total_deliveries INTEGER NOT NULL DEFAULT 0,
    breaches        INTEGER NOT NULL DEFAULT 0,
    successes       INTEGER NOT NULL DEFAULT 0,
    penalty_total   NUMERIC(78, 0) NOT NULL DEFAULT 0,
    bonus_awarded   NUMERIC(78, 0) NOT NULL DEFAULT 0,
    net_settlement  NUMERIC(78, 0) NOT NULL DEFAULT 0,
    tx_hash         VARCHAR(66) NOT NULL,
    settled_at      TIMESTAMPTZ NOT NULL,
    indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sla_settlement_week UNIQUE (contract_id, week_number)
);

CREATE INDEX idx_sla_settlements_contract ON blockchain_sla_settlements (contract_id);

-- Driver identity credentials (off-chain index)
CREATE TABLE IF NOT EXISTS blockchain_credentials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id       VARCHAR(66) NOT NULL,
    licence_hash    VARCHAR(66) NOT NULL,
    biometric_hash  VARCHAR(66) NOT NULL,
    pdp_hash        VARCHAR(66),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    version         INTEGER NOT NULL DEFAULT 1,
    issued_at       TIMESTAMPTZ NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    tx_hash         VARCHAR(66) NOT NULL,
    issued_by       VARCHAR(42) NOT NULL,
    indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_blockchain_credential_driver UNIQUE (driver_id),
    CONSTRAINT chk_credential_status CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED'))
);

CREATE INDEX idx_blockchain_credentials_status ON blockchain_credentials (status);
CREATE INDEX idx_blockchain_credentials_expires ON blockchain_credentials (expires_at);

-- Credential revocation history
CREATE TABLE IF NOT EXISTS blockchain_credential_revocations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id       VARCHAR(66) NOT NULL,
    reason          TEXT NOT NULL,
    tx_hash         VARCHAR(66) NOT NULL,
    revoked_at      TIMESTAMPTZ NOT NULL,
    revoked_by      VARCHAR(42) NOT NULL,
    indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credential_revocations_driver ON blockchain_credential_revocations (driver_id);

-- RLS policies
ALTER TABLE blockchain_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_sla_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_sla_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_credential_revocations ENABLE ROW LEVEL SECURITY;

-- Service role policies (blockchain service can read/write all)
CREATE POLICY blockchain_svc_all ON blockchain_deliveries FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin'));

CREATE POLICY escrow_svc_all ON blockchain_escrows FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin'));

CREATE POLICY sla_svc_all ON blockchain_sla_contracts FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin'));

CREATE POLICY settlement_svc_all ON blockchain_sla_settlements FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin'));

CREATE POLICY cred_svc_all ON blockchain_credentials FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin'));

CREATE POLICY revocation_svc_all ON blockchain_credential_revocations FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin'));
