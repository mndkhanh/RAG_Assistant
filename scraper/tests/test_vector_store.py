from unittest.mock import MagicMock

import pytest

from src.vector_store import (
    CHUNKING_STRATEGY,
    estimate_chunk_count,
    get_or_create_vector_store,
    remove_article,
    upload_article,
)


def test_get_or_create_vector_store_reuses_existing_id():
    client = MagicMock()

    vs_id = get_or_create_vector_store(client, "vs_existing", "name")

    assert vs_id == "vs_existing"
    client.vector_stores.retrieve.assert_called_once_with("vs_existing")
    client.vector_stores.create.assert_not_called()


def test_get_or_create_vector_store_creates_when_none_given():
    client = MagicMock()
    client.vector_stores.create.return_value = MagicMock(id="vs_new")

    vs_id = get_or_create_vector_store(client, None, "OptiBot Knowledge Base")

    assert vs_id == "vs_new"
    client.vector_stores.create.assert_called_once_with(name="OptiBot Knowledge Base")


def test_upload_article_uses_static_chunking_strategy_and_returns_chunk_count():
    client = MagicMock()
    client.files.create.return_value = MagicMock(id="file_1")
    client.vector_stores.files.create_and_poll.return_value = MagicMock(status="completed")

    file_id, chunk_count = upload_article(client, "vs_1", "slug", "# content")

    assert file_id == "file_1"
    assert chunk_count == estimate_chunk_count("# content")
    _, kwargs = client.vector_stores.files.create_and_poll.call_args
    assert kwargs["chunking_strategy"] == CHUNKING_STRATEGY
    assert kwargs["vector_store_id"] == "vs_1"
    assert kwargs["file_id"] == "file_1"


def test_estimate_chunk_count_short_text_is_one_chunk():
    assert estimate_chunk_count("just a short sentence") == 1


def test_estimate_chunk_count_scales_with_length():
    short = estimate_chunk_count("word " * 100)
    long = estimate_chunk_count("word " * 5000)
    assert long > short >= 1


def test_upload_article_raises_when_processing_fails():
    client = MagicMock()
    client.files.create.return_value = MagicMock(id="file_1")
    client.vector_stores.files.create_and_poll.return_value = MagicMock(status="failed")

    with pytest.raises(RuntimeError):
        upload_article(client, "vs_1", "slug", "# content")


def test_remove_article_detaches_and_deletes_file():
    client = MagicMock()

    remove_article(client, "vs_1", "file_1")

    client.vector_stores.files.delete.assert_called_once_with(vector_store_id="vs_1", file_id="file_1")
    client.files.delete.assert_called_once_with("file_1")


def test_remove_article_swallows_errors_from_either_call():
    client = MagicMock()
    client.vector_stores.files.delete.side_effect = Exception("already gone")
    client.files.delete.side_effect = Exception("already gone")

    remove_article(client, "vs_1", "file_1")  # must not raise
