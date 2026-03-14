# Backup iTasks PostgreSQL database using pg_dump.
# Requires: PostgreSQL client tools (pg_dump) on PATH, DATABASE_URL set.
# Output: plain SQL dump to BACKUP_OUTPUT_DIR (default: ./backups) with timestamp.

$ErrorActionPreference = "Stop"

$dbUrl = $env:DATABASE_URL
if (-not $dbUrl) {
    Write-Error "DATABASE_URL is not set. Set it before running this script."
    exit 1
}

$outDir = $env:BACKUP_OUTPUT_DIR
if (-not $outDir) {
    $scriptRoot = Split-Path -Parent $PSScriptRoot
    $outDir = Join-Path $scriptRoot "backups"
}

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName = "itasks-backup-$timestamp.sql"
$outPath = Join-Path $outDir $fileName

Write-Host "Backing up database to $outPath"
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
    Write-Error "pg_dump not found. Install PostgreSQL client tools and ensure they are on PATH."
    exit 1
}

& pg_dump $dbUrl -Fp -f $outPath
if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Backup completed: $outPath"
exit 0
