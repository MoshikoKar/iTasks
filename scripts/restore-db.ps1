# Restore iTasks PostgreSQL database from a plain SQL dump produced by backup-db.ps1.
# Requires: PostgreSQL client tools (psql) on PATH, DATABASE_URL set.
# WARNING: This overwrites the database pointed to by DATABASE_URL.

param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath
)

$ErrorActionPreference = "Stop"

$dbUrl = $env:DATABASE_URL
if (-not $dbUrl) {
    Write-Error "DATABASE_URL is not set. Set it before running this script."
    exit 1
}

if (-not (Test-Path $BackupPath)) {
    Write-Error "Backup file not found: $BackupPath"
    exit 1
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Error "psql not found. Install PostgreSQL client tools and ensure they are on PATH."
    exit 1
}

Write-Host "Restoring from $BackupPath into database from DATABASE_URL."
Write-Host "This will overwrite existing data. Press Ctrl+C within 5 seconds to abort."
Start-Sleep -Seconds 5

& psql $dbUrl -f $BackupPath
if ($LASTEXITCODE -ne 0) {
    Write-Error "psql restore failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Restore completed. Run migrations if the backup schema is older than the app (e.g. npm run db:migrate)."
exit 0
