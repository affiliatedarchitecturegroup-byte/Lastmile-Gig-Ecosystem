-- Migration: 012_create_ai_tables
-- Description: AI & Agentic layer tables for inference logs, agent runs, and RAG
-- Author: Lastmile Gig Development Team
-- Date: 2026-05-15
--
-- Stores AI inference audit trail, agent execution history,
-- HITL decisions, and RAG document metadata.
--
-- See: docs/specs/05_AI_AGENTIC_LAYER.md
-- See: docs/specs/18_AGENTIC_DEV_STANDARDS.md

-- AI inference request/response log
CREATE TABLE IF NOT EXISTS ai_inference_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id      UUID NOT NULL UNIQUE,
    inference_type  VARCHAR(30) NOT NULL,
    model_id        VARCHAR(100) NOT NULL,
    provider        VARCHAR(20) NOT NULL,
    prompt_hash     VARCHAR(64) NOT NULL,
    tokens_input    INTEGER NOT NULL DEFAULT 0,
    tokens_output   INTEGER NOT NULL DEFAULT 0,
    latency_ms      DOUBLE PRECISION NOT NULL DEFAULT 0,
    confidence      DOUBLE PRECISION,
    confidence_action VARCHAR(20),
    cached          BOOLEAN NOT NULL DEFAULT FALSE,
    status          VARCHAR(20) NOT NULL DEFAULT 'completed',
    error_message   TEXT,
    trace_id        VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_inference_type CHECK (inference_type IN (
        'completion', 'classification', 'extraction',
        'summarization', 'sentiment', 'fraud_detection'
    )),
    CONSTRAINT chk_inference_status CHECK (status IN ('completed', 'failed', 'cached')),
    CONSTRAINT chk_provider CHECK (provider IN ('bedrock', 'openai', 'anthropic'))
);

CREATE INDEX idx_inference_log_type ON ai_inference_log (inference_type, created_at DESC);
CREATE INDEX idx_inference_log_trace ON ai_inference_log (trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX idx_inference_log_model ON ai_inference_log (model_id, created_at DESC);

-- Agent run execution history
CREATE TABLE IF NOT EXISTS ai_agent_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL UNIQUE,
    agent_type      VARCHAR(30) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    input_data      JSONB NOT NULL DEFAULT '{}',
    result_data     JSONB,
    confidence      DOUBLE PRECISION NOT NULL DEFAULT 0,
    confidence_action VARCHAR(20) NOT NULL DEFAULT 'escalate',
    total_steps     INTEGER NOT NULL DEFAULT 0,
    total_tokens    INTEGER NOT NULL DEFAULT 0,
    total_duration_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
    hitl_required   BOOLEAN NOT NULL DEFAULT FALSE,
    hitl_reason     TEXT,
    trace_id        VARCHAR(64),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    CONSTRAINT chk_agent_type CHECK (agent_type IN (
        'dispatch_optimizer', 'fraud_investigator', 'sla_monitor',
        'driver_scorer', 'route_planner', 'demand_forecaster'
    )),
    CONSTRAINT chk_agent_status CHECK (status IN (
        'pending', 'running', 'completed', 'hitl_pending',
        'failed', 'cancelled', 'timed_out'
    )),
    CONSTRAINT chk_confidence_action CHECK (confidence_action IN (
        'auto_execute', 'hitl_review', 'escalate'
    ))
);

CREATE INDEX idx_agent_runs_type ON ai_agent_runs (agent_type, started_at DESC);
CREATE INDEX idx_agent_runs_status ON ai_agent_runs (status, started_at DESC);
CREATE INDEX idx_agent_runs_hitl ON ai_agent_runs (hitl_required, status)
    WHERE hitl_required = TRUE AND status = 'hitl_pending';

-- Agent execution steps (child of agent_runs)
CREATE TABLE IF NOT EXISTS ai_agent_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL REFERENCES ai_agent_runs(run_id) ON DELETE CASCADE,
    step_number     INTEGER NOT NULL,
    node_name       VARCHAR(50) NOT NULL,
    action          TEXT NOT NULL,
    observation     TEXT NOT NULL,
    duration_ms     DOUBLE PRECISION NOT NULL DEFAULT 0,
    tokens_used     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_agent_step UNIQUE (run_id, step_number)
);

