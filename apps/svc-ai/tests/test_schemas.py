"""
Tests for AI service Pydantic schemas.

See: docs/specs/05_AI_AGENTIC_LAYER.md
"""

import pytest
from pydantic import ValidationError

from src.models.schemas import (
    ConfidenceAction,
    DocumentUpsertRequest,
    EmbeddingRequest,
    InferenceRequest,
    InferenceType,
    RAGQueryRequest,
)


class TestInferenceRequest:
    """Tests for InferenceRequest schema validation."""

    def test_valid_request(self) -> None:
        req = InferenceRequest(prompt="What is the delivery status?")
        assert req.prompt == "What is the delivery status?"
        assert req.inference_type == InferenceType.COMPLETION
        assert req.max_tokens == 2048
        assert req.temperature == 0.1

    def test_empty_prompt_rejected(self) -> None:
        with pytest.raises(ValidationError):
            InferenceRequest(prompt="")

    def test_custom_inference_type(self) -> None:
        req = InferenceRequest(
            prompt="Classify this order",
            inference_type=InferenceType.CLASSIFICATION,
        )
        assert req.inference_type == InferenceType.CLASSIFICATION

    def test_temperature_range(self) -> None:
        req = InferenceRequest(prompt="test", temperature=1.5)
        assert req.temperature == 1.5

        with pytest.raises(ValidationError):
            InferenceRequest(prompt="test", temperature=3.0)

    def test_max_tokens_range(self) -> None:
        with pytest.raises(ValidationError):
            InferenceRequest(prompt="test", max_tokens=0)

        with pytest.raises(ValidationError):
            InferenceRequest(prompt="test", max_tokens=10000)


class TestEmbeddingRequest:
    """Tests for EmbeddingRequest schema."""

    def test_valid_request(self) -> None:
        req = EmbeddingRequest(text="driver performance review")
        assert req.text == "driver performance review"
        assert req.model == "text-embedding-3-small"

    def test_empty_text_rejected(self) -> None:
        with pytest.raises(ValidationError):
            EmbeddingRequest(text="")


class TestRAGQueryRequest:
    """Tests for RAGQueryRequest schema."""

    def test_valid_request(self) -> None:
        req = RAGQueryRequest(query="How does driver scoring work?")
        assert req.top_k == 5
        assert req.min_score == 0.7
        assert req.include_sources is True

    def test_top_k_range(self) -> None:
        req = RAGQueryRequest(query="test", top_k=10)
        assert req.top_k == 10

        with pytest.raises(ValidationError):
            RAGQueryRequest(query="test", top_k=25)


class TestDocumentUpsertRequest:
    """Tests for DocumentUpsertRequest schema."""

    def test_valid_request(self) -> None:
        req = DocumentUpsertRequest(
            document_id="doc-001",
            content="This is a test document for RAG.",
        )
        assert req.chunk_size == 500
        assert req.chunk_overlap == 50

    def test_chunk_size_validation(self) -> None:
        with pytest.raises(ValidationError):
            DocumentUpsertRequest(
                document_id="doc-001",
                content="test",
                chunk_size=50,  # Below minimum
            )


class TestConfidenceAction:
    """Tests for confidence action determination."""

    def test_confidence_values(self) -> None:
        assert ConfidenceAction.AUTO_EXECUTE == "auto_execute"
        assert ConfidenceAction.HITL_REVIEW == "hitl_review"
        assert ConfidenceAction.ESCALATE == "escalate"
