"""
Pydantic schemas for AI Inference Service API.

Request/response models for inference, embeddings, and RAG operations.

See: docs/specs/05_AI_AGENTIC_LAYER.md
See: docs/specs/12_API_INTEGRATION_SPEC.md
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# --- Enums ---

class LLMProvider(str, Enum):
    """Supported LLM providers."""
    BEDROCK = "bedrock"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class ConfidenceAction(str, Enum):
    """Action based on AI confidence score."""
    AUTO_EXECUTE = "auto_execute"
    HITL_REVIEW = "hitl_review"
    ESCALATE = "escalate"


class InferenceType(str, Enum):
    """Types of AI inference operations."""
    COMPLETION = "completion"
    CLASSIFICATION = "classification"
    EXTRACTION = "extraction"
    SUMMARIZATION = "summarization"
    SENTIMENT = "sentiment"
    FRAUD_DETECTION = "fraud_detection"


# --- Inference ---

class InferenceRequest(BaseModel):
    """Request for LLM inference."""
    prompt: str = Field(..., min_length=1, max_length=32000)
    system_prompt: str | None = None
    inference_type: InferenceType = InferenceType.COMPLETION
    max_tokens: int = Field(default=2048, ge=1, le=8192)
    temperature: float = Field(default=0.1, ge=0.0, le=2.0)
    context: dict[str, Any] | None = None
    trace_id: str | None = None


class InferenceResponse(BaseModel):
    """Response from LLM inference."""
    request_id: str
    content: str
    inference_type: InferenceType
    model_id: str
    provider: LLMProvider
    tokens_input: int
    tokens_output: int
    latency_ms: float
    confidence: float | None = None
    confidence_action: ConfidenceAction | None = None
    cached: bool = False
    timestamp: datetime


class BatchInferenceRequest(BaseModel):
    """Batch inference request."""
    requests: list[InferenceRequest] = Field(..., min_length=1, max_length=50)
    parallel: bool = True


class BatchInferenceResponse(BaseModel):
    """Batch inference response."""
    results: list[InferenceResponse]
    total_tokens_input: int
    total_tokens_output: int
    total_latency_ms: float


# --- Embeddings ---

class EmbeddingRequest(BaseModel):
    """Request for text embedding generation."""
    text: str = Field(..., min_length=1, max_length=8192)
    model: str = "text-embedding-3-small"
    namespace: str = "default"


class EmbeddingResponse(BaseModel):
    """Response with generated embedding."""
    request_id: str
    embedding: list[float]
    dimensions: int
    model: str
    tokens_used: int
    latency_ms: float


class BatchEmbeddingRequest(BaseModel):
    """Batch embedding request."""
    texts: list[str] = Field(..., min_length=1, max_length=100)
    model: str = "text-embedding-3-small"
    namespace: str = "default"


class BatchEmbeddingResponse(BaseModel):
    """Batch embedding response."""
    request_id: str
    embeddings: list[list[float]]
    dimensions: int
    total_tokens: int


# --- RAG ---

class RAGQueryRequest(BaseModel):
    """Request for Retrieval-Augmented Generation query."""
    query: str = Field(..., min_length=1, max_length=4096)
    namespace: str = "default"
    top_k: int = Field(default=5, ge=1, le=20)
    min_score: float = Field(default=0.7, ge=0.0, le=1.0)
    include_sources: bool = True
    system_prompt: str | None = None
    filters: dict[str, Any] | None = None


class RAGSource(BaseModel):
    """Source document used in RAG response."""
    document_id: str
    content: str
    score: float
    metadata: dict[str, Any] | None = None


class RAGQueryResponse(BaseModel):
    """Response from RAG query."""
    request_id: str
    answer: str
    sources: list[RAGSource]
    model_id: str
    tokens_input: int
    tokens_output: int
    latency_ms: float
    confidence: float


class DocumentUpsertRequest(BaseModel):
    """Request to upsert a document into the vector store."""
    document_id: str
    content: str = Field(..., min_length=1, max_length=32000)
    metadata: dict[str, Any] | None = None
    namespace: str = "default"
    chunk_size: int = Field(default=500, ge=100, le=2000)
    chunk_overlap: int = Field(default=50, ge=0, le=500)


class DocumentUpsertResponse(BaseModel):
    """Response after document upsert."""
    document_id: str
    chunks_created: int
    vectors_upserted: int
    namespace: str


# --- Health ---

class AIHealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    llm_provider: str
    llm_model: str
    vector_store_connected: bool
    cache_connected: bool
    kafka_connected: bool
    environment: str
