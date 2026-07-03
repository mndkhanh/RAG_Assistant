from unittest.mock import MagicMock

from src.db_state import get_config, get_history, load_current_articles, record_event, set_config


def test_load_current_articles_excludes_removed():
    conn = MagicMock()
    conn.execute.return_value.fetchall.return_value = [
        ("added-slug", "ADDED", "hash1", "file_1"),
        ("removed-slug", "REMOVED", None, None),
    ]

    articles = load_current_articles(conn)

    assert articles == {"added-slug": {"hash": "hash1", "file_id": "file_1"}}


def test_record_event_inserts_with_expected_params():
    conn = MagicMock()

    record_event(conn, "my-slug", "UPDATED", "hash2", "file_2", "vs_1")

    args, _ = conn.execute.call_args
    assert "INSERT INTO document_lifecycle_history" in args[0]
    assert args[1] == ("my-slug", "UPDATED", "hash2", "file_2", "vs_1")


def test_get_config_returns_none_when_missing():
    conn = MagicMock()
    conn.execute.return_value.fetchone.return_value = None

    assert get_config(conn, "vector_store_id") is None


def test_get_config_returns_value_when_present():
    conn = MagicMock()
    conn.execute.return_value.fetchone.return_value = ("vs_123",)

    assert get_config(conn, "vector_store_id") == "vs_123"


def test_set_config_upserts():
    conn = MagicMock()

    set_config(conn, "vector_store_id", "vs_123")

    args, _ = conn.execute.call_args
    assert "ON CONFLICT" in args[0]
    assert args[1] == ("vector_store_id", "vs_123")


def test_get_history_returns_ordered_events():
    conn = MagicMock()
    created_at = MagicMock()
    created_at.isoformat.return_value = "2026-07-01T00:00:00+00:00"
    conn.execute.return_value.fetchall.return_value = [("ADDED", "hash1", created_at)]

    history = get_history(conn, "my-slug")

    assert history == [
        {"action": "ADDED", "content_hash": "hash1", "created_at": "2026-07-01T00:00:00+00:00"}
    ]
