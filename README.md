# Support-Docs RAG Assistant

A support-chatbot clone backed by a real Zendesk Help Center knowledge base.
The job scrapes published articles, converts them to clean Markdown,
diffs them against the previous run, and uploads only the delta to an
OpenAI Vector Store used by an Assistant configured with `file_search`.

## Project layout

- `scraper/` — the Python ingestion job (scrape → convert → diff → upload).
  Everything below in "How it works" lives here.
- `infra/` — Terraform for the AWS deployment (ECS Fargate, EventBridge
  Scheduler, ECR, IAM, Secrets Manager, CloudWatch).
- `supabase/` — Postgres schema (`db/init.sql`) and the `run-job` Edge
  Function used by the manual trigger.
- `web/` — Vite + React frontend with the "Run job now" button.

## How it works

1. **Scrape** (`scraper/src/scraper.py`) — pulls up to `ARTICLE_LIMIT` published
   articles from the Zendesk Help Center API (`/api/v2/help_center/<locale>/articles.json`).
   Using the API instead of rendering pages means we get the article body
   only, with no nav/sidebar/ads to strip.
2. **Convert** (`scraper/src/markdown_converter.py`) — turns each article's HTML
   body into Markdown, preserving headings/links/code blocks, and prepends
   an `Article URL:` line (needed so the assistant can cite it per the
   system prompt).
3. **Diff** (`scraper/src/state.py` / `scraper/src/db_state.py`) — hashes each article's
   Markdown and compares it to what the last run recorded, to classify
   each article as added / updated / skipped / removed. Locally this is
   `data/state.json`; in production it's Postgres (see below).
4. **Upload delta** (`scraper/src/vector_store.py`) — only added/updated articles
   are uploaded; updated articles have their old file removed first.
   Removed articles (no longer published) are detached too.

Everything is wired together in `scraper/main.py`, which runs once and exits
(`0` on success, `1` on failure) — safe to run as a daily cron job.

## Chunking strategy

Static chunking, **800 tokens/chunk with 400 token overlap** (OpenAI's
default). Support articles here run from a few hundred to a few thousand
tokens, so most short articles end up as 1-2 chunks, and longer ones get
generous overlap so an answer near a chunk boundary still has context on
both sides. A heading-aware splitter (breaking at `##`/`###` first) would
give slightly cleaner citation boundaries, but wasn't worth the added
complexity for a 50-article KB — worth revisiting if citations start
pointing to bad splits.

OpenAI's Vector Store API doesn't expose the actual per-file chunk count
(the `files.content()` endpoint returns the whole file as one blob, not
the indexed chunks), so `scraper/src/vector_store.py` estimates it client-side
with `tiktoken` using the same 800/400 sliding-window math.

**Latest run:** 50/50 articles uploaded to vector store
`vs_6a470352643c819185bb9e830453af88`, ~144 estimated chunks total
(added=50, updated=0, skipped=0, removed=0).

## Setup

```bash
cd scraper
cp ../.env.sample ../.env
# fill in OPENAI_API_KEY at minimum
pip install -r requirements.txt
```

## Run locally

```bash
cd scraper
python main.py
```

Or via Docker (matches how it runs in production):

```bash
cd scraper
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

## Article lifecycle history (Postgres)

`data/state.json` only knows the *current* hash/file-id per article —
enough to diff today against yesterday, but not "when did this article
last change." For that, set `DATABASE_URL` (Postgres) and `main.py`
switches to `scraper/src/db_state.py`, which appends an immutable
`ADDED`/`UPDATED`/`REMOVED` row per event instead of overwriting a single
JSON file. This also solves the deploy problem: an ECS Fargate task gets
a fresh filesystem every run, so `state.json` alone wouldn't survive
between daily invocations without a mounted volume.

Query one article's full timeline:

```bash
cd scraper
python history.py how-to-use-youtube-with-optisigns
```

```
History for how-to-use-youtube-with-optisigns:
  2026-07-01T02:00:00+00:00  ADDED     hash=04ef014c2385
  2026-07-03T02:15:00+00:00  UPDATED   hash=a4e2d8f31b90
```

Chose Postgres over DynamoDB here mainly for cost (a small `db.t4g.micro`
RDS instance vs. a always-provisioned NoSQL table) and because the audit
trail is inherently relational (one slug → many timestamped events) — an
`ORDER BY created_at` query is simpler than modeling event ordering in a
key-value store. Local/grader runs are unaffected: leave `DATABASE_URL`
unset and `main.py` uses the plain JSON file, no DB required.

## Creating the Assistant

The vector store is populated entirely via API (`scraper/main.py`); the Assistant
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

Deployed as a Docker image on **AWS ECS Fargate**, provisioned entirely via
Terraform (`infra/`): ECR repo, ECS cluster + task definition, IAM roles,
Secrets Manager (for `OPENAI_API_KEY`/`DATABASE_URL`), and a CloudWatch log
group. Triggered two ways:

- **Daily schedule** — an **Amazon EventBridge Scheduler** cron
  (`infra/scheduler.tf`) calls `ecs:RunTask` once a day.
- **On demand** — the `web/` app's "Run job now" button calls a public
  **Supabase Edge Function** (`supabase/functions/run-job`), which also
  calls `ecs:RunTask` directly, tagging the run as `manual` (see below).

**Logs**: every run writes to CloudWatch log group `/ecs/rag-assistant-job`
(stream `job/rag-assistant-job/<task-id>`). Each run is also recorded as a
row in Postgres' `job_runs` table (`task_arn`, `trigger`, `status`,
`log_group`/`log_stream`, timestamps), written by `scraper/main.py` itself
via the ECS Task Metadata Endpoint — so a run's outcome and its exact
CloudWatch stream are always linkable from the DB, whether it was the
schedule or the manual button.

## Sample answer

Prompt: "How do I add a YouTube video?"

**[screenshot — fill in]**

## Testing

```bash
cd scraper
pip install -r requirements-dev.txt
pytest -v
```

Covers Markdown conversion (headings/links/code blocks/citation line),
Zendesk scraping (cursor pagination, draft filtering, rate-limit retry),
vector-store upload (chunking strategy, chunk-count estimation), and
Postgres lifecycle history (event recording, current-state diffing) —
all HTTP/DB calls are mocked, no network, API key, or live DB required.

## Environment variables

See `.env.sample` for the full list (Zendesk source, article limit,
vector store ID/name, file paths, optional `DATABASE_URL`).
