"""Persists per-article hashes + vector-store file IDs between daily runs
so the job can upload only what actually changed (the "delta").
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


def content_hash(markdown: str) -> str:
    return hashlib.sha256(markdown.encode("utf-8")).hexdigest()


def load_state(path: str) -> dict:
    if not os.path.exists(path):
        return {"vector_store_id": None, "articles": {}}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(path: str, state: dict) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, sort_keys=True)


@dataclass
class Diff:
    added: list[str] = field(default_factory=list)
    updated: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    removed: list[str] = field(default_factory=list)


def compute_diff(current_articles: dict[str, str], state: dict) -> Diff:
    """current_articles: slug -> markdown content."""
    diff = Diff()
    known = state.get("articles", {})

    for slug, markdown in current_articles.items():
        new_hash = content_hash(markdown)
        prior = known.get(slug)
        if prior is None:
            diff.added.append(slug)
        elif prior.get("hash") != new_hash:
            diff.updated.append(slug)
        else:
            diff.skipped.append(slug)

    diff.removed = [slug for slug in known if slug not in current_articles]

    logger.info(
        "Diff: %d added, %d updated, %d skipped, %d removed",
        len(diff.added),
        len(diff.updated),
        len(diff.skipped),
        len(diff.removed),
    )
    return diff
