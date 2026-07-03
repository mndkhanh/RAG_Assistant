from src.state import compute_diff, content_hash, load_state, save_state


def test_content_hash_is_deterministic_and_sensitive_to_content():
    assert content_hash("abc") == content_hash("abc")
    assert content_hash("abc") != content_hash("abd")


def test_load_state_missing_file_returns_default(tmp_path):
    path = tmp_path / "state.json"
    assert load_state(str(path)) == {"vector_store_id": None, "articles": {}}


def test_save_and_load_state_roundtrip(tmp_path):
    path = tmp_path / "nested" / "state.json"
    state = {"vector_store_id": "vs_1", "articles": {"a": {"hash": "x"}}}
    save_state(str(path), state)
    assert load_state(str(path)) == state


def test_compute_diff_classifies_added_updated_skipped_removed():
    state = {
        "articles": {
            "unchanged": {"hash": content_hash("same content")},
            "changed": {"hash": content_hash("old content")},
            "gone": {"hash": content_hash("gone content")},
        }
    }
    current = {
        "unchanged": "same content",
        "changed": "new content",
        "new-article": "brand new",
    }

    diff = compute_diff(current, state)

    assert diff.added == ["new-article"]
    assert diff.updated == ["changed"]
    assert diff.skipped == ["unchanged"]
    assert diff.removed == ["gone"]


def test_compute_diff_against_empty_state_marks_everything_added():
    state = {"articles": {}}
    current = {"a": "content a", "b": "content b"}

    diff = compute_diff(current, state)

    assert sorted(diff.added) == ["a", "b"]
    assert diff.updated == []
    assert diff.skipped == []
    assert diff.removed == []
