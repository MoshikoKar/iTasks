# Background Jobs and Cron Execution Model

## Overview

iTasks runs periodic background work (recurring task generation, due-date notifications, and session cleanup) using an **in-process** scheduler backed by `node-cron`. When multiple app instances run (e.g. horizontal scaling), **only one logical worker** executes these tasks per run via a **PostgreSQL advisory lock**, so jobs are not duplicated across instances.

## Execution Strategy

- **Strategy:** Single in-process scheduler per process, with **DB-based advisory locking** so that across multiple processes (e.g. several `next start` instances or a mix of app + dedicated worker), only one process runs the job each minute.
- **Schedule:** One cron expression runs every minute (`* * * * *`, timezone `Asia/Jerusalem`). In each run the scheduler:
  1. Tries to acquire a PostgreSQL advisory lock.
  2. If the lock is acquired: runs recurring task generation, due-date notifications, and expired session cleanup, then releases the lock.
  3. If the lock is not acquired: skips the run (another instance is already executing).
- **Session cleanup:** Expired sessions are deleted from the database by `cleanupExpiredSessions()` in the same cron run (see `lib/auth.ts`).

## Where Background Work Runs

1. **Default (app-embedded):** When you run the Next.js app (`npm run dev` or `npm start`), the scheduler is started automatically in that process via `instrumentation.ts`. Every instance will try to run the cron; the advisory lock ensures only one instance actually executes the tasks each minute.
2. **Dedicated worker (optional):** You can run **only** the cron worker in a separate process (no web server) using:
   ```powershell
   npm run worker:cron
   ```
   This runs `scripts/run-cron-worker.ts`, which initializes the same scheduler and keeps the process alive. Use this when you want a single dedicated process for cron (e.g. one worker container/pod and multiple app replicas without cron).
3. **Disabling cron in the app:** When using a dedicated worker, you can disable the in-app scheduler so web instances do not run cron at all. Set:
   ```env
   DISABLE_CRON_IN_APP=true
   ```
   With this set, `instrumentation.ts` does not start the scheduler in that process. Run one process with cron enabled (either the dedicated worker or one app instance) and set `DISABLE_CRON_IN_APP=true` on all other app instances to avoid redundant lock contention.

## Entrypoints

| Entrypoint | Purpose |
|------------|---------|
| `npm run dev` / `npm start` | Starts Next.js; scheduler runs in-process unless `DISABLE_CRON_IN_APP=true`. |
| `npm run worker:cron` | Starts only the cron worker (no web server). Use when running a dedicated worker process. |

When running `worker:cron`, ensure the same environment (e.g. `DATABASE_URL`, `ENCRYPTION_KEY`, and any mailer/notification config) is available, e.g. by sourcing your `.env` or using your process manager’s env configuration.

## Advisory Lock

- **Implementation:** `lib/cron.ts` uses `pg_try_advisory_lock(key)` before running jobs and `pg_advisory_unlock(key)` in a `finally` block.
- **Key:** A single numeric key is used for all cron work so that only one run executes at a time across the deployment.
- **Safety:** Lock is always released in `finally`, and execution time is bounded so the lock is not held indefinitely.

## Scaling and Deployment

- **Single instance:** Run the app as usual; cron runs in the same process.
- **Multiple instances (e.g. several `next start`):** Leave cron enabled in all; the lock guarantees one runner per minute.
- **Dedicated worker + multiple app instances:** Run one process with `npm run worker:cron` (or one app instance without `DISABLE_CRON_IN_APP`). Set `DISABLE_CRON_IN_APP=true` on all other app instances to avoid unnecessary lock attempts and log noise.

## Related

- Scheduler implementation: `lib/cron.ts`
- Recurring task generation: `app/actions/recurring.ts` (`generateRecurringTasks`)
- Due-date notifications: `lib/notification-scheduler.ts` (`sendDueDateNotifications`)
- Session cleanup: `lib/auth.ts` (`cleanupExpiredSessions`)
- Metrics: Cron timing and errors are reported in `lib/cron.ts` and exposed via `lib/metrics.ts` (see `docs/monitoring/MONITORING.md`).
