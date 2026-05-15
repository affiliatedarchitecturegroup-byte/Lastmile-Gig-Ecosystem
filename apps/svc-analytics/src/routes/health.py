"""Health check endpoint."""

from fastapi import APIRouter
from src.config import get_settings
from src.models.schemas import AnalyticsHealthResponse

router = APIRouter()


@router.get("/health", response_model=AnalyticsHealthResponse)
async def health_check() -> AnalyticsHealthResponse:
    """Check analytics service health."""
    settings = get_settings()
    return AnalyticsHealthResponse(
        status="healthy",
        service=settings.service_name,
        version="0.1.0",
        database_connected=False,
        timescaledb_connected=False,
        cache_connected=False,
    )
