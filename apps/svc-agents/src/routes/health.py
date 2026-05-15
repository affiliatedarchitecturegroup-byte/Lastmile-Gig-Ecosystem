"""Health check endpoint for the Agent Service."""

from fastapi import APIRouter

from src.config import get_settings
from src.models.schemas import AgentHealthResponse, AgentType, CrewType

router = APIRouter()


@router.get("/health", response_model=AgentHealthResponse)
async def health_check() -> AgentHealthResponse:
    """Check agent service health."""
    settings = get_settings()

    return AgentHealthResponse(
        status="healthy",
        service=settings.service_name,
        version="0.1.0",
        available_agents=[t.value for t in AgentType],
        available_crews=[t.value for t in CrewType],
        active_runs=0,
        hitl_pending=0,
    )
