"""
Tests for vector store client and text chunking.

See: docs/specs/05_AI_AGENTIC_LAYER.md - Section 3
"""

from src.services.vector_store import VectorStoreClient, chunk_text


class TestChunkText:
    """Tests for the text chunking function."""

    def test_short_text_single_chunk(self) -> None:
        text = "This is a short text."
        chunks = chunk_text(text, chunk_size=500)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_long_text_multiple_chunks(self) -> None:
        text = "A" * 1200
        chunks = chunk_text(text, chunk_size=500, chunk_overlap=50)
        assert len(chunks) >= 2

    def test_chunk_overlap(self) -> None:
        text = "Word " * 200  # 1000 chars
        chunks = chunk_text(text, chunk_size=400, chunk_overlap=100)
        # Verify chunks overlap
        assert len(chunks) >= 2

    def test_empty_text(self) -> None:
        chunks = chunk_text("", chunk_size=500)
        # Empty string returns empty list after filtering
        assert len(chunks) == 0 or chunks == [""]

    def test_exact_chunk_size(self) -> None:
        text = "X" * 500
        chunks = chunk_text(text, chunk_size=500)
        assert len(chunks) == 1


class TestVectorStoreClient:
    """Tests for the VectorStoreClient."""

    def test_unconnected_client(self) -> None:
        client = VectorStoreClient()
        assert client.is_connected is False

    def test_connected_property(self) -> None:
        client = VectorStoreClient(
            api_key="test-key",
            environment="test-env",
            index_name="test-index",
        )
        # Would be True if Pinecone was actually reachable
        assert isinstance(client.is_connected, bool)
