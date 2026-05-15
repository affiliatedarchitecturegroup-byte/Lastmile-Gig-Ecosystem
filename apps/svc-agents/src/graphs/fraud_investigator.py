"""
Fraud Investigator Agent - LangGraph StateGraph definition.

Investigates suspected fraud across delivery, payment, and driver
activity patterns. Uses RAG for historical fraud case retrieval
and LLM for pattern analysis.

State flow:
  start -> gather_evidence -> analyze_patterns -> assess_risk -> recommend -> end

See: docs/specs/05_AI_AGENTIC_LAYER.md - Section 4.2
"""

from typing import TypedDict

import structlog

logger = structlog.get_logger(__name__)


class FraudState(TypedDict):
    """State for the fraud investigator agent."""
    # Input
    entity_type: str  # 'driver' | 'customer' | 'partner'
    entity_id: str
    alert_triggers: list[str]
    alert_score: float

    # Evidence
    evidence: list[dict[str, str | float]]
    historical_cases: list[dict[str, str | float]]
    pattern_matches: list[str]

    # Assessment
    risk_score: float
    risk_level: str  # 'low' | 'medium' | 'high' | 'critical'
    recommended_action: str
    confidence: float
    investigation_summary: str

    # Tracking
    steps_executed: list[str]
    total_tokens: int


async def gather_evidence(state: FraudState) -> FraudState:
    """Gather evidence from multiple data sources.

    Sources:
    - Order history and delivery patterns
    - Payment transaction records
    - GPS location anomalies
    - Device fingerprinting data
    - Historical fraud reports (via RAG)
    """
    logger.info(
        "Gathering evidence",
        entity_type=state["entity_type"],
        entity_id=state["entity_id"],
    )

    state["steps_executed"].append("gather_evidence")
    # Phase K: Query multiple services for evidence
    return state


async def analyze_patterns(state: FraudState) -> FraudState:
    """Analyze evidence for fraud patterns.

    Pattern types:
    - GPS spoofing (impossible travel times)
    - Collusion rings (repeated driver-customer pairs)
    - Payment cycling (rapid refund/reorder)
    - Account takeover (device change + behavior shift)
    - Phantom deliveries (no GPS movement during delivery)
    """
    logger.info("Analyzing patterns", entity_id=state["entity_id"])

    state["steps_executed"].append("analyze_patterns")
    # Phase K: LLM pattern analysis with RAG context
    return state


async def assess_risk(state: FraudState) -> FraudState:
    """Calculate composite risk score and determine risk level."""
    logger.info("Assessing risk", entity_id=state["entity_id"])

    state["steps_executed"].append("assess_risk")
    state["risk_score"] = 0.0
    state["risk_level"] = "low"
    return state


async def recommend_action(state: FraudState) -> FraudState:
    """Generate recommended action based on risk assessment.

    Actions by risk level:
    - Low: Log and monitor
    - Medium: Flag for review (HITL)
    - High: Temporarily suspend + notify ops
    - Critical: Immediate account freeze + escalate to compliance
    """
    logger.info(
        "Recommending action",
        entity_id=state["entity_id"],
        risk_level=state["risk_level"],
    )

    state["steps_executed"].append("recommend_action")

    risk_actions = {
        "low": "Log and continue monitoring",
        "medium": "Flag for manual review",
        "high": "Temporary suspension pending review",
        "critical": "Immediate account freeze and compliance escalation",
    }

    state["recommended_action"] = risk_actions.get(
        state["risk_level"], "Unknown risk level"
    )

    return state


def create_initial_state(
    entity_type: str,
    entity_id: str,
    alert_triggers: list[str],
    alert_score: float,
) -> FraudState:
    """Create initial state for a fraud investigation."""
    return FraudState(
        entity_type=entity_type,
        entity_id=entity_id,
        alert_triggers=alert_triggers,
        alert_score=alert_score,
        evidence=[],
        historical_cases=[],
        pattern_matches=[],
        risk_score=0.0,
        risk_level="low",
        recommended_action="",
        confidence=0.0,
        investigation_summary="",
        steps_executed=[],
        total_tokens=0,
    )
