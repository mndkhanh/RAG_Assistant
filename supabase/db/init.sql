-- Schema for the OptiBot ingestion job's Postgres backend.
-- Mirrors src/db_state.py::SCHEMA (kept in sync manually — db_state.py
-- also runs this as CREATE TABLE IF NOT EXISTS on every connect, so this
-- file exists for review/history, not because the app depends on it).

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

-- One row per ECS task execution, linking back to its exact CloudWatch
-- log stream (log_group + log_stream) so a run's logs are always findable
-- from its Supabase row, regardless of whether it was the daily schedule
-- or a manual trigger via the web app's "Run job now" button.
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

-- All three tables live in `public`, which Supabase's Data API exposes by
-- default. Only the daily job (connecting directly via DATABASE_URL, not
-- through the Data API) should ever touch these — enable RLS with no
-- policies so anon/authenticated PostgREST requests are denied outright.
-- (Currently disabled on document_lifecycle_history/job_config for local
-- testing — re-enable before this goes anywhere near production.)
ALTER TABLE document_lifecycle_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;
