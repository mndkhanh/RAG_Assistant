from src.markdown_converter import convert_article_to_markdown, slugify_from_url
from src.scraper import Article


def test_slugify_from_url_strips_numeric_id_prefix():
    url = "https://support.optisigns.com/hc/en-us/articles/360051014713-How-to-use-YouTube-with-OptiSigns"
    assert slugify_from_url(url) == "how-to-use-youtube-with-optisigns"


def test_slugify_from_url_without_numeric_prefix():
    url = "https://support.optisigns.com/hc/en-us/articles/Some-Slug"
    assert slugify_from_url(url) == "some-slug"


def _article(**overrides) -> Article:
    defaults = dict(
        id=1,
        title="Test Title",
        html_url="https://support.optisigns.com/hc/en-us/articles/1-Test-Title",
        body_html="<p>hello</p>",
        updated_at="2026-01-01T00:00:00Z",
    )
    defaults.update(overrides)
    return Article(**defaults)


def test_convert_article_includes_title_and_article_url_line():
    slug, md = convert_article_to_markdown(_article())
    assert slug == "test-title"
    assert md.startswith("# Test Title\n")
    assert "Article URL: https://support.optisigns.com/hc/en-us/articles/1-Test-Title" in md


def test_convert_article_preserves_headings():
    article = _article(body_html="<h2>Heading</h2><p>Some <strong>bold</strong> text.</p>")
    _, md = convert_article_to_markdown(article)
    assert "## Heading" in md


def test_convert_article_preserves_links():
    article = _article(
        body_html='<p>See <a href="/hc/en-us/articles/3-Other">other article</a>.</p>'
    )
    _, md = convert_article_to_markdown(article)
    assert "[other article](/hc/en-us/articles/3-Other)" in md


def test_convert_article_preserves_code_blocks():
    article = _article(body_html="<pre><code>const x = 1;</code></pre>")
    _, md = convert_article_to_markdown(article)
    assert "```" in md
    assert "const x = 1;" in md


def test_convert_article_collapses_excess_blank_lines():
    article = _article(body_html="<p>one</p>" + "\n" * 20 + "<p>two</p>")
    _, md = convert_article_to_markdown(article)
    assert "\n\n\n" not in md
