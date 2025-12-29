#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

if [ ! -f ".env" ]; then
  echo "Error: .env not found. Copy .env.example and configure it before starting the app."
  exit 1
fi

# Function to load .env file
load_dotenv() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    while IFS='=' read -r key value; do
      # Skip comments and empty lines
      [[ $key =~ ^[[:space:]]*# ]] && continue
      [[ -z "$key" ]] && continue

      # Remove quotes from value if present
      value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")
      export "$key=$value"
    done < <(grep -v '^#' "$env_file" | grep -v '^$')
  fi
}

load_dotenv ".env"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install --no-audit --no-fund
fi

# Generate Prisma client if it doesn't exist
if [ ! -f "node_modules/.prisma/client/index.js" ]; then
  echo "Generating Prisma client..."
  npm run db:generate
fi

export NODE_ENV="development"
export PORT="${PORT:-3000}"

# Function to kill process listening on a port
kill_port_listener() {
  local port="$1"
  local pids

  # Find processes listening on the port
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -ti:"$port" 2>/dev/null)
  elif command -v netstat >/dev/null 2>&1; then
    pids=$(netstat -tulpn 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | sort | uniq)
  else
    echo "Warning: Neither lsof nor netstat found. Cannot check for existing processes on port $port."
    return
  fi

  if [ -n "$pids" ]; then
    echo "Stopping processes using port $port: $pids"
    for pid in $pids; do
      if kill -9 "$pid" 2>/dev/null; then
        echo "Stopped process $pid using port $port."
      else
        echo "Warning: Failed to stop process $pid on port $port."
      fi
    done
    sleep 1
  fi
}

kill_port_listener "$PORT"

echo "Checking database migration status..."
npx prisma migrate status --schema "./prisma/schema.prisma"

echo "Applying database migrations..."
npx prisma db push --schema "./prisma/schema.prisma"

echo "Generating Prisma client..."
npx prisma generate --schema "./prisma/schema.prisma"

# Database connection check
cat > .connection-check.js << 'EOF'
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
EOF

echo "Verifying database connection..."
node .connection-check.js
rm -f .connection-check.js

echo "Starting development server..."
npm run dev
