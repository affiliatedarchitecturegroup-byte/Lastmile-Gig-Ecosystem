"""
AI Inference Service - Entry Point

FastAPI application for LLM orchestration, RAG pipelines,
and ML model inference. Primary AI gateway for the platform.

Port: 8000

See: docs/specs/05_AI_AGENTIC_LAYER.md
See: POLYGLOT_ARCHITECTURE.md - Section 2.2
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.routes import health, inference, embeddings, rag

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    settings = get_settings()
    logger.info(
        "Starting AI Inference Service",
        port=settings.port,
        environment=settings.environment,
        llm_provider=settings.llm_provider,
    )

    # Initialize connections on startup
    # - Pinecone vector store
    # - AWS Bedrock client
    # - Redis cache
    # - Kafka producer

    yield

    # Cleanup on shutdown
    logger.info("Shutting down AI Inference Service")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Lastmile Gig AI Inference Service",
        description="LLM orchestration, RAG pipelines, and ML inference",
        version="0.1.0",
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url="/redoc" if settings.environment != "production" else None,
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(health.router, tags=["health"])
    app.include_router(inference.router, prefix="/v1/ai", tags=["inference"])
    app.include_router(embeddings.router, prefix="/v1/ai", tags=["embeddings"])
    app.include_router(rag.router, prefix="/v1/ai", tags=["rag"])

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development",
        log_level="info",
    )
