"""OptiBot ingestion job: scrape support articles, convert to Markdown,
upload the delta (added/updated) to an OpenAI Vector Store.

Runs once and exits. Intended to be triggered daily by the host platform's
scheduler (cron job / scheduled task) — see README for deploy notes.
"""

from __future__ import annotations

import logging
import os
import sys

import psycopg
from dotenv import load_dotenv
from openai import OpenAI

from src import db_state, ecs_metadata
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

    # Postgres backend (DATABASE_URL set) is used in production deploys
    # where the filesystem doesn't persist between runs, and additionally
    # keeps a full ADDED/UPDATED/REMOVED history per article (see
    # history.py). Local/grader runs fall back to the plain state.json
    # file so `docker run -e OPENAI_API_KEY=... main.py` needs no DB.
    database_url = os.environ.get("DATABASE_URL")
    db_conn = db_state.connect(database_url) if database_url else None

    # Links this run to its own CloudWatch log stream, so `job_runs` rows
    # are browsable back to the exact logs for that run. task_arn is None
    # outside of ECS (e.g. local/grader runs), in which case run tracking
    # is simply skipped.
    task_arn = ecs_metadata.get_task_arn()
    if db_conn and task_arn:
        task_id = task_arn.rsplit("/", 1)[-1]
        db_state.start_job_run(
            db_conn,
            task_arn=task_arn,
            cluster=os.environ.get("ECS_CLUSTER_NAME", ""),
            log_group=os.environ.get("ECS_LOG_GROUP", ""),
            log_stream=f"{os.environ.get('ECS_LOG_STREAM_PREFIX', 'job')}/{os.environ.get('ECS_CONTAINER_NAME', '')}/{task_id}",
            trigger=os.environ.get("TRIGGERED_BY", "schedule"),
            triggered_by_user=os.environ.get("TRIGGERED_BY_USER"),
        )

    try:
        _run_job(client, db_conn, base_url, locale, article_limit, articles_dir, state_file, vector_store_name)
    except Exception as exc:
        if db_conn and task_arn:
            db_state.finish_job_run(db_conn, task_arn, "FAILED", str(exc))
        raise
    else:
        if db_conn and task_arn:
            db_state.finish_job_run(db_conn, task_arn, "SUCCEEDED")
    finally:
        if db_conn:
            db_conn.close()


def _run_job(
    client: OpenAI,
    db_conn: psycopg.Connection | None,
    base_url: str,
    locale: str,
    article_limit: int,
    articles_dir: str,
    state_file: str,
    vector_store_name: str,
) -> None:
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

    if db_conn:
        state = {
            "vector_store_id": db_state.get_config(db_conn, "vector_store_id"),
            "articles": db_state.load_current_articles(db_conn),
        }
    else:
        state = load_state(state_file)
    diff = compute_diff(slug_to_markdown, state)

    def persist(slug: str, action: str, markdown: str | None, file_id: str | None) -> None:
        """Record one article's outcome, then flush immediately — if a
        later file hangs or the job crashes, a retry shouldn't re-upload
        (and duplicate) articles that already succeeded."""
        if db_conn:
            db_state.record_event(
                db_conn, slug, action, content_hash(markdown) if markdown else None, file_id, vector_store_id
            )
        else:
            if action == "REMOVED":
                del state["articles"][slug]
            else:
                state["articles"][slug] = {
                    "hash": content_hash(markdown),
                    "updated_at": slug_to_article[slug].updated_at,
                    "file_id": file_id,
                }
            save_state(state_file, state)

    # Explicit env var wins (useful for stateless deploys without a
    # persistent volume); otherwise fall back to what the last run saved.
    existing_vector_store_id = os.environ.get("VECTOR_STORE_ID") or state.get("vector_store_id")
    vector_store_id = get_or_create_vector_store(client, existing_vector_store_id, vector_store_name)
    state["vector_store_id"] = vector_store_id
    state.setdefault("articles", {})
    if db_conn:
        db_state.set_config(db_conn, "vector_store_id", vector_store_id)
    else:
        save_state(state_file, state)

    total_chunks = 0

    for slug in diff.added + diff.updated:
        action = "UPDATED" if slug in diff.updated else "ADDED"
        if action == "UPDATED":
            old_file_id = state["articles"][slug]["file_id"]
            remove_article(client, vector_store_id, old_file_id)

        markdown = slug_to_markdown[slug]
        file_id, chunk_count = upload_article(client, vector_store_id, slug, markdown)
        total_chunks += max(chunk_count, 0)

        persist(slug, action, markdown, file_id)

    for slug in diff.removed:
        old_file_id = state["articles"][slug]["file_id"]
        remove_article(client, vector_store_id, old_file_id)
        persist(slug, "REMOVED", None, None)

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
