"""
Analytics Service - Entry Point

FastAPI application for real-time analytics, business intelligence,
demand forecasting, and operational reporting.

Port: 8002

See: docs/specs/05_AI_AGENTIC_LAYER.md - Section 6
See: POLYGLOT_ARCHITECTURE.md - Section 2.2
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.routes import health, metrics, reports, forecasting

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    settings = get_settings()
    logger.info("Starting Analytics Service", port=settings.port)
    yield
    logger.info("Shutting down Analytics Service")


def create_app() -> FastAPI:
    """Create the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Lastmile Gig Analytics Service",
        description="Real-time analytics, reporting, and demand forecasting",
        version="0.1.0",
        docs_url="/docs" if settings.environment != "production" else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, tags=["health"])
    app.include_router(metrics.router, prefix="/v1/analytics", tags=["metrics"])
    app.include_router(reports.router, prefix="/v1/analytics", tags=["reports"])
    app.include_router(forecasting.router, prefix="/v1/analytics", tags=["forecasting"])

    return app


app = create_app()
