Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $projectRoot

if (-not (Test-Path -Path "$projectRoot\.env")) {
  throw ".env not found. Copy .env.example and configure it before starting the app."
}

function Import-DotEnv {
  param([Parameter(Mandatory = $true)][string]$Path)

  Get-Content -Path $Path | ForEach-Object {
    if ($_ -match '^\s*#') { return }
    if ($_ -match '^\s*$') { return }
    if ($_ -match '^\s*([^=]+)=(.*)$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim().Trim('"')
      if (-not [string]::IsNullOrWhiteSpace($name)) {
        [Environment]::SetEnvironmentVariable($name, $value)
      }
    }
  }
}

Import-DotEnv -Path "$projectRoot\.env"

if (-not (Test-Path -Path "$projectRoot\node_modules")) {
  npm install --no-audit --no-fund
}

if (-not (Test-Path -Path "$projectRoot\node_modules\.prisma\client\index.js")) {
  npm run db:generate
}

$env:NODE_ENV = "production"
if (-not $env:PORT) {
  $env:PORT = "3000"
}

npx prisma migrate status --schema ".\prisma\schema.prisma"
npx prisma migrate deploy --schema ".\prisma\schema.prisma"
npx prisma generate --schema ".\prisma\schema.prisma"

$connectionCheck = @'
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

(async () => {
  try {
    await db.$queryRaw`SELECT 1`;
    console.log("Database connection verified.");
  } catch (error) {
    console.error("Database connection failed.");
    console.error(error);
    process.exit(1);
  } finally {
    await db.$disconnect();
    await pool.end();
  }
})();
'@

$tempFile = Join-Path -Path $projectRoot -ChildPath ".connection-check.js"
[System.IO.File]::WriteAllText($tempFile, $connectionCheck, [System.Text.Encoding]::UTF8)
try {
  node $tempFile
} finally {
  Remove-Item -Path $tempFile -ErrorAction SilentlyContinue
}

npm run build
npm run start
