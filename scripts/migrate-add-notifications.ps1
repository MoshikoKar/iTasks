# Run notification migration
Write-Host "Running notification migration..." -ForegroundColor Green

# Change to project root directory (parent of scripts folder)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# Load environment variables
if (Test-Path ".\.env") {
    $envContent = Get-Content ".\.env" -Raw
    $envLines = $envContent -split "`n"
    foreach ($line in $envLines) {
        if ($line -match "^([^#][^=]+)=(.*)$") {
            $key = $1.Trim()
            $value = $2.Trim()
            [Environment]::SetEnvironmentVariable($key, $value)
        }
    }
}

# Run the migration
npx tsx scripts/migrate-add-notifications.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Migration failed!" -ForegroundColor Red
    exit 1
}