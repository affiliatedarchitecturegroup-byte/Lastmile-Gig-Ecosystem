"""
Health check endpoints for the AI Inference Service.

See: docs/specs/09_OBSERVABILITY.md
"""

from fastapi import APIRouter

from src.config import get_settings
from src.models.schemas import AIHealthResponse

router = APIRouter()


@router.get("/health", response_model=AIHealthResponse)
async def health_check() -> AIHealthResponse:
    """Check service health and connectivity."""
    settings = get_settings()

    return AIHealthResponse(
        status="healthy",
        service=settings.service_name,
        version="0.1.0",
        llm_provider=settings.llm_provider,
        llm_model=settings.llm_model_id,
        vector_store_connected=False,  # Phase K: Pinecone connection check
        cache_connected=False,  # Phase K: Redis connection check
        kafka_connected=False,  # Phase K: Kafka connection check
        environment=settings.environment,
    )
