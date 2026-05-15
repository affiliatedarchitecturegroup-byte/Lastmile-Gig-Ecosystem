"""
Configuration for the Agent Service.

See: docs/specs/05_AI_AGENTIC_LAYER.md
See: docs/specs/18_AGENTIC_DEV_STANDARDS.md
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Agent service configuration."""

    port: int = 8001
    environment: Literal["development", "staging", "production"] = "development"
    service_name: str = "svc-agents"
    log_level: str = "INFO"
    cors_origins: list[str] = ["*"]

    # AI service endpoint (svc-ai)
    ai_service_url: str = "http://svc-ai:8000"

    # Confidence thresholds (per docs/specs/18_AGENTIC_DEV_STANDARDS.md)
    confidence_auto_execute: float = 0.85
    confidence_hitl_threshold: float = 0.60

    # Agent timeouts
    agent_timeout_secs: int = 120
    max_agent_steps: int = 15

    # Kafka
    kafka_brokers: str = "localhost:9092"
    kafka_group_id: str = "svc-agents-consumer"

    # Redis (for agent state persistence)
    redis_url: str = "redis://localhost:6379/1"

    model_config = {"env_prefix": "LMG_AGENTS_", "env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    """Get cached settings."""
    return Settings()
