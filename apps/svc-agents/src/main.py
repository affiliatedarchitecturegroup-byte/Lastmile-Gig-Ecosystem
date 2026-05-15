"""
Agent Service - Entry Point

FastAPI application for LangGraph stateful agent workflows
and CrewAI multi-agent crews. Handles dispatch optimization,
fraud investigation, SLA monitoring, and driver scoring.

Port: 8001

See: docs/specs/05_AI_AGENTIC_LAYER.md
See: docs/specs/18_AGENTIC_DEV_STANDARDS.md
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.routes import health, agents, crews

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    settings = get_settings()
    logger.info(
        "Starting Agent Service",
        port=settings.port,
        environment=settings.environment,
    )
    yield
    logger.info("Shutting down Agent Service")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Lastmile Gig Agent Service",
        description="LangGraph agents and CrewAI multi-agent crews",
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
    app.include_router(agents.router, prefix="/v1/agents", tags=["agents"])
    app.include_router(crews.router, prefix="/v1/crews", tags=["crews"])

    return app


app = create_app()
