"""Analytics Service configuration."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Analytics service configuration."""

    port: int = 8002
    environment: Literal["development", "staging", "production"] = "development"
    service_name: str = "svc-analytics"
    log_level: str = "INFO"
    cors_origins: list[str] = ["*"]

    # Database
    database_url: str = "postgresql+asyncpg://localhost:5432/lastmilegig_analytics"
    timescaledb_url: str = "postgresql+asyncpg://localhost:5432/lastmilegig_iot"

    # Redis
    redis_url: str = "redis://localhost:6379/2"

    # Kafka
    kafka_brokers: str = "localhost:9092"
    kafka_group_id: str = "svc-analytics-consumer"

    # AI Service
    ai_service_url: str = "http://svc-ai:8000"

    model_config = {"env_prefix": "LMG_ANALYTICS_", "env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    """Get cached settings."""
    return Settings()
