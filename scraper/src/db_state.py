"""Postgres-backed article lifecycle history: every ADDED / UPDATED /
REMOVED event, per slug, with a timestamp.

Unlike state.json (which only knows "now"), this is an append-only log —
nothing is ever overwritten — so it can answer "show me every time this
article changed" (see history.py). Used instead of state.json when
DATABASE_URL is set, since a Fargate task's filesystem doesn't persist
between daily runs the way a local Docker volume does.
"""

from __future__ import annotations

import logging

import psycopg

logger = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS document_lifecycle_history (
    id BIGSERIAL PRIMARY KEY,
    slug TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('ADDED', 'UPDATED', 'REMOVED')),
    content_hash TEXT,
    file_id TEXT,
    vector_store_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lifecycle_slug_time
    ON document_lifecycle_history (slug, created_at DESC);

CREATE TABLE IF NOT EXISTS job_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_runs (
    id BIGSERIAL PRIMARY KEY,
    task_arn TEXT NOT NULL UNIQUE,
    cluster TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'SUCCEEDED', 'FAILED')),
    trigger TEXT NOT NULL DEFAULT 'schedule' CHECK (trigger IN ('schedule', 'manual')),
    triggered_by_user TEXT,
    log_group TEXT NOT NULL,
    log_stream TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_job_runs_started_at ON job_runs (started_at DESC);
"""


def connect(database_url: str) -> psycopg.Connection:
    conn = psycopg.connect(database_url, autocommit=True)
    conn.execute(SCHEMA)
    return conn


def load_current_articles(conn: psycopg.Connection) -> dict[str, dict]:
    """One row per slug: its most recent hash/file_id, excluding removed articles.

    DISTINCT ON picks the latest row per slug in a single query instead of
    looping a per-slug lookup.
    """
    rows = conn.execute(
        """
        SELECT DISTINCT ON (slug) slug, action, content_hash, file_id
        FROM document_lifecycle_history
        ORDER BY slug, created_at DESC
        """
    ).fetchall()

    return {
        slug: {"hash": content_hash, "file_id": file_id}
        for slug, action, content_hash, file_id in rows
        if action != "REMOVED"
    }


def record_event(
    conn: psycopg.Connection,
    slug: str,
    action: str,
    content_hash: str | None,
    file_id: str | None,
    vector_store_id: str | None,
) -> None:
    conn.execute(
        """
        INSERT INTO document_lifecycle_history (slug, action, content_hash, file_id, vector_store_id)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (slug, action, content_hash, file_id, vector_store_id),
    )
    logger.info("Recorded %s for %s", action, slug)


def get_config(conn: psycopg.Connection, key: str) -> str | None:
    row = conn.execute("SELECT value FROM job_config WHERE key = %s", (key,)).fetchone()
    return row[0] if row else None


def set_config(conn: psycopg.Connection, key: str, value: str) -> None:
    conn.execute(
        """
        INSERT INTO job_config (key, value) VALUES (%s, %s)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        """,
        (key, value),
    )


def start_job_run(
    conn: psycopg.Connection,
    task_arn: str,
    cluster: str,
    log_group: str,
    log_stream: str,
    trigger: str,
    triggered_by_user: str | None,
) -> None:
    conn.execute(
        """
        INSERT INTO job_runs (task_arn, cluster, log_group, log_stream, trigger, triggered_by_user)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (task_arn) DO NOTHING
        """,
        (task_arn, cluster, log_group, log_stream, trigger, triggered_by_user),
    )


def finish_job_run(
    conn: psycopg.Connection,
    task_arn: str,
    status: str,
    error_message: str | None = None,
) -> None:
    conn.execute(
        """
        UPDATE job_runs
        SET status = %s, finished_at = now(), error_message = %s
        WHERE task_arn = %s
        """,
        (status, error_message, task_arn),
    )


def get_history(conn: psycopg.Connection, slug: str) -> list[dict]:
    rows = conn.execute(
        """
        SELECT action, content_hash, created_at
        FROM document_lifecycle_history
        WHERE slug = %s
        ORDER BY created_at ASC
        """,
        (slug,),
    ).fetchall()
    return [{"action": action, "content_hash": h, "created_at": t.isoformat()} for action, h, t in rows]
