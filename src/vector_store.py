"""Programmatic upload of Markdown articles into an OpenAI Vector Store.

Chunking strategy: static, 800 tokens/chunk with 400 token overlap (the
OpenAI default). Support articles here run from a few hundred to a few
thousand tokens, so 800/400 keeps most short articles as 1-2 chunks and
splits longer ones on reasonably generous overlap so an answer near a
chunk boundary still has context on both sides. See README for the
tradeoffs vs. a heading-aware splitter.
"""

from __future__ import annotations

import logging

from openai import OpenAI

logger = logging.getLogger(__name__)

CHUNKING_STRATEGY = {
    "type": "static",
    "static": {"max_chunk_size_tokens": 800, "chunk_overlap_tokens": 400},
}


def get_or_create_vector_store(client: OpenAI, vector_store_id: str | None, name: str) -> str:
    if vector_store_id:
        client.vector_stores.retrieve(vector_store_id)  # raises if it no longer exists
        return vector_store_id

    vector_store = client.vector_stores.create(name=name)
    logger.info("Created new vector store %s (%s)", vector_store.id, name)
    return vector_store.id


def upload_article(client: OpenAI, vector_store_id: str, slug: str, markdown: str) -> tuple[str, int]:
    """Upload one article's Markdown as a new file attached to the vector store.

    Returns (file_id, chunk_count). chunk_count is best-effort: it's only
    available after OpenAI finishes chunking, via the file-content endpoint.
    """
    file_obj = client.files.create(
        file=(f"{slug}.md", markdown.encode("utf-8")),
        purpose="assistants",
    )

    vector_store_file = client.vector_stores.files.create_and_poll(
        vector_store_id=vector_store_id,
        file_id=file_obj.id,
        chunking_strategy=CHUNKING_STRATEGY,
    )

    if vector_store_file.status != "completed":
        raise RuntimeError(f"Vector store failed to process {slug}: {vector_store_file.status}")

    chunk_count = _count_chunks(client, vector_store_id, file_obj.id)
    return file_obj.id, chunk_count


def _count_chunks(client: OpenAI, vector_store_id: str, file_id: str) -> int:
    try:
        content = client.vector_stores.files.content(vector_store_id=vector_store_id, file_id=file_id)
        return len(content.data)
    except Exception:  # pragma: no cover - best-effort logging only
        logger.debug("Chunk count unavailable for file %s", file_id, exc_info=True)
        return -1


def remove_article(client: OpenAI, vector_store_id: str, file_id: str) -> None:
    """Detach + delete a file that was replaced or no longer exists upstream."""
    try:
        client.vector_stores.files.delete(vector_store_id=vector_store_id, file_id=file_id)
    except Exception:
        logger.warning("Could not detach file %s from vector store", file_id, exc_info=True)
    try:
        client.files.delete(file_id)
    except Exception:
        logger.warning("Could not delete file object %s", file_id, exc_info=True)
