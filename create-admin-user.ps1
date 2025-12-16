param(
  [Parameter(Mandatory = $true)][string]$Name,
  [Parameter(Mandatory = $true)][string]$Email,
  [SecureString]$Password
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $Password) {
  $Password = Read-Host -AsSecureString -Prompt "Enter admin password"
}

function Convert-SecureStringToPlainText {
  param([Parameter(Mandatory = $true)][SecureString]$Secure)

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    [Runtime.InteropServices.Marshal]::PtrToStringUni($bstr)
  } finally {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }
}

$plainPassword = Convert-SecureStringToPlainText -Secure $Password

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $projectRoot

if (-not (Test-Path -Path "$projectRoot\.env")) {
  throw ".env not found. Copy .env.example and configure it before creating the admin user."
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

$createAdminScript = @'
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error("Name, email, and password are required.");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.pbkdf2Sync(plain, salt, 310000, 32, "sha256").toString("hex");
  return `${salt}:${derived}`;
}

(async () => {
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log("User already exists. No changes made.");
      return;
    }

    const passwordHash = hashPassword(password);
    await prisma.user.create({
      data: {
        name,
        email,
        role: "Admin",
        passwordHash,
      },
    });
    console.log("Admin user created successfully.");
  } catch (error) {
    console.error("Failed to create admin user.");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
'@

$tempJs = Join-Path $projectRoot "create-admin-user-$(New-Guid).js"
Set-Content -Path $tempJs -Value $createAdminScript -Encoding UTF8
try {
  node "$tempJs" "$Name" "$Email" "$plainPassword"
} finally {
  if (Test-Path -Path $tempJs) {
    Remove-Item -Path $tempJs -Force -ErrorAction SilentlyContinue
  }
}
