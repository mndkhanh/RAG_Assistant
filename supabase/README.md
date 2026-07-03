# supabase/

Two pieces: the Postgres schema the scraper job's DB backend uses
(`db/init.sql`), and three Edge Functions the web dashboard calls
(`functions/`).

## Prerequisites

- Supabase CLI (`npm install -g supabase` or via a package manager)
- A Supabase project (Postgres + Edge Functions) — project ref from the
  dashboard URL or `supabase projects list`

## First-time setup

```bash
supabase login
cd supabase
supabase link --project-ref <your-project-ref>
```

### Database

`scraper/src/db_state.py` runs its schema as `CREATE TABLE IF NOT EXISTS`
on every connect, so the app itself doesn't depend on `init.sql` — but
apply it by hand on a fresh project so the tables (and RLS) exist before
the first run, and so `init.sql` stays the source of truth for anyone
reviewing the schema:

```bash
supabase db query --linked --file db/init.sql
```

(`supabase db push` isn't used here — there's no `migrations/` history,
just this one file, applied manually whenever it changes.)

`init.sql` enables Row Level Security with no policies on all three
tables — only the scraper job's direct `DATABASE_URL` connection should
ever read/write them, not the anon/publishable key used by the web app.

### Edge Functions

```bash
supabase functions deploy run-job
supabase functions deploy get-job-logs
supabase functions deploy chat
```

All three are public (`verify_jwt = false` in `config.toml`, `auth:
["publishable"]` in code) — no user login required, by design (see
`docs.md` known issues for the tradeoff).

Each needs secrets set via `supabase secrets set KEY=value` (not `.env` —
these run server-side):

| Function | Secrets | Where the value comes from |
|---|---|---|
| `run-job` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `ECS_CLUSTER`, `ECS_TASK_DEFINITION`, `ECS_SUBNETS` (comma-separated), `ECS_SECURITY_GROUP` (comma-separated), `ECS_CONTAINER_NAME` | `../infra` Terraform outputs (`ecs_cluster_name`, `task_definition_arn`, `subnet_ids`, `task_security_group_id`) |
| `get-job-logs` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | same AWS credentials as `run-job`; log group is hardcoded to `/ecs/rag-assistant-job` |
| `chat` | `OPENAI_API_KEY`, `OPENAI_ASSISTANT_ID` | OpenAI dashboard — same key the scraper uses, plus the Assistant ID created in the Playground (see root README) |

### Pointing web/ at this project

`web/.env` (gitignored) needs the project URL and its publishable
(anon) key, both from the Supabase dashboard → Project Settings → API:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key>
```

## Updating a function

Edit `functions/<name>/index.ts`, then redeploy just that one:

```bash
supabase functions deploy <name>
```
