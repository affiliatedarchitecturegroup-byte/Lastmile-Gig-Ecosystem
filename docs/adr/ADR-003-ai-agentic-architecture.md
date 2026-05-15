# ADR-003: AI & Agentic Layer Architecture

**Status:** Accepted  
**Date:** 2026-05-15  
**Decision Makers:** Engineering Team  
**Category:** Architecture  

## Context

The Lastmile Gig platform requires AI capabilities across multiple domains:
1. LLM-powered inference for classification, extraction, and summarization
2. Stateful agent workflows for dispatch optimization and fraud investigation
3. Multi-agent crews for complex operational tasks
4. RAG pipelines for knowledge-grounded responses
5. Demand forecasting for proactive driver allocation

## Decision

### Three-Service Architecture

| Service | Port | Framework | Purpose |
|---|---|---|---|
| `svc-ai` | 8000 | FastAPI | LLM inference, embeddings, RAG |
| `svc-agents` | 8001 | FastAPI + LangGraph | Stateful agent workflows, CrewAI crews |
| `svc-analytics` | 8002 | FastAPI | Metrics, reports, demand forecasting |

### Technology Choices

- **LLM Provider:** AWS Bedrock (Claude 3.5 Sonnet) as primary, with fallback interface for OpenAI/Anthropic direct
- **Agent Framework:** LangGraph for stateful workflows with explicit state machines
- **Multi-Agent:** CrewAI for complex multi-agent coordination
- **Vector Store:** Pinecone for RAG embedding storage and similarity search
- **Embeddings:** text-embedding-3-small (1536 dimensions)
- **ML Models:** AWS SageMaker for custom demand forecasting models

### Confidence-Based HITL System

Per `docs/specs/18_AGENTIC_DEV_STANDARDS.md`:

| Confidence | Action | Description |
|---|---|---|
| >= 0.85 | AUTO_EXECUTE | Agent decision applied automatically |
| 0.60 - 0.84 | HITL_REVIEW | Queued for human review before execution |
| < 0.60 | ESCALATE | Escalated to ops team, no auto-execution |

### Agent Types (LangGraph StateGraphs)

1. **Dispatch Optimizer** - Driver-to-order matching with multi-factor scoring
2. **Fraud Investigator** - Pattern detection with RAG historical case retrieval
3. **SLA Monitor** - Real-time SLA compliance tracking and alerting
4. **Driver Scorer** - Performance evaluation and tier assignment
5. **Route Planner** - Multi-stop route optimization
6. **Demand Forecaster** - Zone-based demand prediction

### Crew Types (CrewAI)

1. **Incident Response** - Multi-agent coordination for critical incidents
2. **ESG Reporting** - Automated sustainability report generation
3. **Partner Onboarding** - Document verification and setup workflow
4. **Fleet Optimization** - Vehicle allocation and maintenance scheduling

## Consequences

### Positive
- Separation of inference, agents, and analytics allows independent scaling
- LangGraph provides explicit, debuggable state machines vs opaque chain-of-thought
- HITL system prevents AI from making irreversible decisions below confidence threshold
- RAG ensures responses are grounded in platform documentation and historical data

### Negative
- Three services increase deployment complexity
- LangGraph and CrewAI are relatively new frameworks (API stability risk)
- AWS Bedrock regional availability (af-south-1 may have higher latency)

### Risks
- Token cost management requires monitoring (ai_token_usage table)
- Model hallucination in fraud investigation needs careful prompt engineering
- RAG retrieval quality depends on document chunking strategy

## Related

- [ADR-001: Polyglot Architecture](ADR-001-polyglot-architecture.md)
- [ADR-002: Blockchain & IoT Architecture](ADR-002-blockchain-iot-architecture.md)
- [Spec 05: AI Agentic Layer](../specs/05_AI_AGENTIC_LAYER.md)
- [Spec 18: Agentic Dev Standards](../specs/18_AGENTIC_DEV_STANDARDS.md)
