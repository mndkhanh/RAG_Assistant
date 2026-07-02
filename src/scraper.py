"""Pulls published articles from a Zendesk Help Center via its public API.

Using the API instead of scraping rendered HTML pages means we get the
article body only (no nav/sidebar/footer/ads to strip) plus reliable
metadata (title, canonical URL, updated_at) for free.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

import requests

logger = logging.getLogger(__name__)

PAGE_SIZE = 100
MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = 2


@dataclass
class Article:
    id: int
    title: str
    html_url: str
    body_html: str
    updated_at: str


def _get(session: requests.Session, url: str, params: dict | None = None) -> dict:
    for attempt in range(1, MAX_RETRIES + 1):
        response = session.get(url, params=params, timeout=30)
        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", RETRY_BACKOFF_SECONDS))
            logger.warning("Rate limited by Zendesk, sleeping %ss", retry_after)
            time.sleep(retry_after)
            continue
        response.raise_for_status()
        return response.json()
    raise RuntimeError(f"Exceeded retries fetching {url}")


def fetch_articles(base_url: str, locale: str, limit: int) -> list[Article]:
    """Fetch up to `limit` published, non-draft articles, newest-updated first."""
    session = requests.Session()
    session.headers.update({"Accept": "application/json"})

    url = f"{base_url.rstrip('/')}/api/v2/help_center/{locale}/articles.json"
    params = {
        "page[size]": min(PAGE_SIZE, limit),
        "sort_by": "updated_at",
        "sort_order": "desc",
    }

    articles: list[Article] = []
    next_url: str | None = url
    next_params: dict | None = params

    while next_url and len(articles) < limit:
        payload = _get(session, next_url, next_params)
        for raw in payload.get("articles", []):
            if raw.get("draft"):
                continue
            articles.append(
                Article(
                    id=raw["id"],
                    title=raw["title"],
                    html_url=raw["html_url"],
                    body_html=raw.get("body") or "",
                    updated_at=raw["updated_at"],
                )
            )
            if len(articles) >= limit:
                break

        next_url = payload.get("next_page")
        next_params = None  # next_page is already a full URL with query params

    logger.info("Fetched %d articles from %s", len(articles), base_url)
    return articles
