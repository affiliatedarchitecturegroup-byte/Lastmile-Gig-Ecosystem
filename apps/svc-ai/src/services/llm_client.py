"""
LLM Client - Abstraction layer for LLM provider interactions.

Supports AWS Bedrock (primary), with extensible interface for
OpenAI and Anthropic direct API fallback.

See: docs/specs/05_AI_AGENTIC_LAYER.md - Section 2
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncGenerator

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class LLMResponse:
    """Response from an LLM provider."""
    content: str
    model_id: str
    tokens_input: int
    tokens_output: int
    finish_reason: str
    latency_ms: float


@dataclass
class StreamChunk:
    """Single chunk from an LLM streaming response."""
    content: str
    is_final: bool
    tokens_so_far: int


class BaseLLMClient(ABC):
    """Abstract base class for LLM clients."""

    @abstractmethod
    async def invoke(
        self,
        prompt: str,
        system_prompt: str | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.1,
    ) -> LLMResponse:
        """Invoke the LLM with a prompt and return the response."""
        ...

    @abstractmethod
    async def stream(
        self,
        prompt: str,
        system_prompt: str | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.1,
    ) -> AsyncGenerator[StreamChunk, None]:
        """Stream the LLM response chunk by chunk."""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if the LLM provider is reachable."""
        ...


class BedrockClient(BaseLLMClient):
    """AWS Bedrock LLM client using Claude models.

    Primary LLM provider for the Lastmile Gig platform.
    Uses Claude 3.5 Sonnet via the Bedrock InvokeModel API.
    """

    def __init__(
        self,
        model_id: str = "anthropic.claude-3-5-sonnet-20241022-v2:0",
        region: str = "af-south-1",
        max_tokens: int = 4096,
    ) -> None:
        self.model_id = model_id
        self.region = region
        self.max_tokens = max_tokens
        self._client = None  # Phase K: boto3 Bedrock client initialization

        logger.info(
            "Bedrock client initialized",
            model_id=model_id,
            region=region,
        )

    async def invoke(
        self,
        prompt: str,
        system_prompt: str | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.1,
    ) -> LLMResponse:
        """Invoke Claude via AWS Bedrock."""
        logger.info(
            "Bedrock invoke",
            model=self.model_id,
            prompt_length=len(prompt),
            max_tokens=max_tokens,
        )

        # Phase K: Full Bedrock InvokeModel implementation
        # Placeholder response
        return LLMResponse(
            content="[Bedrock placeholder response]",
            model_id=self.model_id,
            tokens_input=len(prompt) // 4,
            tokens_output=10,
            finish_reason="end_turn",
            latency_ms=0.0,
        )

    async def stream(
        self,
        prompt: str,
        system_prompt: str | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.1,
    ) -> AsyncGenerator[StreamChunk, None]:
        """Stream Claude response via Bedrock InvokeModelWithResponseStream."""
        # Phase K: Full streaming implementation
        yield StreamChunk(
            content="[Bedrock streaming placeholder]",
            is_final=True,
            tokens_so_far=5,
        )

    async def health_check(self) -> bool:
        """Check Bedrock connectivity."""
        # Phase K: Actual Bedrock health check
        return True


class MockLLMClient(BaseLLMClient):
    """Mock LLM client for testing and development."""

    def __init__(self, model_id: str = "mock-model") -> None:
        self.model_id = model_id

    async def invoke(
        self,
        prompt: str,
        system_prompt: str | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.1,
    ) -> LLMResponse:
        """Return a mock response."""
        return LLMResponse(
            content=f"Mock response for: {prompt[:50]}",
            model_id=self.model_id,
            tokens_input=len(prompt) // 4,
            tokens_output=10,
            finish_reason="end_turn",
            latency_ms=1.0,
        )

    async def stream(
        self,
        prompt: str,
        system_prompt: str | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.1,
    ) -> AsyncGenerator[StreamChunk, None]:
        """Stream mock chunks."""
        yield StreamChunk(content="Mock ", is_final=False, tokens_so_far=1)
        yield StreamChunk(content="response", is_final=True, tokens_so_far=2)

    async def health_check(self) -> bool:
        """Always healthy."""
        return True
