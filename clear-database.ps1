param(
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $Force) {
  Write-Host "WARNING: This will delete ALL data from the database!" -ForegroundColor Red
  Write-Host "This action cannot be undone." -ForegroundColor Red
  Write-Host ""
  $confirmation = Read-Host "Type 'DELETE ALL DATA' to confirm"
  
  if ($confirmation -ne "DELETE ALL DATA") {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit 0
  }
}

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $projectRoot

if (-not (Test-Path -Path "$projectRoot\.env")) {
  throw ".env not found. Copy .env.example and configure it before clearing the database."
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

$clearDbScript = @'
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
const prisma = new PrismaClient({ adapter });

(async () => {
  try {
    console.log("Starting database cleanup...");
    
    // Delete all records from all tables in the correct order to respect foreign key constraints
    
    await prisma.mention.deleteMany({});
    console.log("Deleted all mentions");
    
    await prisma.notification.deleteMany({});
    console.log("Deleted all notifications");
    
    await prisma.auditLog.deleteMany({});
    console.log("Deleted all audit logs");
    
    await prisma.systemLog.deleteMany({});
    console.log("Deleted all system logs");
    
    await prisma.attachment.deleteMany({});
    console.log("Deleted all attachments");
    
    await prisma.comment.deleteMany({});
    console.log("Deleted all comments");
    
    await prisma.taskContext.deleteMany({});
    console.log("Deleted all task contexts");
    
    await prisma.task.deleteMany({});
    console.log("Deleted all tasks");
    
    await prisma.recurringTaskConfig.deleteMany({});
    console.log("Deleted all recurring task configs");
    
    await prisma.session.deleteMany({});
    console.log("Deleted all sessions");
    
    await prisma.user.deleteMany({});
    console.log("Deleted all users");
    
    await prisma.team.deleteMany({});
    console.log("Deleted all teams");
    
    // Reset SystemConfig to defaults (preserve the record but reset values)
    await prisma.systemConfig.upsert({
      where: { id: "system" },
      update: {
        smtpHost: "localhost",
        smtpPort: 25,
        smtpFrom: "no-reply@local",
        smtpSecure: false,
        smtpUser: null,
        smtpPassword: null,
        slaLowHours: 120,
        slaMediumHours: 48,
        slaHighHours: 24,
        slaCriticalHours: 4,
        ldapEnabled: false,
        ldapHost: null,
        ldapPort: 389,
        ldapBaseDn: null,
        ldapBindDn: null,
        ldapBindPassword: null,
        ldapUseTls: false,
        ldapUserSearchFilter: "(uid={{username}})",
        ldapUsernameAttribute: "uid",
        ldapEnforced: false,
        supportEmail: null,
        orgLogo: null,
        reportFooterText: null,
        timezone: "UTC",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24h",
        enableAttachments: true,
        maxAttachmentSizeMb: 10,
        enableComments: true,
        enableMentions: true,
        sessionTimeoutHours: 24,
        maxFailedLoginAttempts: 5,
        lockUserAfterFailedLogins: true,
        passwordPolicyLevel: "strong",
        auditRetentionDays: 365,
        updatedBy: null
      },
      create: {
        id: "system"
      }
    });
    console.log("Reset system config to defaults");
    
    console.log("Database cleared successfully.");
  } catch (error) {
    console.error("Failed to clear database.");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
'@

$tempJs = Join-Path $projectRoot "clear-database-$(New-Guid).js"
Set-Content -Path $tempJs -Value $clearDbScript -Encoding UTF8
try {
  node "$tempJs"
} finally {
  if (Test-Path -Path $tempJs) {
    Remove-Item -Path $tempJs -Force -ErrorAction SilentlyContinue
  }
}
