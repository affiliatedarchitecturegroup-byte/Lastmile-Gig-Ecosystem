"""
Application configuration for the AI Inference Service.

All secrets are loaded from environment variables (sourced from Vault
or AWS Secrets Manager at runtime).

See: docs/specs/05_AI_AGENTIC_LAYER.md
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """AI service configuration."""

    # Service
    port: int = 8000
    environment: Literal["development", "staging", "production"] = "development"
    service_name: str = "svc-ai"
    log_level: str = "INFO"
    cors_origins: list[str] = ["*"]

    # LLM Provider
    llm_provider: Literal["bedrock", "openai", "anthropic"] = "bedrock"
    llm_model_id: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    llm_max_tokens: int = 4096
    llm_temperature: float = 0.1
    llm_timeout_secs: int = 60

    # AWS Bedrock
    aws_region: str = "af-south-1"
    aws_bedrock_endpoint: str = ""

    # Pinecone Vector Store
    pinecone_api_key: str = ""
    pinecone_environment: str = ""
    pinecone_index_name: str = "lastmilegig-embeddings"
    pinecone_namespace: str = "default"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    # Redis Cache
    redis_url: str = "redis://localhost:6379/0"
    cache_ttl_secs: int = 300
    cache_enabled: bool = True

    # Kafka
    kafka_brokers: str = "localhost:9092"
    kafka_group_id: str = "svc-ai-consumer"

    # Rate Limiting
    rate_limit_rpm: int = 60
    rate_limit_tpm: int = 100000

    # Observability
    otel_endpoint: str = ""
    sentry_dsn: str = ""

    model_config = {"env_prefix": "LMG_AI_", "env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
