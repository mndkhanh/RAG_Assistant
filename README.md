# Support-Docs RAG Assistant

A support-chatbot clone backed by a real Zendesk Help Center knowledge base.
The job scrapes published articles, converts them to clean Markdown,
diffs them against the previous run, and uploads only the delta to an
OpenAI Vector Store used by an Assistant configured with `file_search`.

## How it works

1. **Scrape** (`src/scraper.py`) — pulls up to `ARTICLE_LIMIT` published
   articles from the Zendesk Help Center API (`/api/v2/help_center/<locale>/articles.json`).
   Using the API instead of rendering pages means we get the article body
   only, with no nav/sidebar/ads to strip.
2. **Convert** (`src/markdown_converter.py`) — turns each article's HTML
   body into Markdown, preserving headings/links/code blocks, and prepends
   an `Article URL:` line (needed so the assistant can cite it per the
   system prompt).
3. **Diff** (`src/state.py`) — hashes each article's Markdown and compares
   it to `data/state.json` from the last run to classify each article as
   added / updated / skipped / removed.
4. **Upload delta** (`src/vector_store.py`) — only added/updated articles
   are uploaded; updated articles have their old file removed first.
   Removed articles (no longer published) are detached too.

Everything is wired together in `main.py`, which runs once and exits
(`0` on success, `1` on failure) — safe to run as a daily cron job.

## Chunking strategy

Static chunking, **800 tokens/chunk with 400 token overlap** (OpenAI's
default). Support articles here run from a few hundred to a few thousand
tokens, so most short articles end up as 1-2 chunks, and longer ones get
generous overlap so an answer near a chunk boundary still has context on
both sides. A heading-aware splitter (breaking at `##`/`###` first) would
give slightly cleaner citation boundaries, but wasn't worth the added
complexity for a 30-article KB — worth revisiting if citations start
pointing to bad splits.

## Setup

```bash
cp .env.sample .env
# fill in OPENAI_API_KEY at minimum
pip install -r requirements.txt
```

## Run locally

```bash
python main.py
```

Or via Docker (matches how it runs in production):

```bash
docker build -t rag-assistant .
docker run --rm \
  -e OPENAI_API_KEY=sk-... \
  -e VECTOR_STORE_ID=vs_... \
  -v "$(pwd)/data:/app/data" \
  rag-assistant
```

Mounting `./data` keeps `state.json` around between runs so the delta
logic has something to diff against — without it, every run looks like a
first run (everything "added").

First run prints the created vector store ID; copy it into `VECTOR_STORE_ID`
in `.env` (or your host's env vars) so subsequent runs reuse the same store
instead of creating a new one each time.

## Creating the Assistant

The vector store is populated entirely via API (`main.py`); the Assistant
itself was created in the OpenAI Playground with `file_search` enabled and
attached to the vector store ID above, using this system prompt verbatim:

```
You are OptiBot, the customer-support bot for OptiSigns.com.
• Tone: helpful, factual, concise.
• Only answer using the uploaded docs.
• Max 5 bullet points; else link to the doc.
• Cite up to 3 "Article URL:" lines per reply.
```

## Daily job deployment

Deployed as a scheduled Docker job on **[host — fill in]**. Logs for each
run: **[link — fill in]**.

## Sample answer

Prompt: "How do I add a YouTube video?"

**[screenshot — fill in]**

## Testing

```bash
pip install -r requirements-dev.txt
pytest -v
```

Covers Markdown conversion (headings/links/code blocks/citation line) and
Zendesk scraping (cursor pagination, draft filtering, rate-limit retry) —
all HTTP calls are mocked, no network or API key required. More test
coverage lands alongside the vector-store/daily-job pieces.

## Environment variables

See `.env.sample` for the full list (Zendesk source, article limit,
vector store ID/name, file paths).
