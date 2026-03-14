# Deployment and Lockfile Strategy

## Overview

This project is designed to be deployed to a Node.js environment (self-hosted or containerized) using `next start` for production.

Production builds and CI runs must always install dependencies from the committed `package-lock.json` to ensure deterministic installs.

## CI Pipeline (GitHub Actions)

A GitHub Actions workflow at `.github/workflows/ci.yml` implements the baseline CI pipeline:

- Checks out the repository.
- Sets up Node.js with npm caching.
- Runs `npm ci` to install dependencies strictly from `package-lock.json`.
- Runs `npm audit --audit-level=high`; the build fails if Critical or High CVEs are reported.
- Runs `npm run lint`.
- Runs `npm run build`.

Because `npm ci` is used, the workflow will fail if `package-lock.json` is out of sync with `package.json`, providing automatic lockfile validation.

## Deploy Job (reproducible build)

The same workflow defines a **deploy** job that runs on:

- Push to `main` or `master`
- Push of a tag (e.g. `v1.0.0`)

The deploy job runs after the build-and-validate job succeeds. It performs a fresh `npm ci` and `npm run build` with `NODE_ENV=production`. Wire your actual deployment step (e.g. Docker push, SSH, or host deploy) in `.github/workflows/ci.yml` by replacing or extending the "Deployment placeholder" step. Use the same Node version and build commands locally or in your deploy environment for reproducibility.

## Deployment Process

1. **Pre-deploy**
   - Ensure all changes are merged to `main` (or your release branch) and CI is green.
   - Run database migrations if schema changed: `npm run db:migrate` (or your migration process) against the target database **before** deploying the new app version.
   - Confirm environment variables and secrets (e.g. `DATABASE_URL`, `ENCRYPTION_KEY`, mailer) are set in the target environment.

2. **Deploy**
   - On the target server or container: pull the commit or tag you are releasing, then run:
     ```powershell
     npm ci
     npm run build
     npm start
     ```
   - If using containers, build the image from the same commit/tag and use the same build steps as in CI.

3. **Post-deploy**
   - Hit the health endpoint (e.g. `/api/health`) to confirm the app and database are ready.
   - Spot-check critical flows (login, task list, create task).

## Rollback

1. **Application**
   - Redeploy the previous known-good commit or tag using the same steps (e.g. checkout that commit, `npm ci`, `npm run build`, `npm start`, or run the previous container image).
   - If using a process manager or reverse proxy, switch traffic back to the previous instance or version.

2. **Database**
   - If a migration was applied during the failed deploy, run the down migration or restore from backup before or after app rollback, depending on whether the new code depends on the new schema. Document migration rollback steps in your migration files or ops runbook.
   - Backup and restore procedures, RPO/RTO, and automation are documented in [Backup and Restore](../backup-restore/BACKUP_RESTORE.md). Use `scripts/backup-db.ps1` and `scripts/restore-db.ps1` for operational backups.
- Background jobs (recurring tasks, due-date notifications, session cleanup) run in-process by default; for a dedicated worker or scaling options see [Background Jobs](../infra/BACKGROUND_JOBS.md).

3. **Verification**
   - Confirm health endpoint and critical flows on the rolled-back version.
   - Investigate the failure offline; fix and re-deploy via the normal process.

## Next.js configuration (production)

Production builds use an explicit production config branch in `next.config.js`:

- **Output:** `output: 'standalone'` so `.next/standalone` is generated for containerized or minimal deployments. You can still run `next start` from the project root without using the standalone folder.
- **Compiler:** `removeConsole: true` so console output is stripped in production.
- **React:** `reactStrictMode: true` in production (disabled in dev for faster compilation).
- No dev-only options (e.g. `allowedDevOrigins`, `devIndicators`, `webpackBuildWorker`) are applied in production.

For environment parity, run `npm run build` and `npm start` locally before deploying to confirm key flows work.

## Recommended Production Build Commands

For production builds (locally, in containers, or other CI systems), use:

```powershell
npm ci
npm run build
npm start
```

- `npm ci` installs dependencies exactly as specified in `package-lock.json`.
- `npm run build` generates the optimized Next.js production build.
- `npm start` launches the production server.

`package-lock.json` is the authoritative source of dependency versions for all production and CI environments.

## SLA page and bounded queries

The SLA & Exceptions page (`/sla`) uses bounded queries: at most 50 overdue and 50 approaching tasks per page, with deterministic ordering and optional filters (assignee, branch). Total counts are from separate `count()` queries so summary figures remain accurate. When you have large numbers of overdue or approaching tasks, run load tests or simulate high volume (e.g. k6 or Locust against `/sla` with many matching tasks) to confirm server render time and memory usage stay acceptable. Use filters and pagination to drill down without loading all rows at once.

