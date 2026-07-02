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
import math

import tiktoken
from openai import OpenAI

logger = logging.getLogger(__name__)

CHUNKING_STRATEGY = {
    "type": "static",
    "static": {"max_chunk_size_tokens": 800, "chunk_overlap_tokens": 400},
}

_ENCODING = tiktoken.get_encoding("cl100k_base")


def estimate_chunk_count(text: str) -> int:
    """Estimate how many chunks OpenAI's static strategy will produce.

    OpenAI's vector-store API doesn't expose the real per-file chunk count
    (client.vector_stores.files.content() returns the whole file as one
    item, not the indexed chunks), so we estimate client-side from the
    same token count + sliding-window math OpenAI's static strategy uses.
    """
    max_tokens = CHUNKING_STRATEGY["static"]["max_chunk_size_tokens"]
    overlap = CHUNKING_STRATEGY["static"]["chunk_overlap_tokens"]
    num_tokens = len(_ENCODING.encode(text))
    if num_tokens <= max_tokens:
        return 1
    stride = max_tokens - overlap
    return 1 + math.ceil((num_tokens - max_tokens) / stride)


def get_or_create_vector_store(client: OpenAI, vector_store_id: str | None, name: str) -> str:
    if vector_store_id:
        client.vector_stores.retrieve(vector_store_id)  # raises if it no longer exists
        return vector_store_id

    vector_store = client.vector_stores.create(name=name)
    logger.info("Created new vector store %s (%s)", vector_store.id, name)
    return vector_store.id


def upload_article(client: OpenAI, vector_store_id: str, slug: str, markdown: str) -> tuple[str, int]:
    """Upload one article's Markdown as a new file attached to the vector store.

    Returns (file_id, estimated_chunk_count) — see estimate_chunk_count().
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

    return file_obj.id, estimate_chunk_count(markdown)


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
