"""Converts a Zendesk article (HTML body) into clean Markdown.

The Article URL line is embedded in every file on purpose: it's what lets
the assistant satisfy the system prompt's "Cite up to 3 'Article URL:'
lines per reply" rule, since the model can only cite text it can actually
see in a retrieved chunk.
"""

from __future__ import annotations

import re

from markdownify import markdownify as html_to_markdown

from .scraper import Article


def slugify_from_url(html_url: str) -> str:
    """Derive a filesystem-safe slug from a Zendesk article URL.

    Zendesk URLs look like:
      https://support.optisigns.com/hc/en-us/articles/123456-Add-A-YouTube-Video
    """
    tail = html_url.rstrip("/").split("/")[-1]
    match = re.match(r"^\d+-(.+)$", tail)
    slug = match.group(1) if match else tail
    slug = re.sub(r"[^a-zA-Z0-9\-]+", "-", slug).strip("-")
    return slug.lower()


def _clean(markdown: str) -> str:
    # markdownify leaves behind runs of blank lines and trailing spaces.
    markdown = re.sub(r"[ \t]+\n", "\n", markdown)
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)
    return markdown.strip() + "\n"


def convert_article_to_markdown(article: Article) -> tuple[str, str]:
    """Return (slug, markdown_content) for an Article."""
    slug = slugify_from_url(article.html_url)

    body_md = html_to_markdown(
        article.body_html,
        heading_style="ATX",
        bullets="-",
        strip=["script", "style", "nav", "header", "footer"],
    )
    body_md = _clean(body_md)

    header = f"# {article.title}\n\nArticle URL: {article.html_url}\n\n"
    return slug, header + body_md
