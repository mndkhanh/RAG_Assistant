"""OptiBot ingestion job: scrape support articles, convert to Markdown,
upload the delta (added/updated) to an OpenAI Vector Store.

Runs once and exits. Intended to be triggered daily by the host platform's
scheduler (cron job / scheduled task) — see README for deploy notes.
"""

from __future__ import annotations

import logging
import os
import sys

from dotenv import load_dotenv
from openai import OpenAI

from src.markdown_converter import convert_article_to_markdown
from src.scraper import fetch_articles
from src.state import compute_diff, content_hash, load_state, save_state
from src.vector_store import get_or_create_vector_store, remove_article, upload_article

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("main")


def run() -> None:
    load_dotenv()

    base_url = os.environ.get("ZENDESK_BASE_URL", "https://support.optisigns.com")
    locale = os.environ.get("ZENDESK_LOCALE", "en-us")
    article_limit = int(os.environ.get("ARTICLE_LIMIT", "30"))
    articles_dir = os.environ.get("ARTICLES_DIR", "./articles")
    state_file = os.environ.get("STATE_FILE", "./data/state.json")
    vector_store_name = os.environ.get("VECTOR_STORE_NAME", "OptiBot Knowledge Base")

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is required")

    client = OpenAI(api_key=api_key)

    logger.info("Scraping up to %d articles from %s", article_limit, base_url)
    raw_articles = fetch_articles(base_url, locale, article_limit)

    os.makedirs(articles_dir, exist_ok=True)
    slug_to_markdown: dict[str, str] = {}
    slug_to_article = {}
    for article in raw_articles:
        slug, markdown = convert_article_to_markdown(article)
        slug_to_markdown[slug] = markdown
        slug_to_article[slug] = article
        with open(os.path.join(articles_dir, f"{slug}.md"), "w", encoding="utf-8") as f:
            f.write(markdown)

    state = load_state(state_file)
    diff = compute_diff(slug_to_markdown, state)

    vector_store_id = get_or_create_vector_store(client, state.get("vector_store_id"), vector_store_name)
    state["vector_store_id"] = vector_store_id
    state.setdefault("articles", {})

    total_chunks = 0

    for slug in diff.added + diff.updated:
        if slug in diff.updated:
            old_file_id = state["articles"][slug]["file_id"]
            remove_article(client, vector_store_id, old_file_id)

        markdown = slug_to_markdown[slug]
        file_id, chunk_count = upload_article(client, vector_store_id, slug, markdown)
        total_chunks += max(chunk_count, 0)

        state["articles"][slug] = {
            "hash": content_hash(markdown),
            "updated_at": slug_to_article[slug].updated_at,
            "file_id": file_id,
        }

    for slug in diff.removed:
        old_file_id = state["articles"][slug]["file_id"]
        remove_article(client, vector_store_id, old_file_id)
        del state["articles"][slug]

    save_state(state_file, state)

    logger.info(
        "Run complete. vector_store=%s added=%d updated=%d skipped=%d removed=%d chunks_embedded=%d",
        vector_store_id,
        len(diff.added),
        len(diff.updated),
        len(diff.skipped),
        len(diff.removed),
        total_chunks,
    )


if __name__ == "__main__":
    try:
        run()
    except Exception:
        logger.exception("Job failed")
        sys.exit(1)
    sys.exit(0)
