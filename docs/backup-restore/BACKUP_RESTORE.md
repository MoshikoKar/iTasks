# PostgreSQL Backup and Restore

## Overview

This document describes the backup and restore strategy for the iTasks PostgreSQL database. Backups are required for disaster recovery, point-in-time recovery after failures, and safe rollbacks.

## RPO and RTO

| Metric | Target | Notes |
|--------|--------|--------|
| **RPO (Recovery Point Objective)** | 24 hours | Maximum acceptable data loss; align backup frequency so the last backup is no older than 24 hours under normal operation. |
| **RTO (Recovery Time Objective)** | 4 hours | Target time to restore service after a full database loss; includes restore, verification, and app cutover. |

Adjust these targets to match your SLA. Increase backup frequency (e.g. daily or twice daily) if a lower RPO is required.

---

## Backup Strategy

### Frequency

- **Production:** At least once per 24 hours (daily). Prefer a fixed time (e.g. 02:00 UTC) to avoid peak load.
- **Staging / non-production:** At least weekly, or before major changes.

### Retention

- **Production:** Retain at least 7 daily backups; keep one backup per week for 4 weeks if storage allows.
- **Staging:** Retain 2–3 backups.

### Storage Location

- Store backups outside the application server (different disk or object storage).
- Use a path or bucket dedicated to iTasks backups (e.g. `itasks-backups/` or `BACKUP_OUTPUT_DIR` as used by the script).
- Ensure access is restricted (e.g. IAM or filesystem permissions) and that backups are not publicly readable.

### What Is Backed Up

- Full database dump (schema + data) via `pg_dump` in plain SQL format.
- One file per run; filename includes timestamp for ordering and retention pruning.

---

## Restore Strategy

### When to Restore

- After data corruption or accidental deletion.
- As part of rollback when a deployment or migration fails (see [DEPLOYMENT.md](../deployment/DEPLOYMENT.md)).
- To clone production into staging or a test environment (use a copy of a backup, not the live backup).

### Restore Procedure

1. **Stop or isolate the application** so no writes hit the database during restore (or restore into a new database and switch connection).
2. **Restore from a known-good backup file** using the provided script or manual steps below.
3. **Run migrations** if the backup is from an older schema and the app expects a newer one (`npm run db:migrate` or apply migrations manually).
4. **Verify** with a quick health check and spot-checks (login, task list).
5. **Resume traffic** to the application.

### Testing Restores

- **Periodically test restores** (e.g. quarterly) into a non-production environment to validate backup integrity and restore steps.
- Document the date and result of the last restore test in your runbook.

---

## Scripts

### Prerequisites

- PostgreSQL client tools installed (`pg_dump`, `psql`) and on `PATH`.
- `DATABASE_URL` set in the environment (e.g. `postgresql://user:password@host:port/database?schema=public`).

### Backup Script

**Location:** `scripts/backup-db.ps1`

Creates a plain SQL dump of the database and writes it to a timestamped file.

```powershell
# Optional: set output directory (default: ./backups)
$env:BACKUP_OUTPUT_DIR = "C:\path\to\backups"
.\scripts\backup-db.ps1
```

Output file pattern: `itasks-backup-YYYYMMDD-HHmmss.sql`.

### Restore Script

**Location:** `scripts/restore-db.ps1`

Restores a database from a plain SQL dump produced by the backup script. **This overwrites the target database** pointed to by `DATABASE_URL`.

```powershell
# Restore from a specific backup file
.\scripts\restore-db.ps1 -BackupPath "C:\path\to\itasks-backup-20260314-020000.sql"
```

For production restores, prefer restoring into a new database and then switching the app’s `DATABASE_URL` to avoid accidental overwrite of the live DB.

---

## Automation

### Windows (Task Scheduler)

1. Create a scheduled task that runs daily at the desired time.
2. Action: run `powershell.exe` with arguments such as:
   - `-NoProfile -ExecutionPolicy Bypass -File "C:\path\to\iTasks\scripts\backup-db.ps1"`
3. Set the task’s working directory to the project root (or set `BACKUP_OUTPUT_DIR` in the task’s environment).
4. Ensure the task runs under an account that has `DATABASE_URL` set (e.g. system env or task-specific env).

### Linux / Cron

```bash
# Example: daily at 02:00
0 2 * * * cd /path/to/iTasks && BACKUP_OUTPUT_DIR=/var/backups/itasks ./scripts/backup-db.ps1
```

(Use `pwsh` if the script is run with PowerShell Core.)

### Retention Pruning

Remove backups older than your retention policy using a separate scheduled job (e.g. delete files in `BACKUP_OUTPUT_DIR` older than 7 days for daily backups). The backup script does not delete old files.

---

## Manual Commands (reference)

If you cannot use the scripts (e.g. different OS or environment):

**Backup:**

```powershell
pg_dump $env:DATABASE_URL -Fp -f "itasks-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
```

**Restore (destructive):**

```powershell
psql $env:DATABASE_URL -f "path\to\itasks-backup-YYYYMMDD-HHmmss.sql"
```

Ensure the target database exists and is empty or that you are prepared to drop and recreate it before restore when using plain SQL dumps.
