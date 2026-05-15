"""
Pydantic schemas for the Agent Service API.

See: docs/specs/05_AI_AGENTIC_LAYER.md
See: docs/specs/18_AGENTIC_DEV_STANDARDS.md
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class AgentType(str, Enum):
    """Available LangGraph agent types."""
    DISPATCH_OPTIMIZER = "dispatch_optimizer"
    FRAUD_INVESTIGATOR = "fraud_investigator"
    SLA_MONITOR = "sla_monitor"
    DRIVER_SCORER = "driver_scorer"
    ROUTE_PLANNER = "route_planner"
    DEMAND_FORECASTER = "demand_forecaster"


class CrewType(str, Enum):
    """Available CrewAI multi-agent crews."""
    INCIDENT_RESPONSE = "incident_response"
    ESG_REPORTING = "esg_reporting"
    PARTNER_ONBOARDING = "partner_onboarding"
    FLEET_OPTIMIZATION = "fleet_optimization"


class AgentRunStatus(str, Enum):
    """Agent execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    HITL_PENDING = "hitl_pending"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"


class ConfidenceAction(str, Enum):
    """Action based on confidence score."""
    AUTO_EXECUTE = "auto_execute"
    HITL_REVIEW = "hitl_review"
    ESCALATE = "escalate"


# --- Agent Requests/Responses ---

class RunAgentRequest(BaseModel):
    """Request to run a LangGraph agent."""
    agent_type: AgentType
    input_data: dict[str, Any]
    trace_id: str | None = None
    timeout_secs: int = Field(default=120, ge=10, le=600)
    max_steps: int = Field(default=15, ge=1, le=50)


class AgentStep(BaseModel):
    """Single step in an agent execution."""
    step_number: int
    node_name: str
    action: str
    observation: str
    duration_ms: float
    tokens_used: int


class AgentRunResponse(BaseModel):
    """Response from a LangGraph agent run."""
    run_id: str
    agent_type: AgentType
    status: AgentRunStatus
    result: dict[str, Any] | None = None
    confidence: float
    confidence_action: ConfidenceAction
    steps: list[AgentStep]
    total_steps: int
    total_tokens: int
    total_duration_ms: float
    hitl_required: bool
    hitl_reason: str | None = None
    started_at: datetime
    completed_at: datetime | None = None


class HITLDecisionRequest(BaseModel):
    """Human-in-the-loop decision for a pending agent run."""
    run_id: str
    approved: bool
    modified_result: dict[str, Any] | None = None
    reviewer_id: str
    notes: str | None = None


class HITLDecisionResponse(BaseModel):
    """Response after HITL decision."""
    run_id: str
    approved: bool
    final_result: dict[str, Any]
    executed_at: datetime


# --- Crew Requests/Responses ---

class RunCrewRequest(BaseModel):
    """Request to run a CrewAI multi-agent crew."""
    crew_type: CrewType
    input_data: dict[str, Any]
    trace_id: str | None = None
    timeout_secs: int = Field(default=300, ge=30, le=1800)


class CrewAgentResult(BaseModel):
    """Result from a single agent within a crew."""
    agent_name: str
    role: str
    task: str
    result: str
    tokens_used: int
    duration_ms: float


class CrewRunResponse(BaseModel):
    """Response from a CrewAI crew run."""
    run_id: str
    crew_type: CrewType
    status: AgentRunStatus
    final_output: str
    agent_results: list[CrewAgentResult]
    total_tokens: int
    total_duration_ms: float
    started_at: datetime
    completed_at: datetime | None = None


# --- Health ---

class AgentHealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    available_agents: list[str]
    available_crews: list[str]
    active_runs: int
    hitl_pending: int