CREATE INDEX idx_agent_steps_run ON ai_agent_steps (run_id, step_number);

-- HITL (Human-in-the-Loop) decision log
CREATE TABLE IF NOT EXISTS ai_hitl_decisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL REFERENCES ai_agent_runs(run_id),
    approved        BOOLEAN NOT NULL,
    original_result JSONB,
    modified_result JSONB,
    reviewer_id     UUID NOT NULL,
    notes           TEXT,
    decided_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hitl_decisions_run ON ai_hitl_decisions (run_id);
CREATE INDEX idx_hitl_decisions_reviewer ON ai_hitl_decisions (reviewer_id, decided_at DESC);

-- CrewAI crew run history
CREATE TABLE IF NOT EXISTS ai_crew_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL UNIQUE,
    crew_type       VARCHAR(30) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    final_output    TEXT,
    total_tokens    INTEGER NOT NULL DEFAULT 0,
    total_duration_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
    agent_count     INTEGER NOT NULL DEFAULT 0,
    trace_id        VARCHAR(64),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    CONSTRAINT chk_crew_type CHECK (crew_type IN (
        'incident_response', 'esg_reporting',
        'partner_onboarding', 'fleet_optimization'
    ))
);

CREATE INDEX idx_crew_runs_type ON ai_crew_runs (crew_type, started_at DESC);

-- RAG document metadata (vector content is in Pinecone)
CREATE TABLE IF NOT EXISTS ai_rag_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     VARCHAR(100) NOT NULL UNIQUE,
    title           VARCHAR(255),
    source_type     VARCHAR(30) NOT NULL DEFAULT 'manual',
    content_hash    VARCHAR(64) NOT NULL,
    chunks_count    INTEGER NOT NULL DEFAULT 0,
    vectors_count   INTEGER NOT NULL DEFAULT 0,
    namespace       VARCHAR(50) NOT NULL DEFAULT 'default',
    metadata        JSONB DEFAULT '{}',
    indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_source_type CHECK (source_type IN (
        'manual', 'api', 'crawl', 'upload', 'system'
    ))
);

CREATE INDEX idx_rag_documents_namespace ON ai_rag_documents (namespace);
CREATE INDEX idx_rag_documents_source ON ai_rag_documents (source_type, indexed_at DESC);

-- Analytics forecast history
CREATE TABLE IF NOT EXISTS ai_forecast_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone            VARCHAR(30) NOT NULL,
    forecast_hours  INTEGER NOT NULL,
    model_version   VARCHAR(30) NOT NULL,
    peak_demand_hour INTEGER,
    peak_orders_predicted DOUBLE PRECISION,
    forecast_data   JSONB NOT NULL DEFAULT '[]',
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forecast_zone ON ai_forecast_history (zone, generated_at DESC);

-- Token usage tracking (for cost monitoring)
CREATE TABLE IF NOT EXISTS ai_token_usage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service         VARCHAR(20) NOT NULL,
    model_id        VARCHAR(100) NOT NULL,
    provider        VARCHAR(20) NOT NULL,
    tokens_input    INTEGER NOT NULL DEFAULT 0,
    tokens_output   INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_usage_service ON ai_token_usage (service, period_start DESC);
CREATE INDEX idx_token_usage_model ON ai_token_usage (model_id, period_start DESC);

-- RLS policies
ALTER TABLE ai_inference_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_hitl_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_crew_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_forecast_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY inference_svc ON ai_inference_log FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin'));

CREATE POLICY agent_svc ON ai_agent_runs FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin', 'ops_senior'));

CREATE POLICY steps_svc ON ai_agent_steps FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin'));

CREATE POLICY hitl_svc ON ai_hitl_decisions FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin', 'ops_senior', 'ops_staff'));

CREATE POLICY crew_svc ON ai_crew_runs FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin'));

CREATE POLICY rag_svc ON ai_rag_documents FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin'));

CREATE POLICY forecast_svc ON ai_forecast_history FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin', 'ops_senior'));

CREATE POLICY token_svc ON ai_token_usage FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin', 'finance'));
