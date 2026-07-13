# Scheduled Jobs (pg_cron)

Registry of all database-scheduled jobs. Wasali has **no external scheduler** (no
cron server, no scheduled edge functions) — recurring work runs inside Postgres
via the [`pg_cron`](https://github.com/citusdata/pg_cron) extension.

> **This file is the source of truth for what SHOULD exist.** The live jobs live
> in the `cron.job` table in the database. Keep this doc in sync whenever a job is
> added, changed, or removed. Every change to a job must go through a migration
> (never edit `cron.job` by hand in production) so the schedule is reproducible
> from `supabase/migrations/`.

## Active jobs

| Job name | Schedule (UTC) | Defined in | What it does |
|---|---|---|---|
| `expire-routes` | `15 2 * * *` (nightly 02:15) | [`supabase/migrations/048_route_expiry.sql`](../supabase/migrations/048_route_expiry.sql) | Flips `active`/`full` routes whose `departure_date < CURRENT_DATE` to `status = 'expired'`. Runs as the job owner (bypasses RLS); the `enforce_route_transition()` trigger permits `active/full → expired`. Expired routes drop out of sender search and show as "Expired" in the driver's history. See [ADR / route expiry in the blueprint](blueprint/trips-and-bookings.md). |

## Conventions

- **One migration per change.** To add/modify/remove a job, write a new migration
  that calls `cron.schedule(...)` / `cron.unschedule(...)`. Make it idempotent
  (unschedule-if-exists before re-scheduling), following the pattern in `048`.
- **Naming:** kebab-case, action-first (`expire-routes`, `purge-drafts`).
- **Timing:** prefer off-peak UTC (e.g. `02:15`) and avoid the exact top of the
  hour so jobs don't all fire simultaneously.
- **Update this table** in the same commit as the migration.

## Operating

Inspect the live jobs (Supabase SQL editor / any psql session):

```sql
-- What's scheduled
SELECT jobid, jobname, schedule, active, command
FROM cron.job
ORDER BY jobname;

-- Recent run history (success/failure, timing) for one job
SELECT status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'expire-routes')
ORDER BY start_time DESC
LIMIT 20;
```

Pause / resume / remove (do this via a migration for anything permanent):

```sql
-- Temporarily pause
UPDATE cron.job SET active = false WHERE jobname = 'expire-routes';

-- Remove entirely
SELECT cron.unschedule('expire-routes');
```

## Requirements

- `pg_cron` must be enabled on the Supabase project (`CREATE EXTENSION IF NOT
  EXISTS pg_cron;` — done in migration `048`). It is available on Supabase's
  managed Postgres.
- `pg_cron` executes in the database's own timezone context; schedules here are
  written and interpreted as **UTC**.
