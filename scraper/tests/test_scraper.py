from unittest.mock import MagicMock, patch

from src.scraper import fetch_articles


def _response(json_data, status_code=200, headers=None):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data
    resp.headers = headers or {}
    if status_code >= 400 and status_code != 429:
        resp.raise_for_status.side_effect = Exception(f"http {status_code}")
    return resp


def _article(id_, draft=False):
    return {
        "id": id_,
        "title": f"Article {id_}",
        "html_url": f"https://support.example.com/hc/en-us/articles/{id_}",
        "body": f"<p>body {id_}</p>",
        "updated_at": "2026-01-01T00:00:00Z",
        "draft": draft,
    }


def test_fetch_articles_paginates_and_skips_drafts():
    page1 = _response(
        {
            "meta": {"has_more": True},
            "links": {"next": "https://support.example.com/page2"},
            "articles": [_article(1), _article(2, draft=True)],
        }
    )
    page2 = _response(
        {
            "meta": {"has_more": False},
            "links": {},
            "articles": [_article(3)],
        }
    )

    with patch("requests.Session.get", side_effect=[page1, page2]):
        articles = fetch_articles("https://support.example.com", "en-us", limit=10)

    assert [a.id for a in articles] == [1, 3]


def test_fetch_articles_stops_at_limit_without_requesting_next_page():
    page1 = _response(
        {
            "meta": {"has_more": True},
            "links": {"next": "https://support.example.com/page2"},
            "articles": [_article(i) for i in range(5)],
        }
    )

    with patch("requests.Session.get", return_value=page1) as mock_get:
        articles = fetch_articles("https://support.example.com", "en-us", limit=3)

    assert len(articles) == 3
    assert mock_get.call_count == 1


def test_fetch_articles_retries_after_rate_limit():
    rate_limited = _response({}, status_code=429, headers={"Retry-After": "0"})
    ok = _response(
        {
            "meta": {"has_more": False},
            "links": {},
            "articles": [_article(1)],
        }
    )

    with patch("requests.Session.get", side_effect=[rate_limited, ok]):
        with patch("time.sleep"):
            articles = fetch_articles("https://support.example.com", "en-us", limit=10)

    assert len(articles) == 1
